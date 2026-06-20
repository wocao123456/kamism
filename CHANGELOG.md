# KamiSM 更新日志

所有重要变更都会记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
## [v2.0.8] - 2026-06-20
### 修复
- **修复同版本误报更新**：后端 `has_update` 判断改为同时参考数据库记录版本和本地 CHANGELOG 版本，避免 `system_versions` 记录滞后导致 `v1.5.0` 仍提示「发现新版本 v1.5.0」。
- **前端版本号兜底**：新增 `remoteVersionNewer()` 前端版本比较函数，即使后端返回 `has_update: true`，只要前端解析到当前版本与远程版本相同，也不显示「发现新版本」和「一键更新」按钮。
- **修复 `sh()` 返回值编译错误**：`system_update.rs` 中 `sh().contains("yes")` 改为 `sh().unwrap_or_default().contains("yes")`，修复 `Result<String, String>` 不能直接调用 `.contains()` 的编译错误。
- **侧栏版本号硬编码修复**：侧栏 Logo 旁版本号从硬编码 `v1.5.0` 改为动态读取 `/CHANGELOG.md` 第一个版本标题，更新后自动显示新版本。
- **设置页兜底版本号修复**：设置页「当前版本」兜底从硬编码 `1.5.0` 改为 `1.5.1`。
- **修复后端版本选择逻辑反转**：`system_update.rs` 中 `current_version` 取值逻辑反了——当 CHANGELOG 版本（v2.0.3）比 DB 记录（v1.5.0）新时，错误地选择了 DB 旧版本，导致设置页刷新后版本号变回 `v1.5.0`。现改为优先取较新的一方：CHANGELOG 版本 > DB 版本时以 CHANGELOG 为准。
### 优化
- **更新日志弹窗暗黑模式适配**：弹窗背景、文字、内容区、关闭按钮全部改用 CSS 变量（`var(--c)`、`var(--t1)`、`var(--t2)`、`var(--fc)`、`var(--bd)`），暗黑模式下不再白底灰字。
- **后端版本判断更严谨**：新增 `should_show_update()` 函数，收集所有可解析的当前版本（数据库记录 + 本地 CHANGELOG），远程版本必须大于所有当前版本才提示更新。
- **CHANGELOG.md 构建时拷贝**：`Dockerfile.web` 和 `Dockerfile.standalone` 新增 `COPY CHANGELOG.md /usr/share/nginx/html/CHANGELOG.md`。
- **nginx CHANGELOG.md 无缓存**：新增 location 配置 `Cache-Control: no-store`。
- **Layout.tsx 版本号多级兜底**：API → `/CHANGELOG.md` → localStorage 缓存，任一环节失败自动降级。
- **SettingsPage 更新弹窗完善**：实时日志显示修复、失败状态正确判断、暗黑模式适配。
---
## [v1.5.0] - 2026-06-10

### 新增功能
- **卡密IP限制功能**：生成卡密时可开启IP限制并设置数量，开启后卡密只能从已绑定的IP验证使用，不开启则不限制。
- **注册开关**：管理员设置页新增注册开关，关闭后发送验证码提示「注册暂未开放」。
- **商户页面开关**：管理员设置页新增商户页面开关，关闭后商户登录只显示「正在维护」。

### 功能优化
- **商户功能控制**：默认全部开启并显示到侧栏，保存空数组后严格隐藏（不回退默认全选）。
- **管理员设置页重构**：分为「基础设置」和「管理员设置」两个分区，开关卡片带说明文案。
- **登录超时机制**：7天无操作需重新登录，有操作持续有效。
- **表情图标替换**：lucide-react 替换遗留表情图标。
- **系统版本显示**：未知版本改为真实版本号显示。

### 修复
- 修复端到端加密密钥从16字节延长到32字节时 handle_encryption_key 返回值不足的编译错误。
- 修复 `CardWithTotal` 结构体缺失 `enable_ip_limit`/`max_ips` 字段导致的编译错误。
- 修复 `verify` 函数中IP校验代码变量作用域问题。
- 修复批量生成卡密时INSERT占位符数量与列数不匹配的数据库错误。

---

## [v1.4.6] - 2026-06-04

### 二改新增功能
- **管理员影子账号兑换支持**：管理员可在商户充值页通过同 ID 影子商户兑换充值卡密，不再限制仅商户角色。
- **套餐到期显示修复**：管理员我的页面和侧栏正确显示影子商户的套餐与到期时间，30天卡密兑换后不再显示为永久。
- **兑换规则增强**：同套餐兑换可叠加有效期；不同未过期套餐禁止兑换；免费/过期商户可任意兑换。
- **商户管理 API Key 完整显示**：商户列表中的 API Key 不再截断为省略号，完整显示整串密钥。

### 二改修复日志
- 修复管理员 `/profile` 未返回影子商户 `plan` 和 `plan_expires_at`，导致套餐显示为免费版的问题。
- 修复商户侧栏缺少「设置」入口，商户无法配置邮件/OAuth/商户功能控制的问题。
- 修复邮件验证码在不开启邮件服务时仍能通过开发模式发送的问题，现在未启用邮件服务将返回错误。
- 修复首次部署/系统更新后当前版本显示 local version 的兜底回退逻辑，改为只读 system_versions 表已安装版本。
- 修复 Settings 页 SMTP_PASS 输入框密码隐藏问题，改为明文显示授权码。

---

## [v1.4.4] - 2026-06-04

### 二改新增功能
- **自定义套餐价格周期**：套餐价格不再固定月/季/年，管理员可自定义价格项名称、天数和价格，例如 `1天（测试）`、`7天（周卡）`、`30天（月卡）`。
- **商户充值页动态套餐展示**：商户充值页自动读取后台自定义价格项，显示 `天数（名称）` 格式，并隐藏免费套餐。
- **充值兑换卡密增强**：支持兑换卡密生成、列表查看、点击复制、单个删除、批量删除、已生成/已使用/未使用统计。
- **兑换规则增强**：同套餐兑换可叠加会员时长；不同未过期套餐禁止兑换；免费或已过期商户可兑换新套餐。
- **自定义套餐过期降级**：所有非 `free` 套餐，包括自定义 VIP/SVIP/企业套餐，到期后自动降级为免费套餐。
- **套餐配置 UI 优化**：新增套餐管理/卡密生成分区切换；添加套餐默认只显示一个价格项，后续可手动增加。
- **商户管理移动端优化**：商户管理在移动端改为卡片布局，展示套餐、状态、API Key、注册时间、到期时间与快捷操作。
- **会员信息展示增强**：侧栏用户名旁展示当前会员套餐；我的页面展示会员套餐和到期时间，免费套餐仅显示套餐名。
- **设置页体验优化**：商户功能控制默认全选并以图标按钮显示；OAuth/邮件服务勾选启用后才展开详细配置。

### 二改修复日志
- 修复自定义 `vip` 套餐不显示到期时间的问题，改为自动判断所有非 `free` 套餐。
- 修复管理员视角商户功能区缺少商户充值入口的问题。
- 修复兑换卡密删除失败、批量删除缺失的问题。
- 修复不同套餐兑换时可能覆盖当前套餐的问题，新增同套餐叠加/不同套餐拒绝规则。
- 修复系统更新当前版本显示 `local version · local install version` 的问题，自动回退读取本地 Git/CHANGELOG。
- 修复邮件服务配置默认展开和 SMTP_PASS 文案不准确的问题，改为仅填写授权码。

---

## [v1.4.3] - 2026-05-31

### 二改新增功能
- **系统更新仓库切换**：系统更新源切换到正式仓库 `https://github.com/wocao123456/kamism`，后续后台一键更新将从正式主仓库拉取。
- **已安装版本持久化**：新增 `system_versions` 表记录当前已安装版本，避免代码目录 Git HEAD 变化后把“当前版本”误显示为“最新版本”。
- **系统更新实时日志轮询**：设置页系统更新在构建期间每 2 秒静默刷新状态，持续显示 Docker/Git 构建日志和阶段进度。
- **Profile/OAuth 迁移补全**：新增 `016_profile_oauth_columns.sql`，补齐头像、背景、管理员 API Key、OAuth provider_key 等跨系统迁移必需字段。
- **管理员旧 Token 兼容**：换系统后管理员 UUID 变化时，认证中间件可根据 JWT 内邮箱自动映射到当前数据库管理员 ID，避免“我的”页面提示用户不存在。
- **OAuth 临时邮箱策略**：第三方登录优先使用真实邮箱；QQ 返回真实 QQ 号时使用 `QQ号@qq.com`；无法获取真实邮箱时生成稳定匿名邮箱 `xxxxxxxxxxxx@kamism.com`。
- **全局背景稳定缓存**：背景图刷新网页时使用稳定 URL 与 localStorage 恢复，不再每次追加时间戳强制重新加载。
- **刷新后背景自动恢复**：`refreshProfile` 获取 `background_url` 后同步写入全局 store、CSS 变量和本地缓存，Layout 初始化时优先恢复本地背景。

### 二改修复日志
- 修复换系统后数据库缺少 `avatar_url` 导致 QQ/GitHub OAuth 登录报错的问题。
- 修复换系统后数据库缺少 `background_url` 导致自定义背景无法持久显示的问题。
- 修复换系统后数据库缺少 `provider_key` 导致 OAuth 老账号绑定和复登异常的问题。
- 修复管理员“我的”页面在旧 Token 指向旧 UUID 时返回 `用户不存在` 的问题。
- 修复“我的”页面上传头像成功但因缺列/旧用户 ID 无法持久显示的问题。
- 修复 OAuth 拿不到真实邮箱时生成 `A165...@qq.com` 这类伪 QQ 邮箱的问题。
- 修复 OAuth 拿不到邮箱时继续生成 `@oauth.local` 导致邮箱展示不友好的问题。
- 修复自定义背景刷新页面时因 `Date.now()` 时间戳变化导致每次重新加载的问题。
- 修复系统更新脚本仍指向旧二改仓库 `kamism-er-gai` 的问题。
- 修复 SQLx 已记录 migration 16 但源码缺失迁移文件时 app 启动失败的问题。

### 完整项目结构摘要
- `src/`：React/Vite 前端源码，包含页面、布局组件、状态管理、API 封装与全局样式。
- `src/pages/admin/`：管理员页面，包括设置页、我的页面、商户管理、套餐配置、消息管理等。
- `src/components/`：通用组件与主布局，包含侧栏、全局背景层、确认弹窗等。
- `src/stores/`：Zustand 状态管理，包括登录态、主题、确认弹窗、WebSocket 事件等。
- `src-tauri/src/routes/`：Rust 后端业务路由，包括认证、OAuth、Profile、商户、系统更新、黑白名单、API Key、消息等。
- `src-tauri/src/middleware/`：认证与操作日志中间件，负责 JWT 校验、管理员兜底映射、日志分类记录。
- `src-tauri/migrations/`：正式数据库迁移，包含初始化、API Key、OAuth 设置、Profile/OAuth 字段补全等。
- `server/`：后端服务启动入口，负责以独立服务方式运行 Axum API。
- `Dockerfile` / `Dockerfile.web`：后端与前端镜像构建配置。
- `docker-compose.yml`：多容器部署，包含 app、web、postgres、redis、rabbitmq。
- `docker-compose.standalone.yml`：单容器部署入口，适合一体化运行环境。
- `auto_update.sh`：后台系统更新脚本，负责拉取 GitHub、重构 app/web、写入已安装版本。
- `ensure_evn.sh`：首次部署自动生成 `.evn` 模板，已存在时严格不覆盖。
- `CHANGELOG.md`：版本变更与二改功能/修复日志。

---

## [v1.4.1] - 2026-05-31

### 新功能
- **系统更新中心**：设置页新增管理员专属系统更新，显示本地/远端 Git 版本、CHANGELOG 更新日志、构建实时日志。
- **一键拉取并重构**：管理员可在后台确认更新，自动拉取 GitHub 最新代码并重构 app/web 容器。
- **首次构建 .evn 模板生成**：新增 `ensure_evn.sh`，首次构建/更新时自动生成 `/root/kamism/.evn`，已存在则严格跳过不覆盖。
- **OAuth 会话保留策略**：OAuth 登录结果票据延长保留，避免回调后刷新立即提示会话过期。
- **登录有效期调整**：Access Token 调整为 7 天，Refresh Token 调整为 15 天。
- **OAuth 启用呼吸点**：三方 OAuth 自定义状态由文字增强为绿色呼吸点状态提示。
- **通用三方 OAuth 聚合配置**：后台支持配置服务地址、登录接口、用户信息接口、回调地址、AppID、AppKey 和启用类型。
- **OAuth 配置后端持久化**：新增 `oauth_settings` 数据表，配置不再依赖浏览器本地缓存。
- **OAuth 回调完成页**：新增 `/oauth/callback` 前端页面，授权完成后自动领取后端登录结果并写入登录态。
- **OAuth 自动注册/登录**：首次第三方登录自动创建商户账号；已绑定账号直接登录。
- **OAuth 真实资料同步**：支持同步第三方返回的真实邮箱、昵称、头像到商户资料。
- **管理员商户上下文兜底重建**：管理员账号可继续使用商户功能，商户上下文按当前管理员 ID 自动恢复。
- **全局自定义背景层**：新增全局固定背景层，后台任意页面可统一显示当前账号背景。
- **敏感操作强制重新登录**：邮箱换绑、密码修改成功后自动退出并跳回登录页。

### 修复优化
- 修复 QQ OAuth 未返回邮箱时使用 `QQ号@qq.com` 兜底，避免继续生成 `@oauth.local` 邮箱。
- 修复商户进入设置页时触发系统更新权限提示的问题，商户侧不再调用管理员更新接口。
- 修复系统更新日志展示：版本号和更新日志统一从 `CHANGELOG.md` 获取；无更新时显示完整日志，更新中显示构建日志。
- 修复 OAuth GitHub/QQ 返回字段兼容：支持数字型 `social_uid`、真实邮箱、外链头像，并同步到商户资料。
- 修复 OAuth 旧账号登录查询不存在 `role` 字段导致失败的问题。
- 修复管理员/商户背景图持久化与隔离：上传后立即同步全局状态，刷新/重登继续从后端读取。
- 修复自定义背景被根容器覆盖的问题，改为全局固定背景层显示。
- 修复侧栏头像同步：支持本地头像路径和 OAuth 外链头像。
- 修复 `admin@kamism.local` 影子账号自动生成问题，删除前端硬编码登录与后端启动生成逻辑。
- 修复管理员商户功能外键失败：管理员商户上下文按当前管理员 ID 兜底重建。
- 修复邮箱换绑完整流程：按当前用户 ID 更新，同步 admins/merchants，商户邮箱继续加密存储并更新 hash。
- 修复 API Key 重新生成格式与加密方式，恢复 `km_` 格式并统一使用加密字段工具写入 hash。
- 修复密码错误提示乱码、侧栏分隔符乱码、OAuth 配置商户可见等问题。

---

## [v1.3.0] - 2026-05-30

### 新功能
- **侧边栏2x2网格布局**：底部按钮改为2x2网格，包含「我的」「设置」「暗色模式」「退出」
- **「我的」页面独立路由**：从 `/admin/profile` 改为 `/profile`，admin 和 merchant 角色均可访问
- **全新的「我的」页面**：美观的用户信息管理页面
  - 头像上传（支持点击更换，hover显示"更换"提示，边框改为简洁2px solid var(--border-light)）
  - 用户名点击直接编辑，实时保存
  - API Key 折叠面板（默认脱敏显示 `****`，点击展开查看完整Key）
  - API Key 重新生成功能
  - 邮箱换绑功能（输入新邮箱→获取验证码→验证→换绑，带60秒倒计时）
  - 修改密码弹窗（原密码/新密码/确认密码，三字段校验）
- **「设置」页面独立路由**：包含自定义背景和OAuth配置
- **自定义背景上传**：支持上传背景图保存到服务器磁盘，换系统迁移保留
- **三方OAuth自定义配置**（原素颜聚合登录）
  - 支持 13 种登录方式：QQ/微信/支付宝/微博/百度/抖音/华为/Google/Microsoft/Twitter/钉钉/Gitee/GitHub
  - AppID + AppKey（密码框输入）+ 回调地址配置
  - 多选启用的登录方式，点击切换
  - 根据配置动态显示登录按钮，通过素颜聚合登录API获取跳转地址
- **nginx 代理修复**：删除独立 `/profile` location，统一走 `/api/` 代理
- **Authorization header 转发**：nginx 所有 API location 正确转发 `Authorization` header
- **前端 api() 统一前缀**：所有请求统一走 `/api/xxx`，彻底修复 `/profile` 页面刷新401问题
- **操作日志详情增强**：对 `/profile/upload-background`、`/profile/upload-avatar`、`/profile/api-key`、`/profile/change-password`、`/profile/change-email` 等做中文映射（上传背景/上传头像/重新生成Key/修改密码/更换邮箱）
- **Dashboard 操作日志中文映射**：`formatLogDetail` 函数映射所有profile相关路径
- **移动端响应式**：侧边栏支持移动端 overlay + hamburger menu

### Bug修复
- 头像上传返回 401 错误修复（nginx `proxy_set_header Authorization $http_authorization`）
- `/profile` 页面刷新 401 错误修复（删除nginx独立 `/profile` location）
- 登录页 TypeScript 编译错误（移除不存在的 lucide-react 导出 `Chrome`、`Qq`）
- 设置页面 TypeScript 编译错误（移除未使用的 `Plus`、`X` 导入）
- 设置页面 title 「登录快捷设置」→「登录快捷配置」
- auth.ts 模板字符串语法错误（`Bearer ${token}` 改为 `'Bearer ' + token`）
- auth.ts `refreshProfile` 函数修复，token 过期自动刷新
- 操作日志中显示详细路径 `/profile/upload-background` 改为中文描述
- Dashboard.tsx `getActionLabel` 返回值类型变更导致 TS2322 错误修复
- 头像 404 问题（浏览器缓存旧头像路径，清理缓存解决）

### UI改进
- 头像边框去除紫色圆环，改为简洁 `2px solid var(--border-light)`
- 「我的」页面统一使用 `card` + `btn` 标准风格
- API Key / 邮箱换绑折叠面板美化：展开时紫色背景高亮 `rgba(124,106,247,0.08)` + 紫色边框 `rgba(124,106,247,0.2)`
- 折叠面板箭头图标展开时变为主题色 `var(--accent)`
- 折叠面板整体可点击区域增大，用户体验更好
- 设置页面 OAuth 配置按钮美化（圆角 `border-radius: 8`、过渡动画 `transition: all 0.2s`）
- 侧边栏底部2x2网格布局，按钮间距 `gap: 6`，hover 背景 `var(--bg-hover)`
- 侧边栏用户头像区域边框 `2px solid var(--border-light)`

### 架构改进
- 前后端 API 统一前缀策略（统一走 `/api`，不再有特殊路径）
- nginx SPA fallback 正确处理非 API 路径返回 index.html
- 后端新增 `profile.rs` 路由：`/profile`、`/profile/avatar`、`/profile/api-key`、`/profile/change-password`、`/profile/send-email-code`、`/profile/change-email`
- 后端操作日志中间件增强：记录请求体关键字段

---

## [最新] - 2026-05-29

### Bug修复
- 黑白名单卡密类型：修复黑名单查询遗漏 `card_blacklist` 表，现在支持 `tp=card` 查询
- 黑名单SQL：`card_blacklist` 表没有 `blocked_until` 列，移除错误查询字段
- 操作日志UUID：移除所有日志中的UUID后缀（如"删除卡密 5c0a0d24"改为"删除卡密"）
- API管理toast：统一使用 `react-hot-toast` 库，风格与风控页面一致
- 操作日志过滤：跳过 `/health`、`/api/ts/*`、`/api/frontend-log` 等不需要记录的路径
- API字段对齐：后端返回 `user_type` 字段名与前端一致
- API管理空状态emoji乱码修复，显示纯文本"暂无密钥"
- 统计行清理：移除多余标记，只保留昨天/今天/合并
- 操作日志中间件编译错误修复（body读取、unused vars、classify_module语法）
- op_log中间件：`use bytes::Bytes` 改为 `use http_body_util::BodyExt`
- `classify_module` if链多余闭合括号，改为 `if ... { return ...; }` 模式
- `public_api.rs` 3个unused变量警告修复

### 新功能
- 黑白名单支持卡密类型（`tp=card`），管理员和商户均可操作
- 操作日志显示具体操作内容（如"添加到黑名单"、"删除卡密"等）
- API管理添加/删除/启用密钥时弹幕toast提示
- 操作日志自动过滤健康检查和外部API调用
- `admin/whitelist_stats` 返回 `card_total` 字段

### UI改进
- API管理空状态显示纯文本"暂无密钥"
- 统计行移除 `✅ 0 ❌ 0`，只保留 `昨天 N 条 · 今天 N 条 · 合并 N 条`
- 所有toast提示统一风格（绿色成功/红色失败）
- 操作日志图标美化（渐变圆形背景、彩色标签）

---

## [v1.2.0] - 2026-05-29

### Bug修复
- 操作日志中间件重写：从请求体提取关键字段，返回详细中文detail
- 后端编译错误修复（Rust语法、body读取、unused变量）
- 前端TypeScript类型修复（JSX.Element → React.ReactNode）
- 模板字符串转义导致的JSX语法错误
- `op_log_middleware` 注册到 `lib.rs`，修复中间件从未被调用
- 清理未使用的lucide-react导入

### 新功能
- 操作日志详细化：显示具体操作如"批量生成30张卡密"、"添加IP到黑名单"
- 操作日志图标：20+种操作的彩色渐变图标（登录/删除/新建/修改等）
- 操作日志分类：完善 `classify_action()` 和 `classify_module()` 中文映射
- API文档英文改中文（Fixed value → 固定值，auth_key说明等）
- 中间件记录所有写操作含未认证请求

### UI改进
- 操作日志渐变圆形背景、彩色标签、模块名圆角标签
- 用户类型胶囊（管理员红色/商户蓝色）
- 层级布局优化（图标圆形 → 右侧文字区）
- 主题跟随系统深色/浅色模式

---

## [v1.1.0] - 2026-05-28

### 新功能
- API管理页面：密钥管理、签名测试、加解密测试
- 鉴权密钥自动生成（5分钟有效）
- 调用日志与实时统计（昨天/今天/合并请求数）
- API文档手机端适配

### Bug修复
- 前端路由图标导入修复
- 模板字符串转义修复
- TS命名空间修复
- API管理显示在商户功能区域
- 手机端响应式布局修复（useIsMobile hook）

---

## [v1.0.0] - 2026-05-27

### 首次发布
- 核心功能：卡密管理、商户管理、套餐配置、风控设置
- API接口：激活、验证、解绑、心跳、签名、加解密
- Docker Compose一键部署
- 安全特性：JWT认证、速率限制、设备封禁、IP黑名单
- RabbitMQ消息队列集成
- Redis缓存与会话管理
- PostgreSQL数据库与迁移
- 前端React + 后端Rust Axum全栈架构
