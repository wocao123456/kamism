<div align=center><img src="https://oss.fly-fly.fun/ext/kamism.png" width="200" height="200"></div>

# KamiSM 二改 — 企业级卡密授权管理系统（增强版）

> 基于 Tauri 2.0 + Rust (Axum) + React 18 + PostgreSQL + Redis + RabbitMQ 构建的卡密即服务（KaaS）平台。
> 在原项目基础上完成了大规模的功能扩展与安全加固：新增多级代理分销、IP/设备风控黑名单、API 密钥独立鉴权、Webhook 事件推送、字段级数据加密、自定义套餐与充值兑换体系、公告余额奖励、三方 OAuth 聚合登录、管理员系统更新中心以及实时服务运行时监控等企业级特性，并对 UI/UX、首屏性能与数据库访问进行了系统性优化。

---

<div align=center><img src="https://oss.fly-fly.fun/ext/kamiuser.jpg" ></div>

## 简介

本项目是 KamiSM 卡密管理系统的**二次开发企业增强版**。在保留原版核心架构的前提下，对授权业务全链路进行了深度扩展与安全加固，新增了多级代理分销、IP/设备/卡密三维风控黑名单、独立 API 密钥鉴权、在线 API 文档、Webhook 事件推送、字段级 AES‑256‑GCM 数据加密、自定义套餐与充值兑换体系、公告余额奖励、三方 OAuth 聚合登录、管理员系统更新中心、实时服务运行时监控等功能，并系统性修复了已知安全漏洞、优化了数据库访问与首屏加载性能。

适用于需要对自研软件进行授权控制的开发者与企业，支持多商户数据隔离、多应用管理、多设备绑定、多级代理分润、邮箱验证、联网验证等完整业务闭环；前端采用现代化深色/浅色主题与动画数字、自定义下拉等组件，提供一致而流畅的管理体验。

---

## 系统架构

整体采用「桌面壳 / Web 控制台 — 云端 API 服务 — 中间件与数据层」的分层架构。桌面客户端与 Web 控制台仅承载 UI，所有业务逻辑、风控与加密都在云端 Axum 服务中完成；缓存、队列与数据库作为支撑层独立部署。

```
┌──────────────────────────────────────┐      ┌───────────────────────────────────────────────┐
│                客户侧                   │      │                      云服务器                     │
│                                        │      │                                                 │
│  ┌────────────────────────────────┐    │      │   ┌─────────────────────────────────────────┐   │
│  │   Tauri 桌面客户端 / Web 控制台   │    │      │   │      kamism-server (Rust · Axum)          │   │
│  │   React 18 + TS（纯前端 UI）      │──HTTPS───┼──▶│  REST API · WebSocket(SSE) · Webhook 推送   │   │
│  │   JWT + Refresh Token 无感续期    │    │      │   │  鉴权 / 限流 / 安全中间件 / 操作日志          │   │
│  └────────────────────────────────┘    │      │   └────────────┬───────────────┬────────────┘   │
└──────────────────────────────────────┘      │                │               │                │
                                               │   ┌────────────▼──────┐  ┌─────▼────────────┐    │
┌──────────────────────────────────────┐      │   │   PostgreSQL       │  │  Redis           │    │
│        第三方软件（商户的软件）          │      │   │   字段级 AES 加密   │  │  验证码/限流/锁    │    │
│  api_key 鉴权调用 /api/v1/activate     │──────────▶│   SQLx 连接池      │  └──────────────────┘    │
│                  /api/v1/verify        │      │   └────────────────────┘  ┌──────────────────┐    │
│                  /api/v1/unbind        │      │                           │  RabbitMQ        │    │
└──────────────────────────────────────┘      │                           │  异步降级队列     │    │
                                               │                           └──────────────────┘    │
                                               └───────────────────────────────────────────────┘
```

**客户侧**：Tauri 桌面客户端与 Web 控制台均为纯前端管理界面，打包后不含任何后端逻辑，通过 HTTPS + JWT 连接云端服务，并以 Refresh Token 实现无感续期。
**API 服务层**：单一 Rust/Axum 服务统一承载 REST API、WebSocket 实时推送、Webhook 出站推送，并通过鉴权、频率限制、安全防护、操作日志等中间件链处理每一次请求。
**数据与中间件层**：PostgreSQL 存储核心业务数据并对敏感字段做 AES‑256‑GCM 加密；Redis 负责验证码、限流计数与分布式锁；RabbitMQ 承载套餐到期降级等异步任务，实现削峰与降级。
**第三方集成**：商户软件通过 `api_key` 直接调用开放接口完成卡密激活、验证与设备解绑，无需登录态。

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

### 🏥 服务健康监控与运行时面板
- 管理员端实时查看 PostgreSQL / Redis / RabbitMQ 运行状态
- 新增 `system_runtime` 运行时接口：`/system/info`（主机名、OS、架构、CPU 核数与使用率、内存）、`/system/health-full`（全量依赖健康）与 `/system/restart`（面板重启）
- 服务器资源指标实时采集，快速定位服务异常

### 🎁 公告余额奖励
- 公告（messages）支持配置 `reward_amount` 余额奖励
- 商户阅读指定公告后可领取奖励，按 `message_reads.reward_claimed_at` 记录领取时间，防止重复领取
- 站内信类型扩展支持 `email` 类型（migration 021）

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
- 新增 `AnimatedNumber` 数字滚动动画组件，数据看板关键指标平滑过渡（自动尊重 `prefers-reduced-motion`）
- 新增 `CustomSelect` 自定义下拉组件，统一深色/浅色主题下的选择交互
- 独立 `VerifyEmail` 邮箱验证页面，注册流程改为「填写信息 → 邮箱验证码校验 → 完成注册」，验证码 60 秒防刷与重发

### 🧱 首次部署与迁移补全
- 新增 `ensure_evn.sh`，首次 Docker 构建自动生成 `.evn` 模板，已存在则不覆盖
- 新增 `oauth_settings`、`system_versions`、`profile/oauth columns` 等迁移
- 新增 `system_config` 运行时配置表、套餐价格周期与 `pricing_options` 自定义价格项、充值周期扩展（day/week）等迁移（017~019）
- 新增公告余额奖励字段与 `message_reads.reward_claimed_at` 领取标记、站内信 `email` 类型扩展（020~021）
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
| 桌面客户端 | [Tauri 2.0](https://tauri.app/)（纯前端壳，无内置后端） |
| 前端框架 | React 18 + TypeScript + Vite |
| 前端状态 | Zustand（auth / theme / confirm / wsEvent 多 Store 拆分） |
| 前端路由/通信 | React Router + Axios 封装（无感续期）+ WebSocket（站内信/事件） |
| UI/交互 | lucide-react 图标 + react-hot-toast + 自研 AnimatedNumber/CustomSelect/ConfirmDialog 组件 + 深浅色主题与全局背景 |
| 后端服务 | Rust + [Axum](https://github.com/tokio-rs/axum) + Tokio 异步运行时 |
| 数据库 | PostgreSQL + [SQLx](https://github.com/launchbadge/sqlx)（编译期检查 + 连接池） |
| 缓存 | Redis（验证码、Rate Limiting、分布式锁） |
| 消息队列 | RabbitMQ + [lapin](https://github.com/amqp-rs/lapin)（套餐到期异步降级） |
| 认证 | JWT Access Token + Refresh Token，bcrypt 密码哈希，独立 API Key（`km_` 前缀）鉴权 |
| 数据加密 | AES-256-GCM 字段级加密 + SHA256 哈希索引，密钥由 `MASTER_KEY` 派生（KMS 模块管理 key_id） |
| 第三方登录 | 通用 OAuth 聚合（QQ/微信/支付宝/微博/百度/抖音/华为/Google/Microsoft/Twitter/钉钉/Gitee/GitHub 等） |
| 事件推送 | Webhook（HMAC-SHA256 签名）+ WebSocket 实时通知 |
| 邮件 | [Lettre](https://lettre.rs/)（SMTP，设置页开关控制） |
| 运维/部署 | Docker + Docker Compose（多容器/单容器）+ Nginx + Supervisor + 一键 `auto_update.sh` |

---

## 部署

> 只需要服务器上装有 **Docker** 和 **Docker Compose**，无需任何额外环境。

### 第一步：克隆代码

```bash
cd /root
git clone https://github.com/wocao123456/kamism.git
cd kamism
```

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

供第三方软件集成，通过商户 `api_key` 鉴权（`km_` 前缀，明文仅在生成时回显一次，数据库内以加密值 + SHA256 哈希索引存储）。所有接口均为 `POST` + `application/json`，统一前缀 `/api/v1`。

> **鉴权方式**：请求体携带 `api_key`，服务端用其 SHA256 哈希匹配 `merchants.api_key_hash`，仅 `status = active` 的商户可用。
> **风控限流**：所有接口经过 `api_rate_limit` 频率限制；`/v1/activate` 额外叠加 `activate_rate_limit`（防黄牛刷卡）。同时受 IP/设备/卡密黑名单与异常激活检测约束，命中风控会被拦截。

### 接口一览

| 方法 | 路径 | 说明 | 限流 |
|---|---|---|---|
| POST | `/api/v1/activate` | 激活卡密并绑定设备 | api + activate 双重限流 |
| POST | `/api/v1/verify` | 验证卡密有效性与设备绑定 | api 限流 |
| POST | `/api/v1/unbind` | 解绑指定设备 | api 限流 |
| POST | `/api/v1/heartbeat` | 在线心跳上报，维持设备在线状态 | api 限流 |

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

> `device_id` 不能为空；`device_name` 可选。激活时会校验 API Key、应用归属与状态、黑名单与卡密频率。

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

> 软件每次启动调用，服务端实时校验有效期与设备绑定关系。已禁用卡密一律验证失败。

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

> 将指定 `device_id` 从卡密的已绑定设备中移除，释放一个设备名额。

### 在线心跳

```http
POST https://yourdomain.com/api/v1/heartbeat
Content-Type: application/json

{
  "api_key": "km_xxx...",
  "device_id": "设备唯一标识符",
  "device_name": "设备名称"
}
```

> 客户端按周期上报心跳，用于统计与维持设备在线状态。

成功响应示例：

```json
{ "success": true, "message": "心跳已记录", "status": "online" }
```

### 响应示例（激活/验证）

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
│   │   ├── Layout.tsx                    # 主布局、侧栏、全局背景层、会员套餐展示
│   │   ├── ConfirmDialog.tsx             # 通用确认弹窗
│   │   ├── AnimatedNumber.tsx            # 数字滚动动画组件（看板指标）
│   │   └── CustomSelect.tsx              # 自定义下拉组件（主题一致）
│   ├── hooks/
│   │   └── useWs.ts                      # WebSocket 连接 Hook
│   ├── lib/
│   │   └── api.ts                        # API 请求封装（无感续期、统一错误）
│   ├── stores/
│   │   ├── auth.ts                       # 登录态、用户资料、背景恢复
│   │   ├── theme.ts                      # 主题状态
│   │   ├── confirm.ts                    # 确认弹窗状态
│   │   └── wsEvent.ts                    # WebSocket 事件状态
│   └── pages/
│       ├── admin/
│       │   ├── Dashboard.tsx             # 管理员数据总览（动画指标）
│       │   ├── Merchants.tsx             # 商户管理（卡片布局/套餐升降级）
│       │   ├── PlanConfigs.tsx           # 套餐配置（自定义价格项/智能图标）
│       │   ├── Messages.tsx              # 公告与站内信管理（含余额奖励）
│       │   ├── ApiManage.tsx             # API 密钥管理
│       │   ├── ApiDocs.tsx               # API 文档
│       │   ├── Profile.tsx               # 我的页面：头像/邮箱/API Key/密码/会员
│       │   └── SettingsPage.tsx          # 设置页：背景/OAuth/邮件/系统更新/运行时
│       ├── merchant/
│       │   ├── Dashboard.tsx             # 商户数据看板（动画指标）
│       │   ├── Apps.tsx                  # 应用管理
│       │   ├── Cards.tsx                 # 卡密管理与导出
│       │   ├── Activations.tsx           # 激活记录
│       │   ├── Agents.tsx                # 代理管理
│       │   ├── Blacklist.tsx             # IP/设备/卡密黑名单
│       │   ├── ApiDocs.tsx               # 商户 API 文档
│       │   ├── ApiManage.tsx             # 商户 API Key
│       │   ├── Messages.tsx              # 消息中心（公告奖励领取）
│       │   ├── Recharge.tsx              # 充值兑换（自定义价格项/兑换码）
│       │   └── Settings.tsx              # 商户设置
│       └── auth/                         # 登录/注册/邮箱验证/重置/OAuth 回调
│           ├── Login.tsx                 # 登录
│           ├── Register.tsx              # 注册
│           ├── VerifyEmail.tsx           # 注册邮箱验证码校验
│           └── ResetPassword.tsx         # 找回/重置密码
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
│   │   ├── 016_profile_oauth_columns.sql # 我的页面/OAuth 迁移补全：头像、背景、provider_key、管理员 api_key
│   │   ├── 017_system_install_plans.sql  # system_config 运行时配置表 + 套餐价格周期/排序/启用扩展
│   │   ├── 018_recharge_cycle_day_week.sql # 充值周期扩展：day/week/month/quarter/year/custom
│   │   ├── 019_plan_pricing_options.sql  # 套餐自定义价格项 pricing_options(JSONB)
│   │   ├── 020_message_rewards.sql       # 公告余额奖励字段 + message_reads 领取标记
│   │   └── 021_messages_add_email_type.sql # 站内信类型扩展支持 email
│   └── src/
│       ├── lib.rs                        # 后端启动与路由挂载
│       ├── main.rs                       # Tauri 入口
│       ├── db/                           # 数据库连接、加密字段工具（encrypted_fields）
│       ├── middleware/
│       │   ├── auth.rs                   # JWT 校验、管理员旧 Token 邮箱映射
│       │   ├── op_log.rs                 # 操作日志中间件
│       │   ├── rate_limit.rs             # 频率限制
│       │   └── security.rs               # 安全防护
│       ├── routes/
│       │   ├── auth.rs                   # 登录/注册/验证码
│       │   ├── oauth.rs                  # 三方 OAuth 聚合登录
│       │   ├── profile.rs                # 我的页面、头像、邮箱、背景、API Key、余额
│       │   ├── system_config.rs          # 运行时系统配置（功能开关/邮件/安装状态）
│       │   ├── system_runtime.rs         # 运行时监控：system/info、health-full、restart
│       │   ├── system_update.rs          # 管理员系统更新中心
│       │   ├── admin.rs                  # 管理员接口
│       │   ├── merchant.rs               # 商户资料、上下文、充值兑换、余额
│       │   ├── agent.rs                  # 多级代理体系
│       │   ├── apps.rs                   # 应用管理
│       │   ├── cards.rs                  # 卡密管理
│       │   ├── plan_config.rs            # 套餐与价格项配置
│       │   ├── activations.rs            # 激活记录
│       │   ├── blacklist.rs              # 风控黑名单
│       │   ├── api_keys.rs               # API Key 管理
│       │   ├── api_ts.rs                 # API 文档/类型输出
│       │   ├── health.rs                 # 健康检查
│       │   ├── messages.rs               # 公告与站内信、余额奖励
│       │   ├── webhooks.rs               # Webhook 推送
│       │   └── public_api.rs             # 对外开放激活/验证/解绑 API
│       ├── models/                       # 数据模型（merchant、message 等）
│       ├── workers/                      # RabbitMQ 异步任务（套餐降级等）
│       └── utils/                        # JWT、邮件(mailer)、卡密生成、AES 加密/KMS 等工具
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

本项目实现了**字段级 AES-256-GCM 加密 + SHA256 哈希索引**的双层安全方案，敏感数据在数据库中始终以密文存储，明文永不落库。

### 设计思路

- **加密**：敏感字段使用 AES-256-GCM 进行认证加密（同时保证机密性与完整性），密文中包含随机 nonce，相同明文每次加密结果不同，防止密文比对推断。
- **可检索**：为保留按字段精确查询的能力，同时对明文计算 **SHA256 哈希** 并写入哈希索引列。查询时先对入参做 SHA256，再走哈希列等值匹配，从而在不解密的情况下定位记录。
- **密钥管理**：根密钥由部署时的环境变量 `MASTER_KEY`（64 位十六进制，`openssl rand -hex 32` 生成）提供，由 `utils/kms.rs` 派生工作密钥并以 `key_id` 标识；`db/encrypted_fields.rs` 负责字段加解密及 `encrypted_fields_log` 加密审计记录，支持密钥轮换追踪。
- **解密时机**：仅在业务需要返回明文（如展示卡密、回显 API Key）时按记录解密，且受权限与登录态约束。

### 加密字段

| 表 | 加密字段 | 存储方式 | 查询方式 |
|---|---|---|---|
| merchants | api_key, email | AES-256-GCM 密文 | SHA256 哈希索引 |
| cards | card_code | AES-256-GCM 密文 | SHA256 哈希索引 |
| activations | device_id | AES-256-GCM 密文 | SHA256 哈希索引 |

> 配套元数据表 `encrypted_fields_log` 记录每条加密字段的 `table_name / record_id / field_name / key_id / encrypted_at`，用于审计与密钥轮换。

### 传输与认证层加密

- 客户端与服务端之间建议全程 HTTPS 传输。
- 用户密码使用 **bcrypt** 单向哈希存储（不可逆）。
- 登录态使用 **JWT**（Access Token + Refresh Token），Refresh Token 实现无感续期。
- 对外开放接口使用独立 **API Key（`km_` 前缀）**，数据库仅保存加密值与哈希索引，明文仅生成时回显一次。
- Webhook 出站事件附带 **HMAC-SHA256 签名**，接收方可校验来源与完整性。

**性能优势**：相比对密文做模糊扫描，哈希索引把等值查询从 O(n) 全表扫描优化至 O(1) 索引定位，在大数据量下查询性能提升 **100 倍以上**，同时不牺牲存储侧的加密强度。

---

## License

Copyright © 2026 KamiSM Contributors

本项目基于 MIT 协议开源。

原始项目地址：https://github.com/zf26/kamism

---

> ⚠️ 本项目基于 KamiSM 进行二次开发，保留原项目的核心架构，在此基础上进行了功能增强与安全加固。
