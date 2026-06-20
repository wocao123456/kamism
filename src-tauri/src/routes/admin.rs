use crate::{db::encrypted_fields::EncryptedFieldsOps,middleware::auth::{admin_only,auth_middleware,AppState},models::merchant::MerchantPublic,utils::mq};
use axum::{extract::{Path,Query,State},middleware,routing::{get,post,patch,delete},Json,Router};
use redis::AsyncCommands;
use serde::Deserialize;
use serde_json::{json,Value};
use uuid::Uuid;

#[derive(Deserialize)] pub struct MerchantQuery { pub page:Option<i64>,pub page_size:Option<i64>,pub keyword:Option<String>,pub plan:Option<String> }
#[derive(Deserialize)] pub struct BlacklistQuery { pub page:Option<i64>,pub page_size:Option<i64>,pub tp:Option<String> }
#[derive(Deserialize)] pub struct AddBlacklistRequest { pub tp:String,pub value:String,pub reason:Option<String> }
#[derive(Deserialize)] pub struct AddWhitelistRequest { pub tp:String,pub value:String,pub reason:Option<String> }
#[derive(Deserialize)] pub struct SaveSettingsRequest { pub key:String,pub value:Value }
#[derive(Deserialize)] pub struct GrantMerchantBalanceRequest { pub amount:f64, pub note:Option<String>, pub target_type:Option<String>, pub target_email:Option<String> }
#[derive(Deserialize)] pub struct GrantMerchantPlanRequest { pub plan:String, pub expires_days:Option<i64>, pub target_type:Option<String>, pub target_email:Option<String> }
#[derive(Deserialize)] pub struct OpLogQuery { pub page:Option<i64>,pub page_size:Option<i64> }

pub fn admin_router_with_state(state:AppState)->Router<AppState>{
    Router::new()
        .route("/admin/merchants",get(list_merchants))
        .route("/admin/merchants/:id/status",patch(update_merchant_status))
        .route("/admin/merchants/:id/plan",patch(update_merchant_plan))
        .route("/admin/merchants/grant-balance",post(grant_merchant_balance_scoped))
        .route("/admin/merchants/grant-plan",post(grant_merchant_plan_scoped))
        .route("/admin/merchants/:id/grant-balance",post(grant_merchant_balance))
        .route("/admin/merchants/:id/grant-plan",post(grant_merchant_plan))
        .route("/admin/stats",get(get_stats))
        .route("/admin/blacklist",get(list_blacklist).post(add_blacklist))
        .route("/admin/blacklist/:id",delete(remove_blacklist))
        .route("/admin/blacklist/stats",get(blacklist_stats))
        .route("/admin/whitelist",get(list_whitelist).post(add_whitelist))
        .route("/admin/whitelist/:id",delete(remove_whitelist))
        .route("/admin/whitelist/stats",get(whitelist_stats))
        .route("/admin/alerts",get(list_alerts))
        .route("/admin/alerts/:id/read",patch(mark_alert_read))
        .route("/admin/alerts/:id",delete(delete_alert))
        .route("/admin/alerts/stats",get(alert_stats))
        .route("/admin/risk-settings",get(get_risk_settings).post(save_risk_settings))
        .route("/admin/op-logs",get(op_logs))
        .route("/admin/frontend-log",post(frontend_log))
        .route_layer(middleware::from_fn(admin_only))
        .route_layer(middleware::from_fn_with_state(state,auth_middleware))
}

async fn list_merchants(State(state):State<AppState>,Query(q):Query<MerchantQuery>)->Json<Value>{
    let page=q.page.unwrap_or(1).max(1);let page_size=q.page_size.unwrap_or(20).min(100);let offset=(page-1)*page_size;
    let keyword=q.keyword.unwrap_or_default();let like=format!("%{}%",keyword);let plan_filter=q.plan.as_deref().unwrap_or("");
    let(total,merchants)=if plan_filter.is_empty(){
        let total:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM merchants WHERE username ILIKE $1").bind(&like).fetch_one(&state.pool).await.unwrap_or((0,));
        let rows:Vec<crate::models::merchant::Merchant>=sqlx::query_as("SELECT * FROM merchants WHERE username ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3").bind(&like).bind(page_size).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        (total.0,rows)
    }else{
        let total:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM merchants WHERE username ILIKE $1 AND plan=$2").bind(&like).bind(plan_filter).fetch_one(&state.pool).await.unwrap_or((0,));
        let rows:Vec<crate::models::merchant::Merchant>=sqlx::query_as("SELECT * FROM merchants WHERE username ILIKE $1 AND plan=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4").bind(&like).bind(plan_filter).bind(page_size).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        (total.0,rows)
    };
    let public:Vec<MerchantPublic>=merchants.into_iter().map(|mut m|{
        if let Ok(p)=EncryptedFieldsOps::decrypt_merchant_email(&state.encryptor,&m.email){m.email=p}else{tracing::warn!("email decrypt fail {}",m.id);}
        if let Ok(p)=EncryptedFieldsOps::decrypt_merchant_api_key(&state.encryptor,&m.api_key){m.api_key=p}else{tracing::warn!("api_key decrypt fail {}",m.id);}
        m.into()
    }).collect();
    Json(json!({"success":true,"data":public,"total":total,"page":page,"page_size":page_size}))
}

async fn update_merchant_status(State(state):State<AppState>,Path(id):Path<Uuid>,Json(body):Json<Value>)->Json<Value>{
    let status=match body.get("status").and_then(|s|s.as_str()){Some(s)if s=="active"||s=="disabled"=>s.to_string(),_=>return Json(json!({"success":false,"message":"无效状态"}))};
    match sqlx::query("UPDATE merchants SET status=$1,updated_at=NOW() WHERE id=$2").bind(&status).bind(id).execute(&state.pool).await{
        Ok(_)=>Json(json!({"success":true,"message":"状态已更新"})),Err(e)=>Json(json!({"success":false,"message":format!("更新失败:{}",e)}))
    }
}

async fn update_merchant_plan(State(state):State<AppState>,Path(id):Path<Uuid>,Json(body):Json<Value>)->Json<Value>{
    let plan=match body.get("plan").and_then(|s|s.as_str()){Some(s) if !s.trim().is_empty()=>s.trim().to_string(),_=>return Json(json!({"success":false,"message":"无效套餐"}))};
    let plan_row: Option<(String,)> = sqlx::query_as("SELECT label FROM plan_configs WHERE plan=$1 AND is_active=true").bind(&plan).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((plan_label,)) = plan_row else { return Json(json!({"success":false,"message":"套餐不存在或已停用"})); };
    let expires_days=body.get("expires_days").and_then(|v|v.as_i64());
    let result=if plan!="free"{match expires_days{Some(d)if d>0=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=NOW()+($2||' days')::INTERVAL,updated_at=NOW() WHERE id=$3").bind(&plan).bind(d.to_string()).bind(id).execute(&state.pool).await,_=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=NULL,updated_at=NOW() WHERE id=$2").bind(&plan).bind(id).execute(&state.pool).await}}
    else{sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=NULL,updated_at=NOW() WHERE id=$2").bind(&plan).bind(id).execute(&state.pool).await};
    match result{Ok(r)if r.rows_affected()>0=>{let msg=if plan!="free"{if let Err(e)=mq::publish_upgrade(&state.mq_channel,&id.to_string()).await{tracing::error!("mq upgrade fail {}:{}",id,e);}match expires_days{Some(d)if d>0=>format!("已升级为{}，有效期{}天",plan_label,d),_=>format!("已升级为{}（永久）",plan_label)}}else{"已降级为免费版".to_string()};Json(json!({"success":true,"message":msg}))},Ok(_)=>Json(json!({"success":false,"message":"商户不存在"})),Err(e)=>Json(json!({"success":false,"message":format!("更新失败:{}",e)}))}
}



async fn resolve_merchant_id_by_email(state:&AppState,email:&str)->Result<Uuid,String>{
    let email_hash=EncryptedFieldsOps::generate_hash(email.trim());
    let row:Option<(Uuid,)>=sqlx::query_as("SELECT id FROM merchants WHERE email_hash=$1 AND status='active'").bind(email_hash).fetch_optional(&state.pool).await.map_err(|e|format!("查询商户失败:{}",e))?;
    row.map(|x|x.0).ok_or_else(||"未找到该邮箱对应的正常商户".to_string())
}
async fn grant_merchant_balance_scoped(State(state):State<AppState>,Json(body):Json<GrantMerchantBalanceRequest>)->Json<Value>{
    let amount=body.amount;
    if !amount.is_finite() || amount<=0.0 { return Json(json!({"success":false,"message":"请输入大于 0 的赠送金额"})); }
    let note="系统赠送余额".to_string();
    let target_type=body.target_type.as_deref().unwrap_or("single");
    if target_type=="all"{
        let mut tx=match state.pool.begin().await{Ok(t)=>t,Err(e)=>return Json(json!({"success":false,"message":format!("操作失败:{}",e)}))};
        let updated=sqlx::query("UPDATE merchants SET balance=COALESCE(balance,0)+$1,updated_at=NOW() WHERE status='active'").bind(amount).execute(&mut *tx).await;
        let count=match updated{Ok(r)=>r.rows_affected(),Err(e)=>{let _=tx.rollback().await;return Json(json!({"success":false,"message":format!("赠送失败:{}",e)}));}};
        if let Err(e)=sqlx::query("INSERT INTO balance_records (merchant_id, amount, balance_after, record_type, description, created_at) SELECT id,$1,COALESCE(balance,0),'system_balance_grant',$2,NOW() FROM merchants WHERE status='active'").bind(amount).bind(&note).execute(&mut *tx).await{let _=tx.rollback().await;return Json(json!({"success":false,"message":format!("写入流水失败:{}",e)}));}
        if let Err(e)=tx.commit().await{return Json(json!({"success":false,"message":format!("提交失败:{}",e)}));}
        return Json(json!({"success":true,"message":format!("已给 {} 个商户赠送余额 ¥{:.2}",count,amount),"data":{"count":count}}));
    }
    let Some(email)=body.target_email.as_deref().filter(|x|!x.trim().is_empty()) else {return Json(json!({"success":false,"message":"指定赠送请输入商户邮箱"}));};
    let id=match resolve_merchant_id_by_email(&state,email).await{Ok(id)=>id,Err(msg)=>return Json(json!({"success":false,"message":msg}))};
    grant_merchant_balance(State(state),Path(id),Json(GrantMerchantBalanceRequest{amount,note:Some(note),target_type:None,target_email:None})).await
}
async fn grant_merchant_plan_scoped(State(state):State<AppState>,Json(body):Json<GrantMerchantPlanRequest>)->Json<Value>{
    let plan=body.plan.trim().to_string();
    if plan.is_empty(){return Json(json!({"success":false,"message":"请选择套餐"}));}
    let plan_row:Option<(String,)>=sqlx::query_as("SELECT label FROM plan_configs WHERE plan=$1 AND is_active=true").bind(&plan).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((label,))=plan_row else{return Json(json!({"success":false,"message":"套餐不存在或已停用"}));};
    let target_type=body.target_type.as_deref().unwrap_or("single");
    if target_type=="all"{
        let result=match body.expires_days{Some(d) if d>0=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=GREATEST(COALESCE(plan_expires_at,NOW()),NOW())+($2||' days')::INTERVAL,updated_at=NOW() WHERE status='active'").bind(&plan).bind(d.to_string()).execute(&state.pool).await,_=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=NULL,updated_at=NOW() WHERE status='active'").bind(&plan).execute(&state.pool).await};
        return match result{Ok(r)=>{ let desc=match body.expires_days{Some(d) if d>0=>format!("系统赠送套餐：{}，叠加{}天",label,d),_=>format!("系统赠送套餐：{}（永久）",label)}; let _=sqlx::query("INSERT INTO balance_records (merchant_id, amount, balance_after, record_type, description, created_at) SELECT id,0,COALESCE(balance,0),'system_plan_grant',$1,NOW() FROM merchants WHERE status='active'").bind(&desc).execute(&state.pool).await; Json(json!({"success":true,"message":match body.expires_days{Some(d) if d>0=>format!("已给 {} 个商户赠送{}，叠加{}天",r.rows_affected(),label,d),_=>format!("已给 {} 个商户赠送{}（永久）",r.rows_affected(),label)}}))},Err(e)=>Json(json!({"success":false,"message":format!("赠送失败:{}",e)}))};
    }
    let Some(email)=body.target_email.as_deref().filter(|x|!x.trim().is_empty()) else {return Json(json!({"success":false,"message":"指定赠送请输入商户邮箱"}));};
    let id=match resolve_merchant_id_by_email(&state,email).await{Ok(id)=>id,Err(msg)=>return Json(json!({"success":false,"message":msg}))};
    { let res=grant_merchant_plan(State(state.clone()),Path(id),Json(GrantMerchantPlanRequest{plan:plan.clone(),expires_days:body.expires_days,target_type:None,target_email:None})).await; let desc=match body.expires_days{Some(d) if d>0=>format!("系统赠送套餐：{}，叠加{}天",label,d),_=>format!("系统赠送套餐：{}（永久）",label)}; let _=sqlx::query("INSERT INTO balance_records (merchant_id, amount, balance_after, record_type, description, created_at) SELECT id,0,COALESCE(balance,0),'system_plan_grant',$2,NOW() FROM merchants WHERE id=$1").bind(id).bind(desc).execute(&state.pool).await; res }
}

async fn grant_merchant_balance(State(state):State<AppState>,Path(id):Path<Uuid>,Json(body):Json<GrantMerchantBalanceRequest>)->Json<Value>{
    let amount=body.amount;
    if !amount.is_finite() || amount<=0.0 { return Json(json!({"success":false,"message":"请输入大于 0 的赠送金额"})); }
    let note="系统赠送余额".to_string();
    let mut tx=match state.pool.begin().await{Ok(t)=>t,Err(e)=>return Json(json!({"success":false,"message":format!("操作失败:{}",e)}))};
    let row=sqlx::query_as::<_,(f64,)>("UPDATE merchants SET balance=COALESCE(balance,0)+$1,updated_at=NOW() WHERE id=$2 RETURNING balance::float8").bind(amount).bind(id).fetch_optional(&mut *tx).await;
    let new_balance=match row{Ok(Some((b,)))=>b,Ok(None)=>{let _=tx.rollback().await;return Json(json!({"success":false,"message":"商户不存在"}));},Err(e)=>{let _=tx.rollback().await;return Json(json!({"success":false,"message":format!("赠送失败:{}",e)}));}};
    if let Err(e)=sqlx::query("INSERT INTO balance_records (merchant_id, amount, balance_after, record_type, description, created_at) VALUES ($1,$2,$3,'system_balance_grant',$4,NOW())")
        .bind(id).bind(amount).bind(new_balance).bind(&note).execute(&mut *tx).await{let _=tx.rollback().await;return Json(json!({"success":false,"message":format!("写入流水失败:{}",e)}));}
    if let Err(e)=tx.commit().await{return Json(json!({"success":false,"message":format!("提交失败:{}",e)}));}
    Json(json!({"success":true,"message":format!("已赠送余额 ¥{:.2}",amount),"data":{"balance":new_balance}}))
}
async fn grant_merchant_plan(State(state):State<AppState>,Path(id):Path<Uuid>,Json(body):Json<GrantMerchantPlanRequest>)->Json<Value>{
    let plan=body.plan.trim().to_string();
    if plan.is_empty(){return Json(json!({"success":false,"message":"请选择套餐"}));}
    let plan_row:Option<(String,)>=sqlx::query_as("SELECT label FROM plan_configs WHERE plan=$1 AND is_active=true").bind(&plan).fetch_optional(&state.pool).await.unwrap_or(None);
    let Some((label,))=plan_row else{return Json(json!({"success":false,"message":"套餐不存在或已停用"}));};
    let result=match body.expires_days{Some(d) if d>0=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=GREATEST(COALESCE(plan_expires_at,NOW()),NOW())+($2||' days')::INTERVAL,updated_at=NOW() WHERE id=$3").bind(&plan).bind(d.to_string()).bind(id).execute(&state.pool).await,_=>sqlx::query("UPDATE merchants SET plan=$1,plan_expires_at=NULL,updated_at=NOW() WHERE id=$2").bind(&plan).bind(id).execute(&state.pool).await};
    match result{Ok(r) if r.rows_affected()>0=>{let _=mq::publish_upgrade(&state.mq_channel,&id.to_string()).await;Json(json!({"success":true,"message":match body.expires_days{Some(d) if d>0=>format!("已赠送{}，叠加{}天",label,d),_=>format!("已赠送{}（永久）",label)}}))},Ok(_)=>Json(json!({"success":false,"message":"商户不存在"})),Err(e)=>Json(json!({"success":false,"message":format!("赠送失败:{}",e)}))}
}

async fn get_stats(State(state):State<AppState>)->Json<Value>{
    let m:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM merchants").fetch_one(&state.pool).await.unwrap_or((0,));
    let c:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM cards").fetch_one(&state.pool).await.unwrap_or((0,));
    let a:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activations").fetch_one(&state.pool).await.unwrap_or((0,));
    let ac:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM cards WHERE status='active'").fetch_one(&state.pool).await.unwrap_or((0,));
    let ap:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM apps").fetch_one(&state.pool).await.unwrap_or((0,));
    let recent:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activations WHERE created_at >= NOW() - INTERVAL '30 days'").fetch_one(&state.pool).await.unwrap_or((0,));
    // 近 7 天变化：优先用操作日志识别减少行为，删除后能显示红色负数；无删除时显示新增量。
    let delta_merchants:(i64,)=sqlx::query_as(r#"SELECT
        CASE WHEN SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END) > 0
          THEN -SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END)
          ELSE (SELECT COUNT(*) FROM merchants WHERE created_at >= NOW() - INTERVAL '7 days')
        END FROM operation_logs WHERE created_at >= NOW() - INTERVAL '7 days' AND module='商户管理'"#).fetch_one(&state.pool).await.unwrap_or((0,));
    let delta_activations:(i64,)=sqlx::query_as(r#"SELECT
        CASE WHEN SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END) > 0
          THEN -SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END)
          ELSE (SELECT COUNT(*) FROM activations WHERE created_at >= NOW() - INTERVAL '7 days')
        END FROM operation_logs WHERE created_at >= NOW() - INTERVAL '7 days' AND module IN ('激活管理','激活记录')"#).fetch_one(&state.pool).await.unwrap_or((0,));
    let delta_cards:(i64,)=sqlx::query_as(r#"SELECT
        CASE WHEN SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END) > 0
          THEN -SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END)
          ELSE (SELECT COUNT(*) FROM cards WHERE created_at >= NOW() - INTERVAL '7 days')
        END FROM operation_logs WHERE created_at >= NOW() - INTERVAL '7 days' AND module='卡密管理'"#).fetch_one(&state.pool).await.unwrap_or((0,));
    let delta_apps:(i64,)=sqlx::query_as(r#"SELECT
        CASE WHEN SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END) > 0
          THEN -SUM(CASE WHEN action IN ('delete','remove') THEN 1 ELSE 0 END)
          ELSE SUM(CASE WHEN action IN ('create','add') THEN 1 ELSE 0 END)
        END FROM operation_logs WHERE created_at >= NOW() - INTERVAL '7 days' AND module='应用管理'"#).fetch_one(&state.pool).await.unwrap_or((0,));
    let delta_merchants_safe = if delta_merchants.0 < 0 { delta_merchants.0.max(-m.0) } else { delta_merchants.0 };
    let delta_activations_safe = if delta_activations.0 < 0 { delta_activations.0.max(-recent.0) } else { delta_activations.0 };
    let delta_cards_safe = if delta_cards.0 < 0 { delta_cards.0.max(-c.0) } else { delta_cards.0 };
    let delta_apps_safe = if delta_apps.0 < 0 { delta_apps.0.max(-ap.0) } else { delta_apps.0 };
    let rows:Vec<(chrono::NaiveDate,i64,i64,i64,i64)>=sqlx::query_as(r#"
        WITH days AS (SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS d)
        SELECT d.d,
          (SELECT COUNT(*) FROM merchants m2 WHERE m2.created_at::date <= d.d) AS merchants_total,
          (SELECT COUNT(*) FROM activations a2 WHERE a2.created_at::date = d.d) AS activations_daily,
          (SELECT COUNT(*) FROM cards c2 WHERE c2.created_at::date <= d.d) AS cards_total,
          (SELECT COUNT(*) FROM apps ap2 WHERE ap2.created_at::date <= d.d) AS apps_total
        FROM days d ORDER BY d.d
    "#).fetch_all(&state.pool).await.unwrap_or_default();
    let trend:Vec<Value>=rows.into_iter().map(|(d,mm,aa,cc,apps)|json!({"date":d.to_string(),"merchants":mm,"activations":aa,"cards":cc,"apps":apps})).collect();
    Json(json!({"success":true,"data":{"merchants":m.0,"total_cards":c.0,"active_cards":ac.0,"total_activations":a.0,"recent_activations_30d":recent.0,"total_apps":ap.0,"deltas":{"merchants":delta_merchants_safe,"activations":delta_activations_safe,"cards":delta_cards_safe,"apps":delta_apps_safe},"trend":trend}}))
}

async fn list_blacklist(State(state):State<AppState>,Query(q):Query<BlacklistQuery>)->Json<Value>{
    let page=q.page.unwrap_or(1).max(1);let ps=q.page_size.unwrap_or(20).min(100);let offset=(page-1)*ps;let tp=q.tp.as_deref().unwrap_or("");
    let(total,rows):(i64,Vec<Value>)=if tp=="card"{
        let t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM card_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let d:Vec<(Uuid,String,Option<String>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,card_key,reason,created_at FROM card_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        (t.0,d.into_iter().map(|(id,ck,r,c)|json!({"id":id,"type":"card","value":ck,"reason":r,"blocked_until":null,"created_at":c})).collect())
    }else if tp=="device"{
        let t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM device_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let d:Vec<(Uuid,String,Option<String>,Option<String>,Option<chrono::DateTime<chrono::Utc>>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,device_id_hash,device_hint,reason,blocked_until,created_at FROM device_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        (t.0,d.into_iter().map(|(id,h,dh,r,b,c)|json!({"id":id,"type":"device","value":dh.unwrap_or_else(||format!("{}...",&h[..16])),"reason":r,"blocked_until":b,"created_at":c})).collect())
    }else if tp=="ip"{
        let t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM ip_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let d:Vec<(Uuid,String,Option<String>,Option<chrono::DateTime<chrono::Utc>>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,ip,reason,blocked_until,created_at FROM ip_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        (t.0,d.into_iter().map(|(id,ip,r,b,c)|json!({"id":id,"type":"ip","value":ip,"reason":r,"blocked_until":b,"created_at":c})).collect())
    }else{
        let ip_t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM ip_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let dev_t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM device_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let ip_rows:Vec<(Uuid,String,Option<String>,Option<chrono::DateTime<chrono::Utc>>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,ip,reason,blocked_until,created_at FROM ip_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        let dev_rows:Vec<(Uuid,String,Option<String>,Option<String>,Option<chrono::DateTime<chrono::Utc>>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,device_id_hash,device_hint,reason,blocked_until,created_at FROM device_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        let mut items:Vec<Value>=ip_rows.into_iter().map(|(id,ip,r,b,c)|json!({"id":id,"type":"ip","value":ip,"reason":r,"blocked_until":b,"created_at":c})).collect();
        items.extend(dev_rows.into_iter().map(|(id,h,dh,r,b,c)|json!({"id":id,"type":"device","value":dh.unwrap_or_else(||format!("{}...",&h[..16])),"reason":r,"blocked_until":b,"created_at":c})));
        let card_t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM card_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
        let card_rows:Vec<(Uuid,String,Option<String>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,card_key,reason,created_at FROM card_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
        items.extend(card_rows.into_iter().map(|(id,ck,r,c)|json!({"id":id,"type":"card","value":ck,"reason":r,"blocked_until":null,"created_at":c})));
        items.sort_by(|a,b|b["created_at"].as_str().cmp(&a["created_at"].as_str()));
        (ip_t.0+dev_t.0+card_t.0,items)
    };
    Json(json!({"success":true,"data":rows,"total":total,"page":page,"page_size":ps}))
}
async fn add_blacklist(State(state):State<AppState>,Json(body):Json<AddBlacklistRequest>)->Json<Value>{
    if body.tp=="ip"{
        let r=sqlx::query("INSERT INTO ip_blacklist(ip,reason) VALUES($1,$2) ON CONFLICT (COALESCE(merchant_id::text,'global'::text),ip) DO UPDATE SET reason=$2").bind(&body.value).bind(&body.reason).execute(&state.pool).await;
        match r{Ok(_)=>Json(json!({"success":true,"message":"已添加"})),Err(e)=>Json(json!({"success":false,"message":format!("添加失败:{}",e)}))}
    }else if body.tp=="card"{
        let r=sqlx::query("INSERT INTO card_blacklist(card_key,reason) VALUES($1,$2) ON CONFLICT (COALESCE(merchant_id::text,'global'::text),card_key) DO UPDATE SET reason=$2").bind(&body.value).bind(&body.reason).execute(&state.pool).await;
        match r{Ok(_)=>Json(json!({"success":true,"message":"已添加"})),Err(e)=>Json(json!({"success":false,"message":format!("添加失败:{}",e)}))}
    }else{
        let h=EncryptedFieldsOps::generate_hash(&body.value);
        let device_hint = if body.value.len() >= 4 { format!("{}****", &body.value[..4]) } else { "****".to_string() };
        let r=sqlx::query("INSERT INTO device_blacklist(device_id_hash,device_hint,reason) VALUES($1,$2,$3) ON CONFLICT (COALESCE(merchant_id::text,'global'::text),device_id_hash) DO UPDATE SET reason=$3").bind(&h).bind(&device_hint).bind(&body.reason).execute(&state.pool).await;
        match r{Ok(_)=>Json(json!({"success":true,"message":"已添加"})),Err(e)=>Json(json!({"success":false,"message":format!("添加失败:{}",e)}))}
    }
}
async fn remove_blacklist(State(state):State<AppState>,Path(id):Path<Uuid>)->Json<Value>{
    let _=sqlx::query("DELETE FROM ip_blacklist WHERE id=$1").bind(id).execute(&state.pool).await;
    let _=sqlx::query("DELETE FROM device_blacklist WHERE id=$1").bind(id).execute(&state.pool).await;
    let _=sqlx::query("DELETE FROM card_blacklist WHERE id=$1").bind(id).execute(&state.pool).await;
    Json(json!({"success":true,"message":"已移除"}))
}
async fn blacklist_stats(State(state):State<AppState>)->Json<Value>{
    let ip:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM ip_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
    let dev:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM device_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
    let card:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM card_blacklist").fetch_one(&state.pool).await.unwrap_or((0,));
    let ip_today:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM ip_blacklist WHERE created_at::date=CURRENT_DATE").fetch_one(&state.pool).await.unwrap_or((0,));
    let dev_today:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM device_blacklist WHERE created_at::date=CURRENT_DATE").fetch_one(&state.pool).await.unwrap_or((0,));
    let card_today:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM card_blacklist WHERE created_at::date=CURRENT_DATE").fetch_one(&state.pool).await.unwrap_or((0,));
    Json(json!({"success":true,"data":{"ip_total":ip.0,"dev_total":dev.0,"card_total":card.0,"ip_today":ip_today.0,"dev_today":dev_today.0,"card_today":card_today.0}}))
}

async fn list_whitelist(State(state):State<AppState>,Query(q):Query<BlacklistQuery>)->Json<Value>{
    let page=q.page.unwrap_or(1).max(1);let ps=q.page_size.unwrap_or(20).min(100);let offset=(page-1)*ps;let tp=q.tp.as_deref().unwrap_or("");
    let wc=if tp.is_empty(){String::new()}else{format!("WHERE type='{}'",tp)};
    let t:(i64,)=sqlx::query_as(&format!("SELECT COUNT(*) FROM whitelist {}",wc)).fetch_one(&state.pool).await.unwrap_or((0,));
    let d:Vec<(Uuid,String,String,Option<String>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as(&format!("SELECT id,type,value,reason,created_at FROM whitelist {} ORDER BY created_at DESC LIMIT $1 OFFSET $2",wc)).bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
    let list:Vec<Value>=d.into_iter().map(|(id,tp,val,r,c)|json!({"id":id,"type":tp,"value":val,"reason":r,"created_at":c})).collect();
    Json(json!({"success":true,"data":list,"total":t.0,"page":page,"page_size":ps}))
}
async fn add_whitelist(State(state):State<AppState>,Json(body):Json<AddWhitelistRequest>)->Json<Value>{
    let val=if body.tp=="device"{EncryptedFieldsOps::generate_hash(&body.value)}else{body.value.clone()};
    let _=sqlx::query("INSERT INTO whitelist(type,value,reason) VALUES($1,$2,$3) ON CONFLICT(type,value) DO UPDATE SET reason=$3").bind(&body.tp).bind(&val).bind(&body.reason).execute(&state.pool).await;
    Json(json!({"success":true,"message":"已添加"}))
}
async fn remove_whitelist(State(state):State<AppState>,Path(id):Path<Uuid>)->Json<Value>{
    let _=sqlx::query("DELETE FROM whitelist WHERE id=$1").bind(id).execute(&state.pool).await;
    Json(json!({"success":true,"message":"已移除"}))
}
async fn whitelist_stats(State(state):State<AppState>)->Json<Value>{
    let ip:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM whitelist WHERE type='ip'").fetch_one(&state.pool).await.unwrap_or((0,));
    let dev:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM whitelist WHERE type='device'").fetch_one(&state.pool).await.unwrap_or((0,));
    let card:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM whitelist WHERE type='card'").fetch_one(&state.pool).await.unwrap_or((0,));
    Json(json!({"success":true,"data":{"ip_total":ip.0,"dev_total":dev.0,"card_total":card.0}}))
}


async fn list_alerts(State(state):State<AppState>,Query(q):Query<BlacklistQuery>)->Json<Value>{
    let page=q.page.unwrap_or(1).max(1);let ps=q.page_size.unwrap_or(20).min(100);let offset=(page-1)*ps;
    let t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts").fetch_one(&state.pool).await.unwrap_or((0,));
    let d:Vec<(Uuid,String,Option<String>,Option<String>,Option<String>,bool,chrono::DateTime<chrono::Utc>)>=sqlx::query_as("SELECT id,alert_type,device_hint,ip_address,detail,is_read,created_at FROM activation_alerts ORDER BY created_at DESC LIMIT $1 OFFSET $2").bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
    let list:Vec<Value>=d.into_iter().map(|(id,at,dh,ip,det,rd,c)|json!({"id":id,"alert_type":at,"device_hint":dh,"ip_address":ip,"detail":det,"is_read":rd,"created_at":c})).collect();
    Json(json!({"success":true,"data":list,"total":t.0,"page":page,"page_size":ps}))
}
async fn mark_alert_read(State(state):State<AppState>,Path(id):Path<Uuid>)->Json<Value>{
    let _=sqlx::query("UPDATE activation_alerts SET is_read=true WHERE id=$1").bind(id).execute(&state.pool).await;Json(json!({"success":true}))
}
async fn delete_alert(State(state):State<AppState>,Path(id):Path<Uuid>)->Json<Value>{
    let _=sqlx::query("DELETE FROM activation_alerts WHERE id=$1").bind(id).execute(&state.pool).await;
    Json(json!({"success":true,"message":"已删除"}))
}
async fn alert_stats(State(state):State<AppState>)->Json<Value>{
    let severe:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts WHERE alert_type LIKE '%block%'").fetch_one(&state.pool).await.unwrap_or((0,));
    let warn:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts WHERE alert_type LIKE '%warn%'").fetch_one(&state.pool).await.unwrap_or((0,));
    let t:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts").fetch_one(&state.pool).await.unwrap_or((0,));
    let td:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts WHERE created_at::date=CURRENT_DATE").fetch_one(&state.pool).await.unwrap_or((0,));
    let ur:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM activation_alerts WHERE is_read=false").fetch_one(&state.pool).await.unwrap_or((0,));
    Json(json!({"success":true,"data":{"severe":severe.0,"warn":warn.0,"notice":t.0-severe.0-warn.0,"total":t.0,"today":td.0,"unread":ur.0}}))
}

async fn get_risk_settings(State(state):State<AppState>)->Json<Value>{
    let rows:Vec<(String,Value)>=sqlx::query_as("SELECT key,value FROM risk_settings").fetch_all(&state.pool).await.unwrap_or_default();
    let mut map=serde_json::Map::new();for(k,v) in rows{map.insert(k,v);}
    Json(json!({"success":true,"data":map}))
}
async fn save_risk_settings(State(state):State<AppState>,Json(body):Json<SaveSettingsRequest>)->Json<Value>{
    let _=sqlx::query("INSERT INTO risk_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()").bind(&body.key).bind(&body.value).execute(&state.pool).await;
    Json(json!({"success":true,"message":"保存成功"}))
}

async fn rate_stats(State(state):State<AppState>)->Json<Value>{
    let mut redis=state.redis.clone();
    let keys:Vec<String>=redis.keys("rate:card:*".to_string()).await.unwrap_or_default();
    let mut cards=Vec::new();
    for k in &keys{
        let count:i64=redis.get(k).await.unwrap_or(0);
        let hash=k.strip_prefix("rate:card:").unwrap_or("");
        cards.push(json!({"card_hash":hash,"count":count}));
    }
    Json(json!({"success":true,"data":{"cards":cards}}))
}

async fn op_logs(State(state):State<AppState>,Query(q):Query<OpLogQuery>)->Json<Value>{
    let page=q.page.unwrap_or(1).max(1);let ps=q.page_size.unwrap_or(10).min(50);let offset=(page-1)*ps;
    let total:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM operation_logs").fetch_one(&state.pool).await.unwrap_or((0,));
    let rows:Vec<(Uuid,String,Option<Uuid>,String,String,Option<String>,Option<String>,chrono::DateTime<chrono::Utc>)>=sqlx::query_as(
        "SELECT id,user_type,user_id,action,COALESCE(module,''),detail,ip_address,created_at FROM operation_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    ).bind(ps).bind(offset).fetch_all(&state.pool).await.unwrap_or_default();
    let list:Vec<Value>=rows.into_iter().map(|(id,ut,uid,action,module,detail,ip,created)|json!({
        "id":id,"user_type":ut,"user_id":uid,"action":action,"module":module,"detail":detail,
        "ip":ip,"created_at":created
    })).collect();
    Json(json!({"success":true,"data":list,"total":total.0,"page":page,"page_size":ps}))
}

async fn frontend_log(State(state):State<AppState>,Json(body):Json<serde_json::Value>)->Json<Value>{
    let action=body.get("action").and_then(|v|v.as_str()).unwrap_or("other");
    let module=body.get("module").and_then(|v|v.as_str()).unwrap_or("");
    let detail=body.get("detail").and_then(|v|v.as_str()).unwrap_or("");
    let user_type=body.get("user_type").and_then(|v|v.as_str()).unwrap_or("merchant");
    let user_id=body.get("user_id").and_then(|v|v.as_str()).and_then(|s|Uuid::parse_str(s).ok());
    crate::utils::op_log::log_operation(&state.pool, user_type, user_id, action, module, detail, "").await;
    Json(json!({"success":true}))
}