use crate::middleware::auth::{auth_middleware, AppState};
use crate::utils::jwt::Claims;
use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, post},
    Extension, Json, Router,
};
use serde_json::json;
use std::{env, fs, process::Command};

pub fn system_update_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/system-update/status", get(update_status))
        .route("/system-update/apply", post(apply_update))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .with_state(state)
}

fn workdir() -> String {
    env::var("UPDATE_WORKDIR").unwrap_or_else(|_| "/workspace".to_string())
}

fn hostdir() -> String {
    env::var("HOST_PROJECT_DIR").unwrap_or_else(|_| "/root/kamism".to_string())
}

fn log_path() -> String {
    format!("{}/.auto_update_cron.log", workdir())
}

fn sh(cmd: &str) -> Result<String, String> {
    let out = Command::new("sh")
        .arg("-lc")
        .arg(cmd)
        .current_dir(workdir())
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

fn first_heading(md: &str) -> String {
    md.lines()
        .find(|l| l.starts_with("## ["))
        .unwrap_or("## [未知版本]")
        .trim()
        .to_string()
}

fn extract_version_text(value: &str) -> String {
    let s = value.trim();
    if s.is_empty() {
        return String::new();
    }
    if let Some(start) = s.find('[') {
        if let Some(end_rel) = s[start + 1..].find(']') {
            return s[start + 1..start + 1 + end_rel].trim().to_string();
        }
    }
    for token in s.split(|c: char| c.is_whitespace() || c == '-' || c == '：' || c == ':') {
        let t = token.trim_matches(|c: char| c == '[' || c == ']' || c == '(' || c == ')' || c == ',' || c == ';');
        let raw = t.trim_start_matches('v').trim_start_matches('V');
        if raw.split('.').filter(|x| !x.is_empty() && x.chars().all(|c| c.is_ascii_digit())).count() >= 2 {
            return if t.starts_with('v') || t.starts_with('V') { t.to_string() } else { format!("v{}", raw) };
        }
    }
    s.to_string()
}

fn parse_version_nums(value: &str) -> Option<Vec<u64>> {
    let v = extract_version_text(value);
    let raw = v.trim().trim_start_matches('v').trim_start_matches('V');
    let nums: Vec<u64> = raw
        .split('.')
        .map(|part| part.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.parse::<u64>().ok())
        .collect();
    if nums.len() >= 2 { Some(nums) } else { None }
}

fn remote_version_is_newer(current: &str, latest: &str) -> bool {
    match (parse_version_nums(current), parse_version_nums(latest)) {
        (Some(mut cur), Some(mut lat)) => {
            let len = cur.len().max(lat.len());
            cur.resize(len, 0);
            lat.resize(len, 0);
            lat > cur
        }
        _ => false,
    }
}

fn should_show_update(current_candidates: &[&str], latest: &str) -> bool {
    if parse_version_nums(latest).is_none() {
        return false;
    }
    let parseable_currents: Vec<&str> = current_candidates
        .iter()
        .copied()
        .filter(|v| parse_version_nums(v).is_some())
        .collect();
    !parseable_currents.is_empty()
        && parseable_currents
            .iter()
            .all(|current| remote_version_is_newer(current, latest))
}
fn read_local_changelog() -> String {
    [
        format!("{}/CHANGELOG.md", workdir()),
        format!("{}/CHANGELOG.md", hostdir()),
        "/app/CHANGELOG.md".to_string(),
        "CHANGELOG.md".to_string(),
    ]
    .into_iter()
    .find_map(|p| fs::read_to_string(p).ok())
    .unwrap_or_default()
}
fn is_placeholder(value: &str) -> bool {
    let v = value.trim().to_lowercase();
    v.is_empty()
        || v == "unknown"
        || v == "unknown version"
        || v == "local"
        || v == "local version"
        || v == "local install version"
        || v.contains("未知版本")
}
fn clean_installed(
    installed: Option<(String, String, String)>,
    fallback_version: String,
    fallback_hash: String,
    fallback_msg: String,
) -> (String, String, String) {
    match installed {
        Some((version, hash, msg)) => (
            if is_placeholder(&version) { fallback_version } else { version },
            if is_placeholder(&hash) { fallback_hash } else { hash },
            if is_placeholder(&msg) { fallback_msg } else { msg },
        ),
        None => (fallback_version, fallback_hash, fallback_msg),
    }
}

fn first_section(md: &str) -> String {
    let mut out = Vec::new();
    let mut in_section = false;
    for line in md.lines() {
        if line.starts_with("## [") {
            if in_section {
                break;
            }
            in_section = true;
        }
        if in_section {
            out.push(line);
        }
    }
    out.join("\n").trim().to_string()
}

fn tail_log() -> String {
    fs::read_to_string(log_path())
        .unwrap_or_default()
        .lines()
        .rev()
        .take(300)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n")
}

fn admin_only(claims: &Claims) -> Option<Response> {
    if claims.role != "admin" {
        Some((
            StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "需要管理员权限"})),
        )
            .into_response())
    } else {
        None
    }
}

/// 从日志中解析当前更新阶段
fn parse_phase(log: &str) -> (String, String) {
    let last_progress = log
        .lines()
        .rev()
        .find(|l| l.contains("[") && l.contains("]") && l.contains("/6"))
        .unwrap_or("");
    if last_progress.contains("[1/6]") {
        ("fetching".into(), "正在拉取最新代码...".into())
    } else if last_progress.contains("[2/6]") {
        ("building".into(), "正在准备环境...".into())
    } else if last_progress.contains("[3/6]") {
        ("building".into(), "正在重新构建镜像...".into())
    } else if last_progress.contains("[4/6]") {
        ("restarting".into(), "正在重启容器...".into())
    } else if last_progress.contains("[5/6]") {
        ("finalizing".into(), "正在写入版本信息...".into())
    } else if last_progress.contains("[6/6]") || last_progress.contains("update end") {
        ("done".into(), "更新完成".into())
    } else if last_progress.contains("update start") {
        ("preparing".into(), "正在准备更新...".into())
    } else {
        ("idle".into(), String::new())
    }
}

async fn update_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Response {
    if let Some(r) = admin_only(&claims) {
        return r;
    }

    let _ = sh("git fetch origin main");

    let latest = sh("git rev-parse --short origin/main").unwrap_or_else(|_| "unknown".into());
    let latest_msg = sh("git log -1 --pretty=%s origin/main").unwrap_or_default();

    let local_changelog = read_local_changelog();
    let remote_changelog =
        sh("git show origin/main:CHANGELOG.md").unwrap_or_else(|_| local_changelog.clone());

    let installed: Option<(String, String, String)> = sqlx::query_as(
        "SELECT version_text, commit_hash, commit_message FROM system_versions WHERE id = 1",
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let fallback_current_hash = sh("git rev-parse --short HEAD").unwrap_or_else(|_| "unknown".into());
    let fallback_current_msg = sh("git log -1 --pretty=%s HEAD").unwrap_or_default();
    let local_current_version = first_heading(&local_changelog);
    // 本地 CHANGELOG 是版本来源的真实记录，优先使用。
    // 数据库 system_versions 可能滞后（更新完成后才写入），
    // 所以当本地 CHANGELOG 版本 >= 数据库版本时，以 CHANGELOG 为准。
    let (db_version, db_hash, db_msg) = clean_installed(
        installed,
        local_current_version.clone(),
        fallback_current_hash.clone(),
        fallback_current_msg.clone(),
    );
    // 优先使用较新的一方：如果本地 CHANGELOG 版本 >= 数据库记录版本，以 CHANGELOG 为准
    // （CHANGELOG 是构建时真实写入的，system_versions 可能因更新流程中断而滞后）
    let current_version = if remote_version_is_newer(&db_version, &local_current_version) {
        // CHANGELOG 版本 > DB 版本，以 CHANGELOG 为准
        local_current_version.clone()
    } else {
        // DB 版本 >= CHANGELOG 版本（或无法比较），以 DB 为准
        db_version
    };
    let current_hash = if &current_version == &local_current_version {
        fallback_current_hash
    } else {
        db_hash
    };
    let current_msg = if &current_version == &local_current_version {
        fallback_current_msg
    } else {
        db_msg
    };

    let latest_version = first_heading(&remote_changelog);
    // 只按版本号判断是否存在新版本，避免同版本不同 commit 误判为“发现更新”。
    // 同时参考数据库记录版本和本地 CHANGELOG 版本，避免 system_versions 记录滞后导致同版本误报。
    let has_update = should_show_update(&[&current_version, &local_current_version], &latest_version);
    let log_content = tail_log();
    let running = fs::read_to_string(format!("{}/.auto_update_running", workdir()))
        .ok()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    // 检测是否有进程在跑
    let pid_alive = if running {
        let pid = fs::read_to_string(format!("{}/.auto_update_running", workdir()))
            .unwrap_or_default()
            .trim()
            .to_string();
        if !pid.is_empty() && pid != "1" {
            sh(&format!("kill -0 {} 2>/dev/null && echo yes || echo no", pid))
                .unwrap_or_default()
                .contains("yes")
        } else {
            true // 容器内可能无法 kill -0 宿主进程
        }
    } else {
        false
    };

    let (phase, phase_message) = if pid_alive || running {
        parse_phase(&log_content)
    } else {
        ("idle".into(), String::new())
    };

    // 清理残留的 running 标记
    if running && !pid_alive && phase == "idle" {
        let _ = fs::remove_file(format!("{}/.auto_update_running", workdir()));
    }

    let display_changelog = if has_update {
        first_section(&remote_changelog)
    } else {
        remote_changelog.clone()
    };

    Json(json!({"success": true, "data": {
        "current": current_hash,
        "latest": latest,
        "current_message": current_msg,
        "latest_message": latest_msg,
        "current_version": current_version,
        "latest_version": latest_version,
        "has_update": has_update,
        "running": running && pid_alive,
        "phase": phase,
        "phase_message": phase_message,
        "changelog": display_changelog,
        "log": log_content
    }})).into_response()
}

async fn apply_update(Extension(claims): Extension<Claims>) -> Response {
    if let Some(r) = admin_only(&claims) {
        return r;
    }
    // 立即写入 running 标记，防止前端轮询时状态返回 idle 导致误判"更新完成"
    let marker = format!("{}/.auto_update_running", workdir());
    let _ = fs::write(&marker, "1");
    // 立即清空旧日志，让前端看到全新的日志流
    let _ = fs::write(&format!("{}/.auto_update_cron.log", workdir()), "update start\n");
    let cmd = format!(
        "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v {0}:{0} -w {0} -e DATABASE_URL=\"$DATABASE_URL\" docker:27-cli sh -lc 'apk add --no-cache git bash postgresql-client >/dev/null && : > {0}/.auto_update_cron.log && bash {0}/auto_update.sh' >/tmp/kamism_update_trigger.log 2>&1 &",
        hostdir()
    );

    match Command::new("sh").arg("-lc").arg(&cmd).spawn() {
        Ok(_) => Json(json!({
            "success": true,
            "message": "系统更新已开始"
        }))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("启动更新失败: {}", e)
            })),
        )
            .into_response(),
    }
}
