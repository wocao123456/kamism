use crate::middleware::auth::{admin_only, auth_middleware, AppState};
use crate::models::plan_config::PlanConfig;
use axum::{extract::{Path, State}, middleware, routing::{get, patch}, Json, Router};
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct UpdatePlanConfigRequest {
    pub label: Option<String>, pub max_apps: Option<i32>, pub max_cards: Option<i32>,
    pub max_devices: Option<i32>, pub max_gen_once: Option<i32>, pub description: Option<String>,
    pub price_month: Option<Decimal>, pub price_quarter: Option<Decimal>, pub price_year: Option<Decimal>,
    pub pricing_options: Option<Value>, pub sort_order: Option<i32>, pub is_active: Option<bool>,
}

#[derive(Deserialize)]
pub struct CreatePlanConfigRequest {
    pub plan: String, pub label: String, pub max_apps: i32, pub max_cards: i32,
    pub max_devices: i32, pub max_gen_once: i32, pub description: Option<String>,
    pub price_month: Option<Decimal>, pub price_quarter: Option<Decimal>, pub price_year: Option<Decimal>,
    pub pricing_options: Option<Value>, pub sort_order: Option<i32>,
}

pub fn plan_config_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/admin/plan-configs", get(list_plan_configs).post(create_plan_config))
        .route("/admin/plan-configs/:id", patch(update_plan_config).delete(delete_plan_config))
        .route_layer(middleware::from_fn(admin_only))
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

pub fn public_plan_router(state: AppState) -> Router<AppState> {
    Router::new().route("/plans", get(list_public_plans)).route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

async fn list_public_plans(State(state): State<AppState>) -> Json<Value> {
    let configs: Vec<PlanConfig> = sqlx::query_as("SELECT * FROM plan_configs WHERE is_active=true ORDER BY sort_order ASC, plan ASC")
        .fetch_all(&state.pool).await.unwrap_or_default();
    Json(json!({ "success": true, "data": configs }))
}

async fn list_plan_configs(State(state): State<AppState>) -> Json<Value> {
    let configs: Vec<PlanConfig> = sqlx::query_as("SELECT * FROM plan_configs ORDER BY sort_order ASC, plan ASC")
        .fetch_all(&state.pool).await.unwrap_or_default();
    Json(json!({ "success": true, "data": configs }))
}

fn default_pricing_options() -> Value {
    json!([
        {"key":"month","label":"月付","days":30,"price":0}
    ])
}

fn validate_limits(max_devices: Option<i32>) -> Option<Json<Value>> {
    if let Some(d) = max_devices { if d != -1 && (d < 1 || d > 100) { return Some(Json(json!({"success": false, "message": "max_devices 需在 1-100 之间（-1 表示无限）"}))); } }
    None
}

async fn create_plan_config(State(state): State<AppState>, Json(body): Json<CreatePlanConfigRequest>) -> Json<Value> {
    let plan = body.plan.trim().to_lowercase();
    if plan.is_empty() || !plan.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '-') {
        return Json(json!({"success": false, "message": "套餐标识只能包含小写字母、数字、-、_"}));
    }
    if let Some(r) = validate_limits(Some(body.max_devices)) { return r; }
    let result = sqlx::query_as::<_, PlanConfig>(
        "INSERT INTO plan_configs (plan,label,max_apps,max_cards,max_devices,max_gen_once,description,price_month,price_quarter,price_year,pricing_options,sort_order,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING *")
        .bind(plan).bind(body.label).bind(body.max_apps).bind(body.max_cards).bind(body.max_devices).bind(body.max_gen_once)
        .bind(body.description.unwrap_or_default()).bind(body.price_month.unwrap_or(Decimal::ZERO)).bind(body.price_quarter.unwrap_or(Decimal::ZERO)).bind(body.price_year.unwrap_or(Decimal::ZERO)).bind(body.pricing_options.unwrap_or_else(default_pricing_options)).bind(body.sort_order.unwrap_or(100))
        .fetch_one(&state.pool).await;
    match result { Ok(p) => Json(json!({"success": true, "data": p})), Err(e) => Json(json!({"success": false, "message": format!("创建失败: {}", e)})) }
}

async fn update_plan_config(State(state): State<AppState>, Path(id): Path<Uuid>, Json(body): Json<UpdatePlanConfigRequest>) -> Json<Value> {
    if let Some(r) = validate_limits(body.max_devices) { return r; }
    let result = sqlx::query(
        "UPDATE plan_configs SET label=COALESCE($1,label), max_apps=COALESCE($2,max_apps), max_cards=COALESCE($3,max_cards),
         max_devices=COALESCE($4,max_devices), max_gen_once=COALESCE($5,max_gen_once), description=COALESCE($6,description),
         price_month=COALESCE($7,price_month), price_quarter=COALESCE($8,price_quarter), price_year=COALESCE($9,price_year),
         pricing_options=COALESCE($10,pricing_options), sort_order=COALESCE($11,sort_order), is_active=COALESCE($12,is_active), updated_at=NOW() WHERE id=$13")
        .bind(&body.label).bind(body.max_apps).bind(body.max_cards).bind(body.max_devices).bind(body.max_gen_once).bind(&body.description)
        .bind(body.price_month).bind(body.price_quarter).bind(body.price_year).bind(body.pricing_options).bind(body.sort_order).bind(body.is_active).bind(id)
        .execute(&state.pool).await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            let updated: Option<PlanConfig> = sqlx::query_as("SELECT * FROM plan_configs WHERE id = $1").bind(id).fetch_optional(&state.pool).await.unwrap_or(None);
            Json(json!({ "success": true, "data": updated }))
        }
        Ok(_) => Json(json!({"success": false, "message": "套餐配置不存在"})),
        Err(e) => Json(json!({"success": false, "message": format!("更新失败: {}", e)})),
    }
}

async fn delete_plan_config(State(state): State<AppState>, Path(id): Path<Uuid>) -> Json<Value> {
    let row: Option<(String,)> = sqlx::query_as("SELECT plan FROM plan_configs WHERE id=$1").bind(id).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((plan,)) = row else { return Json(json!({"success": false, "message": "套餐配置不存在"})); };
    if plan == "free" { return Json(json!({"success": false, "message": "免费套餐为固定套餐，不能删除"})); }
    let used: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM merchants WHERE plan=$1").bind(&plan).fetch_one(&state.pool).await.unwrap_or((0,));
    if used.0 > 0 { return Json(json!({"success": false, "message": format!("该套餐已有 {} 个商户使用，请先迁移或停用", used.0)})); }
    match sqlx::query("DELETE FROM plan_configs WHERE id=$1").bind(id).execute(&state.pool).await {
        Ok(r) if r.rows_affected() > 0 => Json(json!({"success": true, "message": "套餐已删除"})),
        Ok(_) => Json(json!({"success": false, "message": "套餐配置不存在"})),
        Err(e) => Json(json!({"success": false, "message": format!("删除失败: {}", e)})),
    }
}

pub async fn get_config_by_plan(pool: &sqlx::PgPool, plan: &str) -> PlanConfig {
    sqlx::query_as("SELECT * FROM plan_configs WHERE plan = $1").bind(plan).fetch_optional(pool).await.unwrap_or(None)
        .unwrap_or_else(|| PlanConfig { id: Uuid::nil(), plan: plan.to_string(), label: "免费版".to_string(), max_apps: 1, max_cards: 500, max_devices: 3, max_gen_once: 100, description: String::new(), price_month: Decimal::ZERO, price_quarter: Decimal::ZERO, price_year: Decimal::ZERO, pricing_options: default_pricing_options(), sort_order: 100, is_active: true, updated_at: chrono::Utc::now() })
}
