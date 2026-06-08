use crate::middleware::auth::{auth_middleware, AppState};
use crate::utils::jwt::Claims;
use axum::{extract::{Path, Query, State}, http::StatusCode, middleware, response::{IntoResponse, Response}, routing::{delete, get, post}, Extension, Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SaveConfigRequest { pub key: String, pub value: Value }

#[derive(Deserialize)]
pub struct InstallRequest {
    pub postgres_password: String, pub rabbitmq_password: String, pub jwt_secret: String, pub master_key: String,
    pub admin_email: String, pub admin_password: String, pub frontend_port: Option<u16>, pub rust_log: String,
}

#[derive(Deserialize)]
pub struct GenerateRechargeRequest { pub plan: String, pub billing_cycle: String, pub duration_days: i32, pub count: i32, pub prefix: Option<String>, pub note: Option<String> }
#[derive(Deserialize)]
pub struct RedeemRequest { pub code: String }
#[derive(Deserialize)]
pub struct BatchDeleteRechargeRequest { pub ids: Vec<Uuid> }

pub fn install_public_router() -> Router<AppState> {
    Router::new().route("/install/status", get(install_status)).route("/install/complete", post(install_complete))
}

pub fn system_config_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/system-config/public", get(public_config))
        .route("/admin/system-config", get(list_config).post(save_config))
        .route("/admin/recharge-codes", get(list_recharge_codes).post(generate_recharge_codes))
        .route("/admin/recharge-codes/batch-delete", post(batch_delete_recharge_codes))
        .route("/admin/recharge-codes/:id", delete(delete_recharge_code))
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

pub fn merchant_recharge_router(state: AppState) -> Router<AppState> {
    Router::new().route("/merchant/recharge/redeem", post(redeem_code)).route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

async fn get_config(pool: &sqlx::PgPool, key: &str, fallback: Value) -> Value {
    sqlx::query_as::<_, (Value,)>("SELECT value FROM system_config WHERE key=$1").bind(key).fetch_optional(pool).await.ok().flatten().map(|v| v.0).unwrap_or(fallback)
}

async fn install_status(State(state): State<AppState>) -> Json<Value> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value::text FROM system_config WHERE key = $1")
        .bind("install.completed")
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
    let completed = row
        .and_then(|(v,)| v.parse::<bool>().ok())
        .unwrap_or(false);
    Json(json!({"success": true, "data": {"completed": completed}}))
}

async fn install_complete(State(state): State<AppState>, Json(body): Json<InstallRequest>) -> Response {
    let completed = get_config(&state.pool, "install.completed", json!(false)).await.as_bool().unwrap_or(false);
    if completed { return (StatusCode::FORBIDDEN, Json(json!({"success": false, "message": "安装已完成，禁止重复执行"}))).into_response(); }
    if body.jwt_secret.len() < 32 { return Json(json!({"success": false, "message": "JWT_SECRET 至少 32 位"})).into_response(); }
    if body.master_key.len() != 64 || !body.master_key.chars().all(|c| c.is_ascii_hexdigit()) { return Json(json!({"success": false, "message": "MASTER_KEY 必须是 64 位十六进制字符串"})).into_response(); }
    let config = json!({"postgres_password": body.postgres_password, "rabbitmq_password": body.rabbitmq_password, "jwt_secret": body.jwt_secret, "master_key": body.master_key, "admin_email": body.admin_email, "frontend_port": body.frontend_port.unwrap_or(1420), "rust_log": body.rust_log});
    let _ = sqlx::query("INSERT INTO system_config(key,value) VALUES('install.runtime',$1) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()").bind(config).execute(&state.pool).await;
    let hash = bcrypt::hash(&body.admin_password, bcrypt::DEFAULT_COST).unwrap_or_default();
    let _ = sqlx::query("UPDATE admins SET email=$1,password_hash=$2 WHERE id=(SELECT id FROM admins ORDER BY created_at ASC LIMIT 1)").bind(&body.admin_email).bind(hash).execute(&state.pool).await;
    let _ = sqlx::query("INSERT INTO system_config(key,value) VALUES('install.completed','true'::jsonb) ON CONFLICT(key) DO UPDATE SET value='true'::jsonb,updated_at=NOW()").execute(&state.pool).await;
    // Apply PostgreSQL password change so new password is actually accepted.
    let _ = sqlx::query("ALTER USER kamism WITH PASSWORD $1").bind(&body.postgres_password).execute(&state.pool).await;
    Json(json!({"success": true, "message": "安装配置已保存"})).into_response()
}


async fn public_config(State(state): State<AppState>) -> Json<Value> {
    let features = get_config(&state.pool, "merchant.enabled_features", json!([])).await;
    Json(json!({"success": true, "data": {"merchant.enabled_features": features}}))
}

async fn list_config(State(state): State<AppState>, Extension(claims): Extension<Claims>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    let rows: Vec<(String, Value)> = sqlx::query_as("SELECT key,value FROM system_config ORDER BY key").fetch_all(&state.pool).await.unwrap_or_default();
    let mut map = serde_json::Map::new(); for (k, v) in rows { map.insert(k, v); }
    Json(json!({"success": true, "data": map})).into_response()
}

async fn save_config(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<SaveConfigRequest>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    let allowed = ["merchant.enabled_features", "mail.smtp"];
    if !allowed.contains(&body.key.as_str()) { return Json(json!({"success": false, "message": "不允许修改该配置"})).into_response(); }
    let _ = sqlx::query("INSERT INTO system_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()").bind(&body.key).bind(&body.value).execute(&state.pool).await;
    Json(json!({"success": true, "message": "保存成功"})).into_response()
}


type RechargeRow = (Uuid, String, String, String, i32, String, Option<String>, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>, Option<String>);

async fn list_recharge_codes(State(state): State<AppState>, Extension(claims): Extension<Claims>, Query(params): Query<HashMap<String, String>>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    let status = params.get("status").cloned().unwrap_or_default();
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(80).clamp(1, 300);
    let stats: Vec<(String, i64)> = sqlx::query_as("SELECT status, COUNT(*) FROM recharge_codes GROUP BY status").fetch_all(&state.pool).await.unwrap_or_default();
    let total: i64 = stats.iter().map(|(_, c)| *c).sum();
    let used = stats.iter().find(|(s,_)| s == "used").map(|(_,c)| *c).unwrap_or(0);
    let unused = stats.iter().find(|(s,_)| s == "unused").map(|(_,c)| *c).unwrap_or(0);
    let disabled = stats.iter().find(|(s,_)| s == "disabled").map(|(_,c)| *c).unwrap_or(0);
    let rows: Vec<RechargeRow> = if status.is_empty() {
        sqlx::query_as("SELECT rc.id,rc.code,rc.plan,COALESCE(pc.label,rc.plan) AS label,rc.duration_days,rc.status,m.username,rc.used_at,rc.created_at,rc.note FROM recharge_codes rc LEFT JOIN merchants m ON m.id=rc.merchant_id LEFT JOIN plan_configs pc ON pc.plan=rc.plan ORDER BY rc.created_at DESC LIMIT $1").bind(limit).fetch_all(&state.pool).await.unwrap_or_default()
    } else {
        sqlx::query_as("SELECT rc.id,rc.code,rc.plan,COALESCE(pc.label,rc.plan) AS label,rc.duration_days,rc.status,m.username,rc.used_at,rc.created_at,rc.note FROM recharge_codes rc LEFT JOIN merchants m ON m.id=rc.merchant_id LEFT JOIN plan_configs pc ON pc.plan=rc.plan WHERE rc.status=$1 ORDER BY rc.created_at DESC LIMIT $2").bind(&status).bind(limit).fetch_all(&state.pool).await.unwrap_or_default()
    };
    let items: Vec<Value> = rows.into_iter().map(|r| json!({"id":r.0,"code":r.1,"plan":r.2,"label":r.3,"duration_days":r.4,"status":r.5,"merchant":r.6,"used_at":r.7,"created_at":r.8,"note":r.9})).collect();
    Json(json!({"success": true, "data": {"stats": {"total": total, "used": used, "unused": unused, "disabled": disabled}, "items": items}})).into_response()
}

async fn generate_recharge_codes(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<GenerateRechargeRequest>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    if body.count < 1 || body.count > 500 { return Json(json!({"success": false, "message": "生成数量需在 1-500"})).into_response(); }
    if body.duration_days < 1 { return Json(json!({"success": false, "message": "有效天数必须大于 0"})).into_response(); }
    let exists: Option<(String,)> = sqlx::query_as("SELECT plan FROM plan_configs WHERE plan=$1 AND is_active=true").bind(&body.plan).fetch_optional(&state.pool).await.unwrap_or(None);
    if exists.is_none() { return Json(json!({"success": false, "message": "套餐不存在或已停用"})).into_response(); }
    let mut codes = Vec::new();
    for _ in 0..body.count {
        let code = format!("{}{}", body.prefix.clone().unwrap_or_else(|| "RC".to_string()), Uuid::new_v4().simple().to_string()[..20].to_ascii_uppercase());
        let _ = sqlx::query("INSERT INTO recharge_codes(code,plan,billing_cycle,duration_days,note) VALUES($1,$2,$3,$4,$5)").bind(&code).bind(&body.plan).bind(&body.billing_cycle).bind(body.duration_days).bind(&body.note).execute(&state.pool).await;
        codes.push(code);
    }
    Json(json!({"success": true, "data": codes})).into_response()
}



async fn batch_delete_recharge_codes(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<BatchDeleteRechargeRequest>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    if body.ids.is_empty() { return Json(json!({"success": false, "message": "请选择要删除的兑换卡密"})).into_response(); }
    match sqlx::query("DELETE FROM recharge_codes WHERE id = ANY($1)").bind(&body.ids).execute(&state.pool).await {
        Ok(r) => Json(json!({"success": true, "message": format!("已删除 {} 张兑换卡密", r.rows_affected())})).into_response(),
        Err(e) => Json(json!({"success": false, "message": format!("删除失败: {}", e)})).into_response(),
    }
}

async fn delete_recharge_code(State(state): State<AppState>, Extension(claims): Extension<Claims>, Path(id): Path<Uuid>) -> Response {
    if let Some(r) = admin_guard(&claims) { return r; }
    match sqlx::query("DELETE FROM recharge_codes WHERE id=$1").bind(id).execute(&state.pool).await {
        Ok(r) if r.rows_affected() > 0 => Json(json!({"success": true, "message": "兑换卡密已删除"})).into_response(),
        Ok(_) => Json(json!({"success": false, "message": "兑换卡密不存在"})).into_response(),
        Err(e) => Json(json!({"success": false, "message": format!("删除失败: {}", e)})).into_response(),
    }
}

async fn redeem_code(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<RedeemRequest>) -> Response {
    if claims.role != "merchant" && claims.role != "admin" { return (StatusCode::FORBIDDEN, Json(json!({"success": false, "message": "仅商户可兑换"}))).into_response(); }
    let merchant_id = match Uuid::parse_str(&claims.sub) { Ok(id) => id, Err(_) => return Json(json!({"success": false, "message": "无效用户"})).into_response() };
    let row: Option<(Uuid, String, i32, String)> = sqlx::query_as("SELECT id,plan,duration_days,status FROM recharge_codes WHERE code=$1").bind(body.code.trim()).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((id, plan, days, status)) = row else { return Json(json!({"success": false, "message": "兑换卡密不存在"})).into_response(); };
    if status != "unused" { return Json(json!({"success": false, "message": "兑换卡密已使用或不可用"})).into_response(); }
    let current: Option<(String, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as("SELECT plan, plan_expires_at FROM merchants WHERE id=$1").bind(merchant_id).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((current_plan, current_exp)) = current else { return Json(json!({"success": false, "message": "商户账号不存在"})).into_response(); };
    let active_paid = current_plan != "free" && current_exp.map(|d| d > chrono::Utc::now()).unwrap_or(false);
    if active_paid && current_plan != plan {
        return Json(json!({"success": false, "message": "当前套餐未过期，不能兑换不同套餐"})).into_response();
    }
    let _ = sqlx::query("UPDATE merchants SET plan=$1, plan_expires_at=GREATEST(COALESCE(plan_expires_at,NOW()),NOW())+($2||' days')::INTERVAL, updated_at=NOW() WHERE id=$3").bind(&plan).bind(days.to_string()).bind(merchant_id).execute(&state.pool).await;
    let _ = sqlx::query("UPDATE recharge_codes SET status='used',merchant_id=$1,used_at=NOW() WHERE id=$2").bind(merchant_id).bind(id).execute(&state.pool).await;
    Json(json!({"success": true, "message": if active_paid { "兑换成功，会员时间已叠加" } else { "兑换成功" }})).into_response()
}

fn admin_guard(claims: &Claims) -> Option<Response> {
    if claims.role != "admin" { Some((StatusCode::FORBIDDEN, Json(json!({"success": false, "message": "需要管理员权限"}))).into_response()) } else { None }
}
