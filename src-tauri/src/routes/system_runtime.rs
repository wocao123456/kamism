use crate::middleware::auth::{auth_middleware, AppState};
use axum::{extract::State, middleware, response::IntoResponse, routing::{get, post}, Json, Router};
use serde_json::json;
use std::{fs, process::Command};

pub fn system_runtime_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/system/info", get(system_info))
        .route("/system/health-full", get(health_full))
        .route("/system/restart", post(restart_panel))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .with_state(state)
}

fn sh(cmd: &str) -> String {
    Command::new("sh").arg("-lc").arg(cmd).output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}
fn num(s: &str) -> f64 { s.trim().parse::<f64>().unwrap_or(0.0) }

async fn system_info() -> impl IntoResponse {
    let hostname = fs::read_to_string("/etc/hostname").unwrap_or_default().trim().to_string();
    let os = sh("uname -s");
    let arch = sh("uname -m");
    let num_cpu = sh("nproc 2>/dev/null || echo 0").parse::<u64>().unwrap_or(0);
    let cpu = {
        let parse_cpu = |s: &str| -> Option<(u64,u64)> {
            let line = s.lines().find(|l| l.starts_with("cpu "))?;
            let f: Vec<u64> = line.split_whitespace().skip(1).filter_map(|v| v.parse().ok()).collect();
            if f.len() < 5 { return None; }
            let idle = f[3] + f[4];
            let total: u64 = f.iter().sum();
            Some((idle, total))
        };
        let s1 = sh("cat /proc/stat");
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        let s2 = sh("cat /proc/stat");
        match (parse_cpu(&s1), parse_cpu(&s2)) {
            (Some((i1,t1)), Some((i2,t2))) if t2 > t1 => {
                let di = i2 - i1;
                let dt = t2 - t1;
                if dt > 0 { ((dt - di) as f64 * 100.0 / dt as f64 * 10.0).round() / 10.0 } else { 0.0 }
            }
            _ => 0.0
        }
    };
    let mem_total = sh(r#"grep MemTotal /proc/meminfo | awk '{printf "%.0f", $2*1024}'"#).parse::<u64>().unwrap_or(0);
    let mem_avail = sh(r#"grep MemAvailable /proc/meminfo | awk '{printf "%.0f", $2*1024}'"#).parse::<u64>().unwrap_or(0);
    let mem_used = mem_total.saturating_sub(mem_avail);
    let mem_usage = if mem_total > 0 { (mem_used as f64 * 100.0 / mem_total as f64 * 10.0).round()/10.0 } else { 0.0 };
    let disk_line = sh("df -B1 / 2>/dev/null | awk 'NR==2{print $2, $3}'");
    let parts: Vec<&str> = disk_line.split_whitespace().collect();
    let disk_total = parts.get(0).and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
    let disk_used = parts.get(1).and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
    let disk_usage = if disk_total > 0 { (disk_used as f64 * 100.0 / disk_total as f64 * 10.0).round()/10.0 } else { 0.0 };
    Json(json!({"data":{"hostname":hostname,"os":os,"arch":arch,"num_cpu":num_cpu,"cpu_usage":cpu,"memory_total":mem_total,"memory_used":mem_used,"memory_usage":mem_usage,"disk_total":disk_total,"disk_used":disk_used,"disk_usage":disk_usage}}))
}

async fn health_full(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").execute(&state.pool).await.is_ok();
    let containers = ["kamism-web","kamism-app","kamism-postgres","kamism-rabbitmq","kamism-redis"];
    let list = containers.iter().map(|name| {
        let inspect = sh(&format!("docker inspect -f '{{{{.State.Status}}}}|{{{{if .State.Health}}}}{{{{.State.Health.Status}}}}{{{{else}}}}none{{{{end}}}}|{{{{.State.ExitCode}}}}' {} 2>/dev/null || true", name));
        let mut parts = inspect.split('|');
        let status = parts.next().unwrap_or("").trim();
        let health = parts.next().unwrap_or("none").trim();
        let exit_code = parts.next().unwrap_or("0").trim();
        let ok = status == "running" && (health == "healthy" || health == "none");
        let label = if status.is_empty() { "missing" } else if !ok && health != "none" { health } else { status };
        json!({"name":name,"status":label,"running": status == "running", "health": health, "exit_code": exit_code, "ok": ok})
    }).collect::<Vec<_>>();
    Json(json!({"data":{"postgresql": if db_ok {"ok"} else {"error"}, "containers": list}}))
}

async fn restart_panel() -> impl IntoResponse {
    let _ = Command::new("sh").arg("-lc").arg("(sleep 1; docker restart kamism-web kamism-app >/tmp/kamism_restart.log 2>&1) &").spawn();
    Json(json!({"success":true}))
}
