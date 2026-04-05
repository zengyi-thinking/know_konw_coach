# 多模态增强与控制台架构

## 1. 产品模式

Life Coach 建议分成两个明确产品层级：

### 1.1 基础版
- 用户只需把安装命令发给 OpenClaw
- 不需要单独注册控制台账号
- 不需要额外 API key
- 只提供文本教练能力
- 依赖本地静态资产：
  - prompts
  - agents
  - skills
  - knowledge
  - memory
  - safety

### 1.2 增强版
- 用户到你的官网/控制台注册登录
- 用户创建自己的 `LIFECOACH_GATEWAY_API_KEY`
- 把 key 配到本地 OpenClaw / shell 私有环境
- 开启多模态与增强推理能力：
  - vision
  - ASR
  - TTS
  - image / video 扩展
  - “小脑”辅助思考链路

增强版不是把上游网关 key 发给用户，而是发你自己的平台 key。

## 2. 当前仓库里已经有的基础

仓库里与这个设计直接相关的现有部分：

- 网关默认模型配置：
  - `packages/lifecoach-installer/config/lifecoach.gateway.defaults.json`
- 网关能力判断：
  - `packages/lifecoach-core/src/gateway/capability_detector.js`
- 多模态模型选择：
  - `packages/lifecoach-core/src/gateway/multimodal_adapter.js`
- chat / vision 代理：
  - `packages/lifecoach-core/src/gateway/chat_executor.js`
- ASR：
  - `packages/lifecoach-core/src/gateway/audio_executor.js`
- TTS：
  - `packages/lifecoach-core/src/gateway/tts_executor.js`
- 官网/控制台原型：
  - `site/pages/*.md`
- API 草案：
  - `site/api/openapi.yaml`

当前产品逻辑已经具备一个关键分层：

- 无 key：`basic`
- 有 key：`enhanced`

这是正确方向，后续只需要把“key 从哪里来、如何授权、如何配额、如何分套餐”补齐。

## 3. 你的真实业务模型

你的平台不是底层模型提供商，而是一个受控的上层网关与控制台。

因此系统应拆成三层：

### 3.1 OpenClaw 调料包
职责：
- 文本教练逻辑
- skills / knowledge / memory / safety
- 会话路由
- 本地用户体验

### 3.2 你的控制台与授权平台
职责：
- 用户注册登录
- 创建 / 吊销 / 查看 API key
- 展示套餐和功能权限
- 给 OpenClaw 输出接入配置片段
- 做配额、计费、审计、风控

### 3.3 你的多模态代理网关
职责：
- 校验你自己发给用户的 API key
- 按用户权限决定能不能调：
  - chat
  - vision
  - ASR
  - TTS
  - image
  - video
  - 小脑增强推理
- 代理调用上游模型服务
- 记录用量、限流、日志、错误

## 4. 非常重要的安全原则

### 4.1 上游 key 绝不能给最终用户
- 用户拿到的必须是你自己平台的 key
- 你的上游网关 key 只能存在于你控制的后端环境变量 / secrets 中
- OpenClaw 客户端永远不能直接拿到上游 key

### 4.2 你的平台 key 也不要明文存库
建议：
- 生成一次性完整值，如 `lc_live_xxx`
- 数据库存：
  - `prefix`
  - `hashed_key`
  - `last_used_at`
  - `status`
  - `owner_user_id`
  - `scope`
- 完整 key 只展示一次

### 4.3 不要把“控制台登录 token”和“OpenClaw 调用 key”混为一体
- 控制台登录：浏览器 session / JWT / cookie
- OpenClaw 调用：独立 API key

### 4.4 你刚发出来的上游真实 key 应视为已泄露
建议立刻在上游服务处轮换，而不是继续沿用。

## 5. 推荐技术方案

## 5.1 前台站点与控制台
推荐：
- Next.js App Router
- TypeScript
- Tailwind
- 部署在 Vercel

原因：
- Next.js Route Handlers 可以直接做控制台 API
- Vercel 对 Next.js 是零配置优先路径
- 营销页、控制台页、文档页都能放在一个项目里

官方资料显示：
- Next.js Route Handlers 是 `app` 目录内的后端请求处理能力
- Vercel 对 Next.js 提供零配置部署

## 5.2 登录与用户系统
推荐：
- Supabase Auth
- 邮箱密码 + Magic Link
- 后续可加 Google 登录

原因：
- Next.js 集成成熟
- 邮箱登录、Magic Link、OAuth 都现成
- 后面做用户表、套餐表、key 表很顺手

## 5.3 数据库
推荐：
- Supabase Postgres

用途：
- users profile
- plans
- api_keys
- usage_logs
- entitlements
- audit_logs
- model_access_rules

## 5.4 文件存储
推荐：
- Supabase Storage

用途：
- 用户上传音频
- 临时图片
- 调试样本
- 可能的语音缓存 / 结果文件

Storage 和 RLS 可以一起使用，适合做“用户只能看到自己的上传内容”。

## 5.5 多模态代理网关
推荐：
- 单独一个 Node.js 服务
- Fastify 或 Express 都可以
- 部署在 Render / Fly.io 这类长期运行的 Node 服务平台

不建议一开始把“所有重代理逻辑”都压在 Vercel Route Handlers 里，原因是：
- 你会处理音频文件上传
- 你会处理较长推理链路
- 你会接入 TTS / ASR / vision / video
- 未来还会做“小脑”多步调用

这更像稳定的 API 网关，而不是只有少量 BFF 接口的网页后端。

控制台与官网可以在 Vercel。
模型代理与多模态网关建议独立部署。

## 6. 推荐系统拓扑

### 6.1 最推荐的拆分

#### Web App
- Next.js
- Vercel
- 域名示例：`console.your-domain.com`

职责：
- 登录注册
- 控制台
- 创建 key
- 展示用量
- 返回 OpenClaw 配置片段

#### Auth + DB
- Supabase

职责：
- 用户身份
- 会话
- 表数据
- RLS
- 文件存储

#### Gateway API
- Node.js / Fastify
- Render 或 Fly.io
- 域名示例：`api.your-domain.com`

职责：
- `Authorization: Bearer lc_live_xxx`
- key 校验
- 配额与套餐判断
- 调上游模型网关
- 记录 usage
- 执行“小脑”推理编排

## 7. 用户链路

### 7.1 基础用户
1. 用户把安装命令交给 OpenClaw
2. OpenClaw 安装 lifecoach 调料包
3. 用户不配置 key
4. 只使用本地文本教练能力

### 7.2 增强用户
1. 用户打开官网
2. 注册 / 登录
3. 进入控制台
4. 创建一个 API key
5. 复制 OpenClaw 配置片段
6. 把 `LIFECOACH_GATEWAY_API_KEY` 注入本地环境
7. OpenClaw 自动从 `basic` 升级为 `enhanced`

## 8. 控制台应该有哪些页面

你现有 `site/pages/*.md` 的思路是对的，建议落成以下真实页面：

### 8.1 Landing
- 产品价值
- 基础版 vs 增强版
- 安装按钮
- 去控制台按钮

### 8.2 Console Home
- 当前套餐
- 当前 key 数量
- 最近用量
- 当前功能权限

### 8.3 API Keys
- 创建 key
- 吊销 key
- 查看 prefix / 创建时间 / 最近使用时间 / 状态

### 8.4 OpenClaw Integration
- 一键复制环境变量片段
- 一键复制 PowerShell / Bash 片段
- 显示当前可用模型和功能位

### 8.5 Models & Capabilities
- text
- vision
- ASR
- TTS
- image
- video
- cerebellum / thinker

### 8.6 Usage
- 调用次数
- token / 秒数 / 文件数
- 失败率
- 最近 30 天趋势

## 9. 网站后端 API 建议

你现在 `site/api/openapi.yaml` 已经有雏形，建议扩成两类：

### 9.1 控制台 API
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-out`
- `GET /api/me`
- `GET /api/me/usage`
- `GET /api/keys`
- `POST /api/keys`
- `POST /api/keys/{id}/revoke`
- `GET /api/models`
- `GET /api/integration/openclaw`

这些可以做在 Next.js Route Handlers 里。

### 9.2 代理网关 API
- `POST /v1/chat/completions`
- `POST /v1/audio/transcriptions`
- `POST /v1/audio/speech`
- `POST /v1/images/generations`
- `POST /v1/video/generations`
- `POST /v1/cerebellum/think`

这些建议在独立 gateway 服务里实现。

## 10. “小脑辅助思考”怎么放

建议不要把“小脑”当成一个前端可见的单独模型名，而是当成平台能力：

- 对用户展示为：
  - `智能增强`
  - `深度辅助思考`
  - `高阶多步分析`

后台实现上可以是：
- 同一个请求中多步路由
- 额外分类器 / 审核器 / 重写器
- 先摘要再主答复
- 先视觉理解 / 语音转写再进入主教练链路

建议在网关里做一个能力开关：
- `feature_text`
- `feature_vision`
- `feature_asr`
- `feature_tts`
- `feature_image`
- `feature_video`
- `feature_cerebellum`

## 11. 关键数据库表建议

### 11.1 users
- `id`
- `email`
- `display_name`
- `plan_id`
- `status`
- `created_at`

### 11.2 api_keys
- `id`
- `user_id`
- `name`
- `prefix`
- `hashed_key`
- `status`
- `created_at`
- `last_used_at`
- `revoked_at`

### 11.3 entitlements
- `user_id`
- `feature_text`
- `feature_vision`
- `feature_asr`
- `feature_tts`
- `feature_image`
- `feature_video`
- `feature_cerebellum`
- `monthly_request_limit`

### 11.4 usage_logs
- `id`
- `user_id`
- `api_key_id`
- `endpoint`
- `model`
- `request_type`
- `input_units`
- `output_units`
- `latency_ms`
- `status_code`
- `created_at`

### 11.5 upstream_requests
- `id`
- `usage_log_id`
- `provider`
- `provider_model`
- `cost_estimate`
- `status`
- `error_code`

## 12. API key 发放策略

推荐 key 规范：
- 开发环境：`lc_test_...`
- 生产环境：`lc_live_...`

服务端流程：
1. 生成随机 key 原文
2. 存 hash，不存明文
3. 返回一次完整值
4. 后续只显示 prefix
5. 每次请求时按 hash 查 key

## 13. 与上游网关的关系

你的平台应该是：

用户 OpenClaw
→ 你的 `api.your-domain.com`
→ 你的平台鉴权 / 配额 / feature gate
→ 你的上游模型服务

而不是：

用户 OpenClaw
→ 直接拿上游 key 调上游

前一种模式你才拥有：
- 用户系统
- 授权
- 套餐
- 配额
- 可撤销 key
- feature gate
- 小脑能力开关
- 审计

## 14. 部署建议

### 14.1 第一阶段
- Web Console：Vercel
- Auth + DB + Storage：Supabase
- Gateway：Render

这是最容易起步的一套。

### 14.2 第二阶段
- 给 Gateway 加 Redis 限流
- 接 Sentry / Logtail / Axiom 做日志
- 接 Stripe 做付费套餐
- 加异步任务队列处理长视频 / 长音频

### 14.3 第三阶段
- 给不同国家区域做多区域代理
- 给不同模型供应商做路由
- 做企业版 / 团队版 / 管理后台

## 15. 和官方资料一致的实现注意点

根据官方文档，下面这些点要严格遵守：

- Next.js Route Handlers 很适合做控制台 API
- Supabase Auth 可直接用于 Next.js App Router
- Supabase 的 secret / service role 只应在后端组件中使用
- Supabase RLS 应用于所有暴露给浏览器的数据表
- Supabase Storage 也应通过 RLS 控制上传和读取
- Supabase Edge Functions 适合低延迟 API、Webhook、轻量 AI 编排，但重型长任务应拆到后台 worker
- Vercel 适合部署 Next.js Web App，但模型代理是否与它放在一起要看你请求时长与多媒体负载

## 16. 对当前仓库的直接建议

下一步建议按这个顺序推进：

1. 先把 `site/` 从 markdown 原型升级为真实 Next.js 控制台项目
2. 在仓库里新增 `apps/console` 或 `packages/lifecoach-console`
3. 接 Supabase Auth + Postgres
4. 实现 `api_keys`、`entitlements`、`usage_logs`
5. 单独新增 `apps/gateway` 或 `packages/lifecoach-gateway`
6. 让 OpenClaw 安装器默认输出：
   - 基础文本版可立即用
   - 增强版去控制台拿 key
7. 最后再接“小脑”能力路由

## 17. 最终判断

你的产品最合理的商业与工程形态，不是“把上游 key 发给用户”，而是：

> 用 OpenClaw 调料包承载本地教练逻辑，用你的控制台承载用户与授权，用你的网关承载多模态与智能增强能力。

这样普通用户可以零门槛用基础文本版；
需要更智能体验的用户，再去你的站点登录、创建 key、开通增强功能。
