<div align=center><img src="https://oss.fly-fly.fun/ext/kamism.png" width="200" height="200"></div>

# KamiSM 二改 — 增强版卡密授权管理系统

> 基于 Tauri 2.0 + Rust (Axum) + React + PostgreSQL + Redis + RabbitMQ 构建的卡密即服务（KaaS）平台。
> 在原项目基础上进行了大量功能增强与安全优化，新增代理分销体系、IP风控黑名单、API密钥管理、Webhook推送、服务健康监控等企业级特性。

---

<div align=center><img src="https://oss.fly-fly.fun/ext/kamiuser.jpg" ></div>

## 简介

本项目是 KamiSM 卡密管理系统的二次开发增强版本。在原版基础上，新增了多级代理分销、IP安全防护、API文档在线查看、数据看板优化、卡密导出、Webhook事件推送等功能，同时修复了已知安全漏洞，对数据库连接、首屏加载等进行了性能优化。

适用于需要对自研软件进行授权控制的开发者与企业，支持多商户隔离、多应用管理、多设备绑定、代理商分润等完整业务链路。

---

## 系统架构

```
┌─────────────────────────────────┐     ┌────────────────────────────────────┐
│       用户电脑                    │     │           云服务器                   │
│                                 │     │                                    │
│  ┌─────────────────────────┐   │     │  ┌──────────────────────────────┐  │
│  │   Tauri 桌面客户端        │   │     │  │   kamism-server (Axum)       │  │
│  │   (纯前端 React UI)       │──HTTP──│  │   REST API + SSE + Webhook   │  │
│  │   无后端服务               │   │     │  └──────────┬─────────────────┘  │
│  └─────────────────────────┘   │     │             │                    │
└─────────────────────────────────┘     │  ┌──────────▼─────────────────┐  │
                                        │  │   PostgreSQL                │  │
┌─────────────────────────────────┐     │  │   Redis（缓存/限速/分布式锁）  │  │
│    第三方软件（商户的软件）         │     │  │   RabbitMQ（异步降级队列）    │  │
│   调用 /api/v1/verify 验证卡密   │─────│  └────────────────────────────┘  │
└─────────────────────────────────┘     └────────────────────────────────────┘
```

**桌面客户端**：纯 UI 管理后台，打包后不含任何后端服务，通过 HTTP 连接云服务器。
**云服务器**：运行 Axum API 服务 + PostgreSQL + Redis + RabbitMQ，处理所有业务逻辑。

---

## 角色体系

| 角色 | 说明 |
|------|------|
| **平台管理员** | 管理所有商户账号、套餐配置、服务状态监控、API密钥管理、发送全站公告/站内信 |
| **商户（上级）** | 注册后创建应用、生成卡密、查看激活记录，可创建下级代理、管理IP/设备黑名单 |
| **商户（代理）** | 使用邀请码加入上级，受配额限制生成卡密，获得激活分润统计 |
| **终端用户** | 通过商户软件内嵌 API 调用激活/验证卡密 |

---

## 二改新增功能

### 🆕 多级代理分销体系
- 生成邀请码邀请下级代理，支持配额划拨与回收
- 分润比例自定义设置，每次激活自动��录分润明细
- 代理可查看上级信息、激活分润记录
- 上级可启用/禁用/解除代理关系

### 🛡️ IP安全防护与风控黑名单
- IP黑名单/设备黑名单手动添加与批量管理
- 异常激活告警：IP频繁激活、设备多卡激活、异地激活检测
- 同一IP短时间内频率限制（防黄牛刷卡）
- SQL注入防护与安全中间件增强

### 🔑 API密钥管理
- 商户级 API Key 生成、查看、撤销
- 独立的 API 密钥鉴权体系，无需 JWT 即可调用开放接口
- API Key 使用 `km_` 格式并加密存储，数据库只保留加密值和哈希索引

### 📖 在线API文档
- 管理员端与商户端均可查看 API 文档
- 接口参数说明、请求示例、响应格式一目了然
- 支持快速复制调用代码

### 📊 数据看板优化
- 重新设计首页数据总览，关键指标一目了然
- 优化首屏加载速度，减少不必要的请求

### 📦 卡密导出功能
- 支持将卡密列表导出为文件，方便线下分发

### 🔔 Webhook事件推送
- 应用可配置 Webhook URL
- 卡密激活/验证成功时自动推送事件（HMAC-SHA256 签名）

### 🏥 服务健康监控
- 管理员端实时查看 PostgreSQL / Redis / RabbitMQ 运行状态
- 快速定位服务异常

### 📨 站内信与公告系统
- 管理员可发送全站公告或定向站内信
- 商户端实时接收未读提醒（WebSocket 推送）
- 优化公告弹窗体验

### 👤 我的页面与账号资料中心
- 新增统一 `/profile` 我的页面，管理员和商户共用
- 支持头像上传、用户名修改、API Key 重新生成、邮箱换绑、密码修改
- 邮箱换绑/密码修改成功后自动退出并跳回登录页
- 换系统后旧管理员 Token 可按邮箱自动映射当前管理员 ID，避免“用户不存在”

### 🎨 全局自定义背景
- 设置页支持上传全局背景图，保存到服务器 uploads 目录
- 背景图从后端 `background_url` 恢复，刷新页面仍保持显示
- 背景 URL 使用稳定缓存，不再每次刷新追加时间戳强制重新加载

### 🔐 通用三方 OAuth 聚合登录
- 后台可配置 OAuth 服务地址、登录接口、用户信息接口、回调地址、AppID、AppKey
- 支持 QQ/微信/支付宝/微博/百度/抖音/华为/Google/Microsoft/Twitter/钉钉/Gitee/GitHub 等类型
- OAuth 配置持久化到数据库，不依赖浏览器 localStorage
- OAuth 登录成功自动注册/登录商户账号，同步昵称、头像和邮箱
- QQ 返回真实 QQ 号时使用 `QQ号@qq.com`；拿不到真实邮箱时生成稳定匿名邮箱 `xxxxxxxxxxxx@kamism.com`
- 已启用状态使用绿色呼吸点显示

### 🔄 管理员系统更新中心
- 设置页“版本检查”升级为管理员专属“系统更新”
- 当前版本记录到 `system_versions` 数据表，不再直接取 Git HEAD
- 最新版本和更新日志从 GitHub `CHANGELOG.md` 读取
- 无更新时显示完整更新日志；发现更新时只显示最新版本变更
- 点击确认更新后自动拉取 GitHub 最新代码并重构 app/web 容器
- 更新期间每 2 秒静默轮询，实时显示 Git/Docker 构建日志和进度
- 更新源已切换为正式仓库 `https://github.com/wocao123456/kamism`

### 🔐 邮件服务与安全验证
- 邮件服务改为设置页开关，未启用/配置不完整时所有验证码发送接口返回错误
- SMTP_PASS 输入框明文显示授权码，不再密码隐藏

### 💳 自定义套餐与充值兑换体系
- 套餐配置支持自定义价格周期，不再固定月/季/年，可自行添加如「1天（测试）」「7天（周卡）」「30天（月卡）」等价格项
- 商户充值页自动读取后台自定义价格项，并隐藏免费套餐
- 兑换卡密支持生成、查看、复制、单个删除、批量删除与状态统计
- 兑换规则增强：同套餐兑换可叠加会员时间；不同未过期套餐禁止混用兑换；过期或免费状态可兑换新套餐
- 所有非 free 自定义套餐过期后均自动降级为免费套餐

### 🧩 管理后台体验增强
- 商户管理移动端改为卡片布局，支持套餐升级/降级、状态切换和到期时间展示
- 侧栏和我的页面新增当前会员套餐展示，免费套餐仅显示套餐名，付费套餐显示到期时间
- 设置页商户功能控制改为默认全选，并以紧凑图标按钮展示
- 邮件服务与第三方 OAuth 配置改为勾选启用后展开详细配置，减少默认界面干扰
- 套餐配置新增智能图标识别，根据套餐名称自动显示 VIP/专业/企业/免费等图标

### 🧱 首次部署与迁移补全
- 新增 `ensure_evn.sh`，首次 Docker 构建自动生成 `.evn` 模板，已存在则不覆盖
- 新增 `oauth_settings`、`system_versions`、`profile/oauth columns` 等迁移
- 补齐 `avatar_url`、`background_url`、`provider_key`、管理员 `api_key` 等换系统必需字段

### 🐛 安全修复
- 修复禁用卡密仍可验证通过的安全漏洞
- 优化 WebSocket 连接管理，管理员端禁用不必要的长连接
- 修复商户访问设置页时误触发管理员系统更新接口的问题

### ⚡ 性能优化
- 数据库连接池优化，减少连接开销
- 首屏渲染优化，提升加载速度
- 管理员接口重构，降低响应延迟

---

## 原有核心功能

- **多商户隔离**：每个商户拥有独立的应用、卡密和数据，互不干扰
- **套餐管理**：免费版/专业版，管理员可配置各套餐的应用数、卡密数、设备数限制
- **异步套餐降级**：专业版到期后通过 RabbitMQ 异步处理，Redis 分布式锁防并发
- **卡密前缀/格式自定义**：生成卡密时可指定前缀和格式
- **批量延期/缩短**：支持对选中卡密批量调整有效期
- **多设备支持**：每张卡密可配置最大绑定设备数（1~100 台）
- **联网验证**：软件每次启动调用 API 验证，服务端实时校验有效期和设备绑定
- **邮箱注册验证**：注册时发送 6 位数字验证码（Redis 存储，10 分钟有效，60 秒防刷）
- **批量生成卡密**：支持一次生成 1~1000 张
- **卡密生命周期管理**：未使用 / 使用中 / 已过期 / 已禁用（可重新启用）
- **设备解绑**：商户可手动解绑指定设备
- **无感续期**：Access Token 2小时过期后自动用 Refresh Token 刷新
- **字段级数据加密**：AES-256-GCM + SHA256 哈希索引，敏感数据加密存储

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面客户端 | [Tauri 2.0](https://tauri.app/)（纯前端壳） |
| 前端 UI | React 18 + TypeScript + Vite + Zustand 状态管理 |
| 后端服务 | Rust + [Axum](https://github.com/tokio-rs/axum) |
| 数据库 | PostgreSQL + [SQLx](https://github.com/launchbadge/sqlx) |
| 缓存 | Redis（验证码、Rate Limiting、分布式锁） |
| 消息队列 | RabbitMQ + [lapin](https://github.com/amqp-rs/lapin) |
| 认证 | JWT Access Token + Refresh Token，bcrypt 密码加密 |
| 数据加密 | AES-256-GCM + SHA256 哈希索引 |
| 邮件 | [Lettre](https://lettre.rs/)（SMTP） |

---

## 部署

> 只需要服务器上装有 **Docker** 和 **Docker Compose**，无需任何额外环境。

### 第一步：克隆代码

```bash
cd /root
git clone https://github.com/wocao123456/kamism.git
cd kamism
```

### 第二步：配置环境变量

```bash
cp env.example .env
nano .env
```

`.env` 必填字段：

```env
POSTGRES_PASSWORD=强密码
RABBITMQ_PASSWORD=强密码
JWT_SECRET=随机32位以上字符串
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123456
MASTER_KEY=64位16进制字符串（openssl rand -hex 32）
```

完整字段说明见 `env.example`。

---

### 方式一：单容器部署

所有服务打包进一个容器：

```bash
docker compose -f docker-compose.standalone.yml up -d --build
```

> 首次构建约需 **20~30 分钟**。

### 方式二：多容器部署（生产推荐）

各服务独立容器，共 5 个容器：

```bash
docker compose up -d --build
```

> 首次构建约需 **10~20 分钟**。

---

### 访问地址

| 地址 | 说明 |
|---|---|
| `http://your-server-ip:1420` | Web 管理控制台 |
| `http://your-server-ip:1420/api/` | 后端 REST API |
| `http://your-server-ip:1420/api/v1/activate` | 卡密激活接口 |

登录账号为 `.env` 中配置的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`。

---

### 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down

# 更新重新部署
git pull && docker compose up -d --build
```

---

## 对外开放 API

供第三方软件集成，通过商户 `api_key` 鉴权。

### 激活卡密

```http
POST https://yourdomain.com/api/v1/activate
Content-Type: application/json

{
  "api_key": "km_xxx...",
  "app_id": "xxx-xxx-xxx",
  "card_code": "KAMI-XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备唯一标识符",
  "device_name": "设备名称"
}
```

### 验证卡密

```http
POST https://yourdomain.com/api/v1/verify
Content-Type: application/json

{
  "api_key": "km_xxx...",
  "app_id": "xxx-xxx-xxx",
  "card_code": "KAMI-XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备唯一标识符"
}
```

### 解绑设备

```http
POST https://yourdomain.com/api/v1/unbind
Content-Type: application/json

{
  "api_key": "km_xxx...",
  "app_id": "xxx-xxx-xxx",
  "card_code": "KAMI-XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备唯一标识符"
}
```

### 响应示例

```json
{
  "success": true,
  "valid": true,
  "message": "卡密有效",
  "data": {
    "card_code": "KAMI-XXXX-XXXX-XXXX-XXXX",
    "expires_at": "2025-01-01T00:00:00Z",
    "remaining_days": 30,
    "max_devices": 3,
    "current_devices": 1
  }
}
```

---

## 项目结构

```text
kamism/
├── src/                                  # React/Vite 前端源码
│   ├── App.tsx                           # 前端路由入口
│   ├── main.tsx                          # React 挂载入口
│   ├── index.css                         # 全局样式与主题变量
│   ├── assets/                           # 图标与静态资源
│   ├── components/
│   │   ├── Layout.tsx                    # 主布局、侧栏、全局背景层
│   │   └── ConfirmDialog.tsx             # 通用确认弹窗
│   ├── hooks/
│   │   └── useWs.ts                      # WebSocket 连接 Hook
│   ├── lib/
│   │   └── api.ts                        # API 请求封装
│   ├── stores/
│   │   ├── auth.ts                       # 登录态、用户资料、背景恢复
│   │   ├── theme.ts                      # 主题状态
│   │   ├── confirm.ts                    # 确认弹窗状态
│   │   └── wsEvent.ts                    # WebSocket 事件状态
│   └── pages/
│       ├── admin/
│       │   ├── Dashboard.tsx             # 管理员数据总览
│       │   ├── Merchants.tsx             # 商户管理
│       │   ├── PlanConfigs.tsx           # 套餐配置
│       │   ├── Messages.tsx              # 公告与站内信管理
│       │   ├── ApiManage.tsx             # API 密钥管理
│       │   ├── ApiDocs.tsx               # API 文档
│       │   ├── Profile.tsx               # 我的页面：头像/邮箱/API Key/密码
│       │   └── SettingsPage.tsx          # 设置页：背景/OAuth/系统更新
│       ├── merchant/
│       │   ├── Dashboard.tsx             # 商户数据看板
│       │   ├── Apps.tsx                  # 应用管理
│       │   ├── Cards.tsx                 # 卡密管理与导出
│       │   ├── Activations.tsx           # 激活记录
│       │   ├── Agents.tsx                # 代理管理
│       │   ├── Blacklist.tsx             # IP/设备/卡密黑名单
│       │   ├── ApiDocs.tsx               # 商户 API 文档
│       │   ├── ApiManage.tsx             # 商户 API Key
│       │   ├── Messages.tsx              # 消息中心
│       │   └── Settings.tsx              # 商户设置
│       └── auth/                         # 登录/注册/重置/OAuth 回调
│
├── src-tauri/                            # Rust/Tauri 后端工程
│   ├── Cargo.toml
│   ├── build.rs
│   ├── migrations/                       # SQLx 数据库迁移
│   │   ├── 001_init_complete.sql         # 初始化核心表：管理员、商户、应用、卡密、激活、套餐等
│   │   ├── 005_api_keys.sql              # API Key 管理表与密钥鉴权基础结构
│   │   ├── 006_fix_activations.sql       # 激活记录结构修复，补齐设备/卡密关联字段
│   │   ├── 010_operation_logs.sql        # 操作日志表，记录管理员/商户关键操作
│   │   ├── 011_api_keys_merchant_id.sql  # API Key 绑定 merchant_id，支持商户级密钥归属
│   │   ├── 012_api_keys_nullable_merchant.sql # API Key merchant_id 可空，兼容管理员/系统级密钥
│   │   ├── 013_blacklist_whitelist_card_type.sql # 黑白名单扩展 card 类型，支持卡密级风控
│   │   ├── 014_oauth_settings.sql        # 三方 OAuth 聚合登录配置持久化
│   │   └── 016_profile_oauth_columns.sql # 我的页面/OAuth 迁移补全：头像、背景、provider_key、管理员 api_key
│   └── src/
│       ├── lib.rs                        # 后端启动与路由挂载
│       ├── main.rs                       # Tauri 入口
│       ├── db/                           # 数据库连接与加密字段工具
│       ├── middleware/
│       │   ├── auth.rs                   # JWT 校验、管理员旧 Token 邮箱映射
│       │   ├── op_log.rs                 # 操作日志中间件
│       │   ├── rate_limit.rs             # 频率限制
│       │   └── security.rs               # 安全防护
│       ├── routes/
│       │   ├── auth.rs                   # 登录/注册/验证码
│       │   ├── oauth.rs                  # 三方 OAuth 聚合登录
│       │   ├── profile.rs                # 我的页面、头像、邮箱、背景、API Key
│       │   ├── system_update.rs          # 管理员系统更新中心
│       │   ├── admin.rs                  # 管理员接口
│       │   ├── merchant.rs               # 商户资料与上下文
│       │   ├── agent.rs                  # 多级代理体系
│       │   ├── apps.rs                   # 应用管理
│       │   ├── cards.rs                  # 卡密管理
│       │   ├── activations.rs            # 激活记录
│       │   ├── blacklist.rs              # 风控黑名单
│       │   ├── api_keys.rs               # API Key 管理
│       │   ├── api_ts.rs                 # API 文档/类型输出
│       │   ├── health.rs                 # 健康检查
│       │   ├── messages.rs               # 公告与站内信
│       │   ├── webhooks.rs               # Webhook 推送
│       │   └── public_api.rs             # 对外开放激活/验证 API
│       └── utils/                        # JWT、邮件、卡密生成、加密等工具
│
├── server/                               # 独立后端服务入口
│   ├── Cargo.toml
│   └── src/main.rs
│
├── Dockerfile                            # app 后端镜像构建
├── Dockerfile.web                        # web 前端镜像构建
├── Dockerfile.standalone                 # 单容器镜像构建
├── docker-compose.yml                    # 多容器部署：app/web/postgres/redis/rabbitmq
├── docker-compose.standalone.yml         # 单容器部署
├── nginx.conf                            # 多容器 Nginx 配置
├── nginx.standalone.conf                 # 单容器 Nginx 配置
├── supervisord.conf                      # 单容器进程管理
├── auto_update.sh                        # 后台一键更新脚本
├── ensure_evn.sh                         # 首次生成 .evn 模板
├── env.example                           # 环境变量示例
├── CHANGELOG.md                          # 更新日志
└── README.md                             # 项目说明
```

---

## 数据加密

本项目实现了**字段级 AES-256-GCM 加密 + SHA256 哈希索引**的双层安全方案。

| 表 | 加密字段 | 存储方式 | 查询方式 |
|---|---|---|---|
| merchants | api_key, email | AES-256-GCM | SHA256哈希索引 |
| cards | card_code | AES-256-GCM | SHA256哈希索引 |
| activations | device_id | AES-256-GCM | SHA256哈希索引 |

**性能提升**：查询从 O(n) 全表扫描优化至 O(1) 索引定位，性能提升 **100倍+**。

---

## License

Copyright © 2026 KamiSM Contributors

本项目基于 MIT 协议开源。

原始项目地址：https://github.com/zf26/kamism

---

> ⚠️ 本项目基于 KamiSM 进行二次开发，保留原项目的核心架构，在此基础上进行了功能增强与安全加固。