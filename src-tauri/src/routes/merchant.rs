use crate::{
    middleware::auth::{AppState, auth_middleware},
    utils::jwt::Claims,
};
use axum::{
    extract::{Query, State},
    middleware,
    routing::{get, post},
    Extension, Json, Router,
};
use bcrypt::{hash, DEFAULT_COST};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Digest;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Deserialize)]
pub struct MerchantOpLogQuery { pub page: Option<i64>, pub page_size: Option<i64> }

#[derive(Deserialize)]
pub struct DashboardQuery {
    pub range: Option<String>,
}

pub fn merchant_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/merchant/profile", get(get_profile))
        .route("/merchant/dashboard-stats", get(dashboard_stats))
        .route("/merchant/change-password", post(change_password))
        .route("/merchant/regenerate-apikey", post(regenerate_api_key))
        .route("/merchant/op-logs", get(merchant_op_logs))
        .route("/merchant/balance-history", get(merchant_balance_history))
        .route("/merchant/frontend-log", post(merchant_frontend_log))
        .route("/merchant/purchase", post(purchase_plan))
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

async fn get_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<Value> {
    let id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };

    let merchant: Option<crate::models::merchant::Merchant> =
        sqlx::query_as("SELECT * FROM merchants WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    match merchant {
        Some(m) => {
            let email = crate::db::encrypted_fields::EncryptedFieldsOps::decrypt_merchant_email(&state.encryptor, &m.email)
                .unwrap_or_else(|_| m.email.clone());
            let api_key = crate::db::encrypted_fields::EncryptedFieldsOps::decrypt_merchant_api_key(&state.encryptor, &m.api_key)
                .unwrap_or_default();
            let extra: Option<(Option<String>, Option<String>, Option<f64>)> = sqlx::query_as(
                "SELECT avatar_url, background_url, balance::float8 FROM merchants WHERE id = $1"
            )
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);
            let (avatar, background_url, balance) = extra.unwrap_or((None, None, Some(0.0)));
            Json(json!({
                "success": true,
                "data": {
                    "id": m.id,
                    "username": m.username,
                    "email": email,
                    "api_key": api_key,
                    "avatar": avatar,
                    "background_url": background_url,
                    "balance": balance.unwrap_or(0.0),
                    "status": m.status,
                    "plan": m.plan,
                    "plan_expires_at": m.plan_expires_at,
                    "email_verified": m.email_verified,
                    "created_at": m.created_at
                }
            }))
        }
        None => Json(json!({"success": false, "message": "用户不存在"})),
    }
}

async fn dashboard_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<DashboardQuery>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };

    // 根据 range 参数决定时间区间和分组粒度
    let (interval, trunc, label) = match q.range.as_deref().unwrap_or("week") {
        "month" => ("3 months", "week", "month"),
        "year"  => ("1 year",   "month", "year"),
        _       => ("7 days",   "day",   "week"),  // 默认周
    };
    let _ = label;

    // 1. 卡密使用率
    let card_stats: Vec<(String, i64)> = sqlx::query_as(
        "SELECT status, COUNT(*) FROM cards WHERE merchant_id = $1 GROUP BY status",
    )
    .bind(merchant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    // 2. 激活趋势（动态粒度）
    let sql = format!(
        "SELECT DATE_TRUNC('{trunc}', activated_at)::date AS day, COUNT(*) AS cnt
         FROM activations
         WHERE card_id IN (SELECT id FROM cards WHERE merchant_id = $1)
           AND activated_at >= NOW() - INTERVAL '{interval}'
         GROUP BY day
         ORDER BY day",
        trunc = trunc,
        interval = interval,
    );
    let activation_trend: Vec<(chrono::NaiveDate, i64)> =
        sqlx::query_as(&sql)
            .bind(merchant_id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    // 3. 设备分布
    let device_dist: Vec<(String, i64)> = sqlx::query_as(
        "SELECT a.app_name, COUNT(act.id) AS device_cnt
         FROM apps a
         LEFT JOIN cards c ON c.app_id = a.id AND c.merchant_id = $1
         LEFT JOIN activations act ON act.card_id = c.id
         WHERE a.merchant_id = $1
         GROUP BY a.app_name
         ORDER BY device_cnt DESC
         LIMIT 10",
    )
    .bind(merchant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(json!({
        "success": true,
        "data": {
            "card_stats": card_stats.iter().map(|(s, c)| json!({"status": s, "count": c})).collect::<Vec<_>>(),
            "activation_trend": activation_trend.iter().map(|(d, c)| json!({"date": d.to_string(), "count": c})).collect::<Vec<_>>(),
            "device_dist": device_dist.iter().map(|(app, c)| json!({"app": app, "count": c})).collect::<Vec<_>>(),
        }
    }))
}

async fn change_password(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<ChangePasswordRequest>,
) -> Json<Value> {
    if body.new_password.len() < 8 {
        return Json(json!({"success": false, "message": "新密码至少8位"}));
    }
    let id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };

    let merchant: Option<crate::models::merchant::Merchant> =
        sqlx::query_as("SELECT * FROM merchants WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let merchant = match merchant {
        Some(m) => m,
        None => return Json(json!({"success": false, "message": "用户不存在"})),
    };

    let valid = bcrypt::verify(&body.old_password, &merchant.password_hash).unwrap_or(false);
    if !valid {
        return Json(json!({"success": false, "message": "原密码错误"}));
    }

    let new_hash = match hash(&body.new_password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return Json(json!({"success": false, "message": "密码加密失败"})),
    };

    let _ = sqlx::query(
        "UPDATE merchants SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&new_hash)
    .bind(id)
    .execute(&state.pool)
    .await;

    Json(json!({"success": true, "message": "密码已修改"}))
}

async fn regenerate_api_key(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<Value> {
    let id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };

    let new_key = crate::utils::card_gen::generate_api_key();
    let encrypted = match crate::db::encrypted_fields::EncryptedFieldsOps::encrypt_merchant_api_key(
        &state.pool,
        &state.encryptor,
        id,
        &new_key,
    ).await {
        Ok(v) => v,
        Err(_) => return Json(json!({"success": false, "message": "API Key加密失败"})),
    };
    let hash = crate::db::encrypted_fields::EncryptedFieldsOps::generate_hash(&new_key);

    let _ = sqlx::query(
        "UPDATE merchants SET api_key_encrypted = $1, api_key_hash = $2, updated_at = NOW() WHERE id = $3",
    )
    .bind(&encrypted)
    .bind(&hash)
    .bind(id)
    .execute(&state.pool)
    .await;

    let _ = sqlx::query("UPDATE admins SET api_key = $1 WHERE id = $2")
        .bind(&new_key)
        .bind(id)
        .execute(&state.pool)
        .await;

    Json(json!({"success": true, "data": {"api_key": new_key}}))
}

async fn merchant_op_logs(State(state): State<AppState>, Extension(claims): Extension<Claims>, Query(q): Query<MerchantOpLogQuery>) -> Json<Value> {
    let uid = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };
    let page = q.page.unwrap_or(1).max(1);
    let ps = q.page_size.unwrap_or(15).min(50);
    let offset = (page - 1) * ps;
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM operation_logs WHERE user_id = $1")
        .bind(uid).fetch_one(&state.pool).await.unwrap_or((0,));
    let rows: Vec<(Uuid, String, String, Option<String>, Option<String>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, action, COALESCE(module,'') as module, detail, ip_address, created_at FROM operation_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    ).bind(uid).bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
    let list: Vec<Value> = rows.into_iter().map(|(id, action, module, detail, ip, created)| json!({
        "id": id, "action": action, "module": module, "detail": detail.unwrap_or_default(),
        "ip": ip.unwrap_or_default(), "created_at": created
    })).collect();
    Json(json!({"success": true, "data": list, "total": total.0, "page": page, "page_size": ps}))
}

async fn merchant_frontend_log(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<serde_json::Value>) -> Json<Value> {
    let action = body.get("action").and_then(|v| v.as_str()).unwrap_or("other");
    let module = body.get("module").and_then(|v| v.as_str()).unwrap_or("");
    let detail = body.get("detail").and_then(|v| v.as_str()).unwrap_or("");
    let user_id = Uuid::parse_str(&claims.sub).ok();
    crate::utils::op_log::log_operation(&state.pool, "merchant", user_id, action, module, detail, "").await;
    Json(json!({"success": true}))
}

// === 商户购买套餐 ===
#[derive(Deserialize)]
pub struct PurchaseRequest {
    pub plan: String,
    pub billing_key: Option<String>,
}

async fn purchase_plan(State(state): State<AppState>, Extension(claims): Extension<Claims>, Json(body): Json<PurchaseRequest>) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };
    let plan_row: Option<(String, String, serde_json::Value)> = sqlx::query_as(
        "SELECT plan, label, pricing_options FROM plan_configs WHERE plan=$1 AND is_active=true"
    ).bind(&body.plan).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((plan, label, pricing)) = plan_row else {
        return Json(json!({"success": false, "message": "套餐不存在或已停用"}));
    };
    let key = body.billing_key.clone().unwrap_or_else(|| "month".to_string());
    let price = if let Some(arr) = pricing.as_array() {
        arr.iter().find(|p| p.get("key").and_then(|v| v.as_str()) == Some(&key))
            .and_then(|p| p.get("price")).and_then(|v| v.as_f64()).unwrap_or(0.0)
    } else { 0.0 };
    let raw_days = if let Some(arr) = pricing.as_array() {
        arr.iter().find(|p| p.get("key").and_then(|v| v.as_str()) == Some(&key))
            .and_then(|p| p.get("days")).and_then(|v| v.as_i64()).unwrap_or(30)
    } else { 30 };
    if price < 0.0 { return Json(json!({"success": false, "message": "套餐价格异常"})); }
    let current: Option<(String, Option<chrono::DateTime<chrono::Utc>>, Option<f64>)> = sqlx::query_as(
        "SELECT plan, plan_expires_at, balance::float8 FROM merchants WHERE id=$1"
    ).bind(merchant_id).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((_current_plan, _current_exp, balance)) = current else {
        return Json(json!({"success": false, "message": "商户账号不存在"}));
    };
    let current_balance = balance.unwrap_or(0.0);
    if current_balance + 0.000001 < price {
        return Json(json!({"success": false, "message": format!("余额不足，当前余额 ¥{:.2}，需支付 ¥{:.2}", current_balance, price)}));
    }
    // Cap days to avoid PostgreSQL INTERVAL overflow (max ~36500 days ≈ 100 years)
    let capped_days = std::cmp::min(raw_days, 36500i64);
    let updated: Option<(f64,)> = sqlx::query_as(
        "UPDATE merchants SET balance=COALESCE(balance,0)-$1, plan=$2, plan_expires_at=GREATEST(COALESCE(plan_expires_at,NOW()),NOW())+($3||' days')::INTERVAL, updated_at=NOW() WHERE id=$4 AND COALESCE(balance,0) >= $5 RETURNING balance::float8"
    ).bind(price).bind(&plan).bind(capped_days.to_string()).bind(merchant_id).bind(price).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((new_balance,)) = updated else {
        return Json(json!({"success": false, "message": "余额不足或扣款失败"}));
    };
    let detail = format!("购买套餐扣除 · {} · {}天 · ¥{:.2}", label, raw_days, price);
    let _ = sqlx::query(
        "INSERT INTO operation_logs (user_id, user_type, action, detail, created_at) VALUES ($1, 'merchant', 'update_plan', $2, NOW())"
    ).bind(merchant_id).bind(&detail).execute(&state.pool).await;
    Json(json!({"success": true, "message": format!("购买成功 {} {}天，已扣除 ¥{:.2}", label, raw_days, price), "data": {"plan": plan, "label": label, "days": raw_days, "price": price, "balance": new_balance}}))
}

#[derive(serde::Deserialize)]
struct BalanceHistoryQuery { #[serde(default = "default_page")] page: i64, #[serde(default = "default_size")] page_size: i64 }
fn default_page() -> i64 { 1 }
fn default_size() -> i64 { 20 }

fn extract_purchase_amount(detail: &str) -> Option<f64> {
    if let Some(pos) = detail.rfind('¥') {
        let raw: String = detail[pos + '¥'.len_utf8()..].chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        if let Ok(v) = raw.parse::<f64>() { return Some(-v.abs()); }
    }
    None
}

async fn merchant_balance_history(State(state): State<AppState>, Extension(claims): Extension<Claims>, Query(q): Query<BalanceHistoryQuery>) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户ID"})),
    };
    let page = q.page.max(1);
    let size = q.page_size.clamp(1, 100);
    let offset = (page - 1) * size;
    let rows: Vec<(String, String, Option<String>, f64, Option<String>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"SELECT kind, title, code, amount, note, occurred_at FROM (
             SELECT 'redeem'::text AS kind,
                    CASE WHEN COALESCE(rc.recharge_type,'plan')='balance' THEN '余额充值' ELSE '套餐兑换' END AS title,
                    rc.code AS code,
                    CASE WHEN COALESCE(rc.recharge_type,'plan')='balance' THEN COALESCE(rc.balance_amount::float8,0) ELSE 0 END AS amount,
                    COALESCE(pc.label, rc.plan, rc.note) AS note,
                    rc.used_at AS occurred_at
             FROM recharge_codes rc LEFT JOIN plan_configs pc ON pc.plan=rc.plan
             WHERE rc.merchant_id=$1 AND rc.used_at IS NOT NULL
             UNION ALL
             SELECT br.record_type::text AS kind,
                    CASE br.record_type
                      WHEN 'system_balance_grant' THEN '系统赠送余额'
                      WHEN 'system_plan_grant' THEN '系统赠送套餐'
                      WHEN 'notice_reward' THEN '公告领取奖励'
                      ELSE COALESCE(br.description,'余额变动')
                    END AS title,
                    NULL::text AS code,
                    br.amount::float8 AS amount,
                    br.description AS note,
                    br.created_at AS occurred_at
             FROM balance_records br WHERE br.merchant_id=$1
             UNION ALL
             SELECT 'purchase_plan'::text AS kind,
                    '购买套餐'::text AS title,
                    NULL::text AS code,
                    COALESCE(NULLIF(regexp_replace(ol.detail, '^.*¥([0-9]+(\.[0-9]+)?).*$','\1'), ol.detail)::float8 * -1, 0) AS amount,
                    ol.detail AS note,
                    ol.created_at AS occurred_at
             FROM operation_logs ol
             WHERE ol.user_id=$1 AND ol.user_type='merchant' AND ol.action='update_plan' AND ol.detail LIKE '%购买套餐扣除%'
           ) t ORDER BY occurred_at DESC LIMIT $2 OFFSET $3"#
        )
        .bind(merchant_id)
        .bind(size as i64)
        .bind(offset as i64)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
    let items: Vec<Value> = rows.into_iter().map(|(kind,title,code,amount,note,occurred_at)| json!({
        "kind": kind,
        "title": title,
        "code": code,
        "amount": amount,
        "note": note,
        "occurred_at": occurred_at,
    })).collect();
    Json(json!({"success": true, "data": items, "items": items, "page": page, "page_size": size}))
}
