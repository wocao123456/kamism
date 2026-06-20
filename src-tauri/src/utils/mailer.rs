use anyhow::{anyhow, Result};
use lettre::{
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

#[derive(Clone, Debug)]
pub struct MailerConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_pass: String,
    pub from_name: String,
    pub from_email: String,
}

impl MailerConfig {
    pub fn from_env() -> Self {
        Self {
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string()),
            smtp_port: std::env::var("SMTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(465),
            smtp_user: std::env::var("SMTP_USER").unwrap_or_default(),
            smtp_pass: std::env::var("SMTP_PASS").unwrap_or_default(),
            from_name: std::env::var("SMTP_FROM_NAME").unwrap_or_else(|_| "KamiSM".to_string()),
            from_email: std::env::var("SMTP_FROM_EMAIL").unwrap_or_default(),
        }
    }
}

fn get_icon_base64() -> String {
    let bytes = include_bytes!("../../icons/icon.png");
    use base64::{engine::general_purpose, Engine as _};
    general_purpose::STANDARD.encode(bytes)
}

fn esc_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('\"', "&quot;")
}
fn build_code_email(code: &str, scene: &str) -> String {
    let icon_b64 = get_icon_base64();
    let icon_src = format!("data:image/png;base64,{}", icon_b64);
    let (title, hello, subtitle, accent, badge, footer_note) = match scene {
        "reset" => ("找回密码验证码", "正在进行密码重置", "请使用下方验证码完成身份校验。若非本人操作，请立即忽略本邮件并检查账号安全。", "#f97316", "PASSWORD RESET", "此验证码仅用于找回密码。"),
        "change_email" => ("换绑邮箱验证码", "正在绑定新的邮箱", "请使用下方验证码确认新邮箱归属。完成后账号通知和安全验证将发送到该邮箱。", "#0ea5e9", "EMAIL CHANGE", "此验证码仅用于换绑邮箱。"),
        _ => ("注册邮箱验证码", "欢迎创建 KamiSM 账号", "请使用下方验证码完成邮箱验证，验证通过后即可进入商户工作台。", "#4f46e5", "SIGN UP", "此验证码仅用于注册账号。"),
    };
    format!(r#"<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',Arial,sans-serif;color:#111827;">
  <div style="padding:34px 12px;background:#f1f5f9;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 55px rgba(15,23,42,.13);">
      <div style="padding:24px 30px;background:linear-gradient(135deg,{accent},#7c3aed);color:#fff;">
        <img src="{icon_src}" width="38" height="38" style="border-radius:12px;vertical-align:middle;margin-right:10px;background:#fff"/><span style="font-size:23px;font-weight:900;vertical-align:middle;letter-spacing:-.3px">KamiSM</span>
        <div style="margin-top:30px;font-size:30px;line-height:1.22;font-weight:900;letter-spacing:-.6px;">{title}</div>
      </div>
      <div style="padding:32px 30px 30px;background:#fff;">
        <div style="font-size:12px;font-weight:900;color:{accent};letter-spacing:1.4px;margin-bottom:14px;">{badge}</div>
        <h2 style="margin:0 0 12px;font-size:21px;line-height:1.45;color:#111827;">{hello}</h2>
        <p style="margin:0 0 26px;font-size:15px;line-height:1.9;color:#4b5563;">{subtitle}</p>
        <div style="text-align:center;margin:0 auto 26px;padding:26px 12px;border-radius:18px;background:#f8fafc;border:1px solid #eef2f7;">
          <div style="font-size:12px;color:#94a3b8;letter-spacing:2px;font-weight:900;margin-bottom:12px;">验证码</div>
          <div style="font-family:'SFMono-Regular','Consolas','Courier New',monospace;font-size:50px;line-height:1;font-weight:900;letter-spacing:12px;text-indent:12px;color:#111827;">{code}</div>
        </div>
        <p style="margin:0;font-size:14px;line-height:1.9;color:#4b5563;">验证码将在 <b style="color:#111827;">10 分钟</b> 后失效，请勿转发或泄露给他人。</p>
      </div>
      <div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:13px;line-height:1.7;">{footer_note}<br/>This email was sent by KamiSM. Please do not reply directly.</div>
    </div>
  </div>
</body></html>"#, title=title, hello=hello, subtitle=subtitle, accent=accent, badge=badge, code=code, icon_src=icon_src, footer_note=footer_note)
}
fn build_verify_email(code: &str) -> String { build_code_email(code, "register") }
fn build_reset_email(code: &str) -> String { build_code_email(code, "reset") }
fn build_change_email(code: &str) -> String { build_code_email(code, "change_email") }
fn build_custom_email(subject: &str, content: &str) -> String {
    let icon_b64 = get_icon_base64();
    let icon_src = format!("data:image/png;base64,{}", icon_b64);
    let subject = esc_html(subject);
    let content = esc_html(content).replace('\n', "<br/>");
    format!(r#"<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#e6ebf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;color:#111827;">
  <div style="padding:28px 10px;background:#e6ebf3;">
    <div style="max-width:650px;margin:0 auto;background:#fff;border-radius:22px;overflow:hidden;border:1px solid #dfe5ee;box-shadow:0 18px 50px rgba(15,23,42,.13);">
      <div style="height:78px;padding:0 34px;display:flex;align-items:center;border-bottom:1px solid #edf0f5;background:#fff;">
        <img src="{icon_src}" width="34" height="34" style="border-radius:10px;margin-right:12px;display:inline-block;vertical-align:middle"/>
        <span style="font-size:26px;font-weight:900;letter-spacing:-.6px;color:#111827;vertical-align:middle;">KamiSM</span>
      </div>
      <div style="padding:44px 34px 42px;text-align:center;background:#fafafa;background-image:repeating-linear-gradient(90deg,rgba(17,24,39,.035) 0 1px,transparent 1px 46px),repeating-linear-gradient(0deg,rgba(17,24,39,.025) 0 1px,transparent 1px 46px);border-bottom:1px solid #edf0f5;">
        <div style="display:inline-block;padding:8px 18px;border-radius:0;background:#eef6ff;color:#2563eb;font-size:15px;font-weight:900;letter-spacing:4px;margin-bottom:28px;">SYSTEM NOTICE</div>
        <div style="font-size:42px;line-height:1.16;font-weight:950;color:#0f172a;letter-spacing:-1px;word-break:break-word;">{subject}</div>
      </div>
      <div style="padding:36px 36px 34px;background:#fff;">
        <div style="font-size:21px;font-weight:900;color:#111827;margin:0 0 22px;line-height:1.55;">尊敬的 KamiSM 平台用户：</div>
        <div style="font-size:16px;line-height:2.1;color:#4b5563;word-break:break-word;">{content}</div>
        <div style="height:1px;background:#edf0f5;margin:30px 0 22px;"></div>
        <div style="padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #edf2f7;color:#64748b;font-size:14px;line-height:1.9;">
          <b style="display:block;color:#111827;margin-bottom:6px;font-size:15px;">温馨提示</b>
          如有任何疑问，请通过平台内消息或官方支持渠道联系我们。请以平台页面展示的信息为准。
        </div>
      </div>
      <div style="padding:28px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;color:#64748b;font-size:14px;line-height:1.9;">
        <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:6px;">KamiSM 卡密管理系统</div>
        <div><a style="color:#2563eb;text-decoration:none;font-weight:800;">官方支持</a><span style="color:#cbd5e1;margin:0 10px;">·</span><a style="color:#2563eb;text-decoration:none;font-weight:800;">平台通知</a></div>
        <div style="margin-top:8px;color:#9ca3af;">此邮件为系统通知，请勿直接回复 · © 2026 KamiSM</div>
      </div>
    </div>
  </div>
</body></html>"#, subject=subject, content=content, icon_src=icon_src)
}

pub async fn load_mailer_config(pool: &sqlx::PgPool) -> Result<MailerConfig> {
    let row: Option<(serde_json::Value,)> = sqlx::query_as("SELECT value FROM system_config WHERE key='mail.smtp'")
        .fetch_optional(pool)
        .await?;
    let Some((v,)) = row else { return Err(anyhow!("邮件服务未启用")); };
    if !v.get("enabled").and_then(|x| x.as_bool()).unwrap_or(false) {
        return Err(anyhow!("邮件服务未启用"));
    }
    let cfg = MailerConfig {
        smtp_host: v.get("smtp_host").and_then(|x| x.as_str()).unwrap_or_default().trim().to_string(),
        smtp_port: v.get("smtp_port").and_then(|x| x.as_str()).and_then(|x| x.parse().ok()).unwrap_or(465),
        smtp_user: v.get("smtp_user").and_then(|x| x.as_str()).unwrap_or_default().trim().to_string(),
        smtp_pass: v.get("smtp_pass").and_then(|x| x.as_str()).unwrap_or_default().trim().to_string(),
        from_name: v.get("smtp_from_name").and_then(|x| x.as_str()).unwrap_or("KamiSM").trim().to_string(),
        from_email: v.get("smtp_from_email").and_then(|x| x.as_str()).unwrap_or_default().trim().to_string(),
    };
    if cfg.smtp_host.is_empty() || cfg.smtp_user.is_empty() || cfg.smtp_pass.is_empty() || cfg.from_email.is_empty() {
        return Err(anyhow!("邮件服务配置不完整"));
    }
    Ok(cfg)
}

async fn send_code_email(config: &MailerConfig, to_email: &str, code: &str, scene: &str) -> Result<()> {
    if config.smtp_user.is_empty() || config.smtp_pass.is_empty() {
        return Err(anyhow!("邮件服务配置不完整"));
    }

    let from = format!("{} <{}>", config.from_name, config.from_email);
    let html_body = match scene { "reset" => build_reset_email(code), "change_email" => build_change_email(code), _ => build_verify_email(code) };

    let email = Message::builder()
        .from(from.parse()?)
        .to(to_email.parse()?)
        .subject(match scene { "reset" => format!("【KamiSM】找回密码验证码 {} — 10分钟内有效", code), "change_email" => format!("【KamiSM】换绑邮箱验证码 {} — 10分钟内有效", code), _ => format!("【KamiSM】注册验证码 {} — 10分钟内有效", code) })
        .header(ContentType::TEXT_HTML)
        .body(html_body)?;

    let creds = Credentials::new(config.smtp_user.clone(), config.smtp_pass.clone());

    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&config.smtp_host)?
        .port(config.smtp_port)
        .credentials(creds)
        .build();

    mailer.send(email).await?;
    tracing::info!("验证码邮件已发送至: {}", to_email);
    Ok(())
}


pub async fn send_verify_code(config: &MailerConfig, to_email: &str, code: &str) -> Result<()> { send_code_email(config, to_email, code, "register").await }
pub async fn send_reset_code_email(config: &MailerConfig, to_email: &str, code: &str) -> Result<()> { send_code_email(config, to_email, code, "reset").await }
pub async fn send_change_email_code(config: &MailerConfig, to_email: &str, code: &str) -> Result<()> { send_code_email(config, to_email, code, "change_email").await }

pub async fn send_custom_email(config: &MailerConfig, to_email: &str, subject: &str, content: &str) -> Result<()> {
    if config.smtp_user.is_empty() || config.smtp_pass.is_empty() { return Err(anyhow!("邮件服务配置不完整")); }
    let from = format!("{} <{}>", config.from_name, config.from_email);
    let html_body = build_custom_email(subject, content);
    let email = Message::builder().from(from.parse()?).to(to_email.parse()?).subject(format!("【KamiSM】{}", subject)).header(ContentType::TEXT_HTML).body(html_body)?;
    let creds = Credentials::new(config.smtp_user.clone(), config.smtp_pass.clone());
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&config.smtp_host)?.port(config.smtp_port).credentials(creds).build();
    mailer.send(email).await?;
    Ok(())
}
