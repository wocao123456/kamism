use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlanConfig {
    pub id: Uuid,
    pub plan: String,
    pub label: String,
    pub max_apps: i32,
    pub max_cards: i32,
    pub max_devices: i32,
    pub max_gen_once: i32,
    #[sqlx(default)]
    pub description: String,
    #[sqlx(default)]
    pub price_month: rust_decimal::Decimal,
    #[sqlx(default)]
    pub price_quarter: rust_decimal::Decimal,
    #[sqlx(default)]
    pub price_year: rust_decimal::Decimal,
    #[sqlx(default)]
    pub pricing_options: Value,
    #[sqlx(default)]
    pub sort_order: i32,
    #[sqlx(default)]
    pub is_active: bool,
    pub updated_at: DateTime<Utc>,
}