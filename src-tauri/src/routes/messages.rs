//! 站内信 / 公告路由
//!
//! 管理员接口（需 admin_only）：
//!   POST   /admin/messages           — 发送公告或站内信
//!   GET    /admin/messages           — 查询已发消息列表
//!   PATCH  /admin/messages/:id       — 编辑消息（置顶/内容）
//!   DELETE /admin/messages/:id       — 删除消息
//!
//! 商户接口（需 auth_middleware）：
//!   GET     /merchant/notices          — 公告列表
//!   GET     /merchant/messages         — 站内信列表
//!   GET     /merchant/messages/unread_count — 未读数
//!   POST    /merchant/messages/:id/read    — 标记已读
//!   GET     /ws/messages               — WebSocket 升级

use crate::{
    middleware::auth::{admin_only, auth_middleware, AppState},
    models::message::{Message as Msg, MessageAdminView, MessageMerchantView},
    utils::{jwt::Claims, ws::WsRegistry, mailer::{load_mailer_config, send_custom_email}},
};
use axum::{
    extract::{
        ws::{Message as WsMessage, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    middleware,
    response::IntoResponse,
    routing::{delete, get, patch, post},
    Extension, Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

// ── 路由注册 ─────────────────────────────────────────────────────────────────

pub fn messages_admin_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/admin/messages", post(admin_send_message))
        .route("/admin/messages", get(admin_list_messages))
        .route("/admin/messages/:id", patch(admin_update_message))
        .route("/admin/messages/:id", delete(admin_delete_message))
        .route_layer(middleware::from_fn(admin_only))
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

pub fn messages_merchant_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/merchant/notices", get(merchant_list_notices))
        .route("/merchant/messages", get(merchant_list_messages))
        .route("/merchant/messages/unread_count", get(merchant_unread_count))
        .route("/merchant/messages/read_all", post(merchant_mark_all_read))
        .route("/merchant/messages/:id/read", post(merchant_mark_read))
        .route("/merchant/messages/:id/claim_reward", post(merchant_claim_reward))
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

pub fn messages_ws_router() -> Router<AppState> {
    Router::new().route("/ws/messages", get(ws_handler))
}

// ── 请求/响应结构 ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SendMessageRequest {
    /// 消息类型："notice" | "message" | "email"
    pub msg_type: String,
    pub title: String,
    pub content: String,
    /// 收件范围："all" | "single"（仅 message 类型有效）
    pub target_type: Option<String>,
    /// 单发时指定商户 UUID（优先级低于 target_email）
    pub target_id: Option<Uuid>,
    /// 单发时指定商户邮箱（优先于 target_id）
    pub target_email: Option<String>,
    pub pinned: Option<bool>,
    /// 公告余额奖励金额（仅 notice 生效，>0 时商户可领取一次）
    pub reward_amount: Option<f64>,
    pub expires_at: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMessageRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub pinned: Option<bool>,
    /// 公告余额奖励金额（仅 notice 生效，>0 时商户可领取一次）
    pub reward_amount: Option<f64>,
    pub expires_at: Option<String>,
}

#[derive(Deserialize)]
pub struct MessageListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    /// 过滤类型："notice" | "message"，不传则全部
    pub msg_type: Option<String>,
}

// ── 管理员：发送消息 ──────────────────────────────────────────────────────────

async fn admin_send_message(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<SendMessageRequest>,
) -> Json<Value> {
    // 参数校验
    let msg_type = match body.msg_type.as_str() {
        "notice" | "message" | "email" => body.msg_type.clone(),
        _ => return Json(json!({"success": false, "message": "无效消息类型，仅支持 notice / message / email"})),
    };
    if body.title.trim().is_empty() {
        return Json(json!({"success": false, "message": "标题不能为空"}));
    }
    if body.content.trim().is_empty() {
        return Json(json!({"success": false, "message": "内容不能为空"}));
    }

    let sender_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效管理员 ID"})),
    };

    let target_type = if msg_type == "notice" {
        "all".to_string()
    } else {
        body.target_type.clone().unwrap_or_else(|| "all".to_string())
    };

    // single 类型：优先用 email 查找商户 id，其次用 target_id
    let resolved_target_id: Option<Uuid> = if target_type == "single" {
        if let Some(ref email) = body.target_email {
            // 按 email_hash 查找商户
            let email_hash = crate::db::encrypted_fields::EncryptedFieldsOps::generate_hash(email);
            let row: Option<(Uuid,)> = sqlx::query_as(
                "SELECT id FROM merchants WHERE email_hash = $1 AND status = 'active'",
            )
            .bind(&email_hash)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);
            match row {
                Some((id,)) => Some(id),
                None => return Json(json!({"success": false, "message": "未找到该邮箱对应的商户"})),
            }
        } else if let Some(id) = body.target_id {
            Some(id)
        } else {
            return Json(json!({"success": false, "message": "单发消息必须指定商户邮箱或 ID"}));
        }
    } else {
        None
    };

    let pinned = body.pinned.unwrap_or(false);
    let reward_amount = if msg_type == "notice" { body.reward_amount.unwrap_or(0.0).max(0.0) } else { 0.0 };
    let expires_at: Option<chrono::DateTime<chrono::Utc>> = body
        .expires_at
        .as_deref()
        .and_then(|s| s.parse().ok());
    if msg_type == "email" {
        match load_mailer_config(&state.pool).await {
            Ok(cfg) => {
                let mut sent = 0u64;
                if target_type == "all" {
                    let rows: Vec<(String,)> = sqlx::query_as("SELECT email_encrypted FROM merchants WHERE status='active'").fetch_all(&state.pool).await.unwrap_or_default();
                    for (enc_email,) in rows {
                        if let Ok(email) = crate::db::encrypted_fields::EncryptedFieldsOps::decrypt_merchant_email(&state.encryptor, &enc_email) {
                            if send_custom_email(&cfg, &email, &body.title, &body.content).await.is_ok() { sent += 1; }
                        }
                    }
                } else if let Some(ref email) = body.target_email {
                    send_custom_email(&cfg, email, &body.title, &body.content).await.map_err(|e| tracing::warn!("邮件发送失败 {}: {}", email, e)).ok();
                    sent = 1;
                }
                let _ = sqlx::query(
                    "INSERT INTO messages (type, title, content, sender_id, target_type, target_id, pinned, reward_amount, expires_at)
                     VALUES ('email', $1, $2, $3, $4, $5, false, 0, NULL)"
                )
                .bind(&body.title)
                .bind(&body.content)
                .bind(sender_id)
                .bind(&target_type)
                .bind(resolved_target_id)
                .execute(&state.pool)
                .await;
                return Json(json!({"success": true, "message": format!("邮件已发送 {} 封", sent), "data": {"sent": sent}}));
            }
            Err(e) => return Json(json!({"success": false, "message": e.to_string()})),
        }
    }

    let row: Result<(Uuid,), _> = sqlx::query_as(
        "INSERT INTO messages (type, title, content, sender_id, target_type, target_id, pinned, reward_amount, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id",
    )
    .bind(&msg_type)
    .bind(&body.title)
    .bind(&body.content)
    .bind(sender_id)
    .bind(&target_type)
    .bind(resolved_target_id)
    .bind(pinned)
    .bind(reward_amount)
    .bind(expires_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok((new_id,)) => {
            // 通过 WebSocket 实时推送
            let ws_payload = json!({
                "event": "new_message",
                "data": {
                    "id": new_id,
                    "type": msg_type,
                    "title": body.title,
                    "target_type": target_type,
                }
            })
            .to_string();

            let ws = state.ws_registry.clone();
            match target_type.as_str() {
                "all" => {
                    ws.broadcast(WsMessage::Text(ws_payload.into())).await;
                }
                "single" => {
                    if let Some(tid) = resolved_target_id {
                        ws.send_to(&tid, WsMessage::Text(ws_payload.into())).await;
                    }
                }
                _ => {}
            }

            Json(json!({"success": true, "message": "发送成功", "data": {"id": new_id}}))
        }
        Err(e) => Json(json!({"success": false, "message": format!("发送失败: {}", e)})),
    }
}

// ── 管理员：查询消息列表 ──────────────────────────────────────────────────────

async fn admin_list_messages(
    State(state): State<AppState>,
    Query(q): Query<MessageListQuery>,
) -> Json<Value> {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let (total, rows): ((i64,), Vec<Msg>) = if let Some(ref t) = q.msg_type {
        let total = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM messages WHERE type = $1",
        )
        .bind(t)
        .fetch_one(&state.pool)
        .await
        .unwrap_or((0,));

        let rows = sqlx::query_as::<_, Msg>(
            "SELECT * FROM messages WHERE type = $1 ORDER BY pinned DESC, created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(t)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
        (total, rows)
    } else {
        let total = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM messages WHERE type IN ('notice', 'message')")
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));
        let rows = sqlx::query_as::<_, Msg>(
            "SELECT * FROM messages WHERE type IN ('notice', 'message') ORDER BY pinned DESC, created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
        (total, rows)
    };

    // 查询每条消息的已读数
    let views: Vec<MessageAdminView> = {
        let mut out = Vec::with_capacity(rows.len());
        for m in rows {
            let read_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM message_reads WHERE message_id = $1",
            )
            .bind(m.id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));
            out.push(MessageAdminView {
                id: m.id,
                msg_type: m.msg_type,
                title: m.title,
                content: m.content,
                sender_id: m.sender_id,
                target_type: m.target_type,
                target_id: m.target_id,
                pinned: m.pinned,
                reward_amount: m.reward_amount,
                expires_at: m.expires_at,
                read_count: read_count.0,
                created_at: m.created_at,
            });
        }
        out
    };

    Json(json!({
        "success": true,
        "data": views,
        "total": total.0,
        "page": page,
        "page_size": page_size,
    }))
}

// ── 管理员：编辑消息 ──────────────────────────────────────────────────────────

async fn admin_update_message(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMessageRequest>,
) -> Json<Value> {
    // 检查消息是否存在
    let exists: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM messages WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);
    if exists.is_none() {
        return Json(json!({"success": false, "message": "消息不存在"}));
    }

    let expires_at: Option<chrono::DateTime<chrono::Utc>> = body
        .expires_at
        .as_deref()
        .and_then(|s| s.parse().ok());
    let result = sqlx::query(
        "UPDATE messages SET
            title      = COALESCE($1, title),
            content    = COALESCE($2, content),
            pinned     = COALESCE($3, pinned),
            expires_at = COALESCE($4, expires_at),
            updated_at = NOW()
         WHERE id = $5",
    )
    .bind(body.title)
    .bind(body.content)
    .bind(body.pinned)
    .bind(expires_at)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(json!({"success": true, "message": "更新成功"})),
        Err(e) => Json(json!({"success": false, "message": format!("更新失败: {}", e)})),
    }
}

// ── 管理员：删除消息 ──────────────────────────────────────────────────────────

async fn admin_delete_message(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<Value> {
    let result = sqlx::query("DELETE FROM messages WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(json!({"success": true, "message": "删除成功"})),
        Ok(_) => Json(json!({"success": false, "message": "消息不存在"})),
        Err(e) => Json(json!({"success": false, "message": format!("删除失败: {}", e)})),
    }
}

// ── 商户：公告列表 ────────────────────────────────────────────────────────────

async fn merchant_list_notices(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<MessageListQuery>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };

    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM messages
         WHERE type = 'notice'
           AND (expires_at IS NULL OR expires_at > NOW())",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    let rows: Vec<Msg> = sqlx::query_as(
        "SELECT * FROM messages
         WHERE type = 'notice'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY pinned DESC, created_at DESC
         LIMIT $1 OFFSET $2",
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    // 批量查询已读状态
    let message_ids: Vec<Uuid> = rows.iter().map(|m| m.id).collect();
    let read_ids: Vec<(Uuid, Option<chrono::DateTime<chrono::Utc>>)> = if message_ids.is_empty() {
        vec![]
    } else {
        sqlx::query_as(
            "SELECT message_id, reward_claimed_at FROM message_reads
             WHERE merchant_id = $1 AND message_id = ANY($2)",
        )
        .bind(merchant_id)
        .bind(&message_ids)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    };
    let read_set: std::collections::HashSet<Uuid> = read_ids.iter().map(|(id, _)| *id).collect();
    let reward_claimed_set: std::collections::HashSet<Uuid> = read_ids.into_iter().filter_map(|(id, claimed_at)| claimed_at.map(|_| id)).collect();

    let views: Vec<MessageMerchantView> = rows
        .into_iter()
        .map(|m| {
            let is_read = read_set.contains(&m.id);
            MessageMerchantView {
                id: m.id,
                msg_type: m.msg_type,
                title: m.title,
                content: m.content,
                target_type: m.target_type,
                pinned: m.pinned,
                reward_amount: m.reward_amount,
                expires_at: m.expires_at,
                is_read,
                reward_claimed: reward_claimed_set.contains(&m.id),
                created_at: m.created_at,
            }
        })
        .collect();

    Json(json!({
        "success": true,
        "data": views,
        "total": total.0,
        "page": page,
        "page_size": page_size,
    }))
}

// ── 商户：站内信列表 ──────────────────────────────────────────────────────────

async fn merchant_list_messages(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<MessageListQuery>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };

    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 查询：全体广播 + 发给自己的单发消息
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM messages
         WHERE type = 'message'
           AND (target_type = 'all' OR (target_type = 'single' AND target_id = $1))",
    )
    .bind(merchant_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    let rows: Vec<Msg> = sqlx::query_as(
        "SELECT * FROM messages
         WHERE type = 'message'
           AND (target_type = 'all' OR (target_type = 'single' AND target_id = $1))
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(merchant_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    // 批量查询已读状态
    let message_ids: Vec<Uuid> = rows.iter().map(|m| m.id).collect();
    let read_ids: Vec<(Uuid, Option<chrono::DateTime<chrono::Utc>>)> = if message_ids.is_empty() {
        vec![]
    } else {
        sqlx::query_as(
            "SELECT message_id, reward_claimed_at FROM message_reads
             WHERE merchant_id = $1 AND message_id = ANY($2)",
        )
        .bind(merchant_id)
        .bind(&message_ids)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    };
    let read_set: std::collections::HashSet<Uuid> = read_ids.iter().map(|(id, _)| *id).collect();
    let reward_claimed_set: std::collections::HashSet<Uuid> = read_ids.into_iter().filter_map(|(id, claimed_at)| claimed_at.map(|_| id)).collect();

    let views: Vec<MessageMerchantView> = rows
        .into_iter()
        .map(|m| {
            let is_read = read_set.contains(&m.id);
            MessageMerchantView {
                id: m.id,
                msg_type: m.msg_type,
                title: m.title,
                content: m.content,
                target_type: m.target_type,
                pinned: m.pinned,
                reward_amount: m.reward_amount,
                expires_at: m.expires_at,
                is_read,
                reward_claimed: reward_claimed_set.contains(&m.id),
                created_at: m.created_at,
            }
        })
        .collect();

    Json(json!({
        "success": true,
        "data": views,
        "total": total.0,
        "page": page,
        "page_size": page_size,
    }))
}

// ── 商户：未读数 ──────────────────────────────────────────────────────────────

async fn merchant_unread_count(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };

    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM messages
         WHERE (
             (type = 'notice' AND (expires_at IS NULL OR expires_at > NOW()))
             OR
             (type = 'message' AND (target_type = 'all' OR (target_type = 'single' AND target_id = $1)))
         )
           AND id NOT IN (
               SELECT message_id FROM message_reads WHERE merchant_id = $1
           )",
    )
    .bind(merchant_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    Json(json!({"success": true, "data": {"unread": count.0}}))
}


async fn merchant_mark_all_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };

    let result = sqlx::query(
        "INSERT INTO message_reads (message_id, merchant_id)
         SELECT id, $1 FROM messages
         WHERE (
             (type = 'notice' AND (expires_at IS NULL OR expires_at > NOW()))
             OR
             (type = 'message' AND (target_type = 'all' OR (target_type = 'single' AND target_id = $1)))
         )
         ON CONFLICT (message_id, merchant_id) DO NOTHING",
    )
    .bind(merchant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(done) => Json(json!({"success": true, "message": "已全部阅读", "data": {"marked": done.rows_affected()}})),
        Err(e) => Json(json!({"success": false, "message": format!("操作失败: {}", e)})),
    }
}

// ── 商户：标记已读 ────────────────────────────────────────────────────────────

async fn merchant_mark_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };

    // 幂等 upsert：重复标记不报错
    let result = sqlx::query(
        "INSERT INTO message_reads (message_id, merchant_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, merchant_id) DO NOTHING",
    )
    .bind(id)
    .bind(merchant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(json!({"success": true, "message": "已标记已读"})),
        Err(e) => Json(json!({"success": false, "message": format!("操作失败: {}", e)})),
    }
}


// ── 商户：领取公告余额奖励 ────────────────────────────────────────────────────
async fn merchant_claim_reward(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<Value> {
    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(json!({"success": false, "message": "无效用户 ID"})),
    };
    let reward: Option<(f64,)> = sqlx::query_as(
        "SELECT COALESCE(reward_amount,0)::float8 FROM messages WHERE id=$1 AND type='notice' AND (expires_at IS NULL OR expires_at > NOW())"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let amount = match reward {
        Some((v,)) if v > 0.0 => v,
        Some(_) => return Json(json!({"success": false, "message": "该公告没有可领取奖励"})),
        None => return Json(json!({"success": false, "message": "公告不存在或已过期"})),
    };

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return Json(json!({"success": false, "message": format!("领取失败: {}", e)})),
    };

    let inserted = sqlx::query(
        "INSERT INTO message_reads (message_id, merchant_id, reward_claimed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (message_id, merchant_id) DO UPDATE
         SET reward_claimed_at = CASE WHEN message_reads.reward_claimed_at IS NULL THEN NOW() ELSE message_reads.reward_claimed_at END
         WHERE message_reads.reward_claimed_at IS NULL"
    )
    .bind(id)
    .bind(merchant_id)
    .execute(&mut *tx)
    .await;

    let rows = match inserted {
        Ok(r) => r.rows_affected(),
        Err(e) => { let _ = tx.rollback().await; return Json(json!({"success": false, "message": format!("领取失败: {}", e)})); }
    };
    if rows == 0 {
        let _ = tx.rollback().await;
        return Json(json!({"success": false, "message": "奖励已领取过"}));
    }

    let balance = sqlx::query_as::<_, (f64,)>(
        "UPDATE merchants SET balance = COALESCE(balance,0) + $1, updated_at = NOW() WHERE id=$2 RETURNING balance::float8"
    )
    .bind(amount)
    .bind(merchant_id)
    .fetch_one(&mut *tx)
    .await;
    let new_balance = match balance {
        Ok((b,)) => b,
        Err(e) => { let _ = tx.rollback().await; return Json(json!({"success": false, "message": format!("领取失败: {}", e)})); }
    };
    let _ = sqlx::query("INSERT INTO balance_records (merchant_id, amount, balance_after, record_type, description, created_at) VALUES ($1,$2,$3,'notice_reward','公告领取奖励',NOW())")
        .bind(merchant_id)
        .bind(amount)
        .bind(new_balance)
        .execute(&mut *tx)
        .await;
    if let Err(e) = tx.commit().await {
        return Json(json!({"success": false, "message": format!("领取失败: {}", e)}));
    }
    Json(json!({"success": true, "message": format!("已领取 {:.2} 元余额", amount), "data": {"amount": amount, "balance": new_balance}}))
}
// ── WebSocket 升级端点 ────────────────────────────────────────────────────────
//
// 连接方式：ws://host /ws/messages?token=<JWT>
// 前端在 query string 传入 access token，后端验证后注册连接

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<std::collections::HashMap<String, String>>,
    State(state): State<AppState>,
) -> impl axum::response::IntoResponse {
    // 从 query string 取 token 并验证
    let token = params.get("token").cloned().unwrap_or_default();
    let claims = match crate::utils::jwt::verify_token(&token, &state.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                "无效或过期的 Token",
            )
                .into_response();
        }
    };

    // 仅商户角色允许接入 WS
    if claims.role != "merchant" {
        return (
            axum::http::StatusCode::FORBIDDEN,
            "仅商户可连接消息 WebSocket",
        )
            .into_response();
    }

    let merchant_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                "无效用户 ID",
            )
                .into_response();
        }
    };

    ws.on_upgrade(move |socket| handle_ws(socket, merchant_id, state.ws_registry))
        .into_response()
}

/// 处理单个 WebSocket 连接的生命周期
async fn handle_ws(socket: WebSocket, merchant_id: Uuid, registry: WsRegistry) {
    use std::sync::Arc;
    use tokio::sync::Mutex;

    let (ws_tx, mut ws_rx) = socket.split();
    // 用 Arc<Mutex> 包裹 sink，使两个 task 均可访问
    let ws_tx = Arc::new(Mutex::new(ws_tx));

    // 注册连接，获取内部消息接收端
    let mut msg_rx = registry.register(merchant_id).await;
    let registry_for_cleanup = registry.clone();

    // 发送在线确认帧
    let hello = serde_json::json!({"event": "connected", "merchant_id": merchant_id}).to_string();
    if ws_tx.lock().await.send(WsMessage::Text(hello.into())).await.is_err() {
        return;
    }

    let tx_a = ws_tx.clone();
    let task_a = async move {
        while let Some(msg) = msg_rx.recv().await {
            if tx_a.lock().await.send(msg).await.is_err() {
                break;
            }
        }
    };

    let tx_b = ws_tx.clone();
    let task_b = async move {
        while let Some(Ok(msg)) = ws_rx.next().await {
            match msg {
                WsMessage::Close(_) => break,
                WsMessage::Ping(data) => {
                    let _ = tx_b.lock().await.send(WsMessage::Pong(data)).await;
                }
                _ => {}
            }
        }
    };

    tokio::select! {
        _ = task_a => {}
        _ = task_b => {}
    }

    registry_for_cleanup.cleanup_dead_pub(merchant_id).await;
}