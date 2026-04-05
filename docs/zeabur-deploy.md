# Zeabur 部署说明

## 推荐方式

当前代码最适合先以 **单服务** 方式部署到 Zeabur：

- 使用根目录 `Dockerfile`
- 启动入口：`node apps/platform/server.js`
- 一个端口同时提供：
  - 控制台页面
  - 控制台 API
  - 增强网关 `/v1/*`

这样做的原因是：

- 目前控制台与网关共享同一份控制平面数据
- 这份数据现在是文件存储
- 在 Zeabur 上拆成两个容器会天然分离文件系统

所以在你还没把控制平面迁到 Postgres 之前，**单服务是最稳的部署方案**。

## 需要配置的环境变量

最少：

```env
PORT=8080
LIFECOACH_PLATFORM_PORT=8080
LIFECOACH_CONTROL_PLANE_DATA=/data/control-plane.json
LIFECOACH_CONTROL_PLANE_STATE_ROOT=/data/state
```

如果要启用真实上游增强代理，再加：

```env
LIFECOACH_GATEWAY_PROXY_ENABLED=true
LIFECOACH_GATEWAY_UPSTREAM_BASE_URL=https://ai.t8star.cn/v1
LIFECOACH_GATEWAY_UPSTREAM_API_KEY=replace-with-your-upstream-key

CREATION_AI_CHAT_MODEL=gpt-4o
CREATION_AI_VISION_MODEL=gemini-2.5-flash
CREATION_AI_IMAGE_MODEL=doubao-seedream-4-0-250828
CREATION_AI_VIDEO_MODEL=veo3.1-fast
CREATION_AI_TTS_MODEL=tts-1
CREATION_AI_ASR_MODEL=whisper-1
```

## 数据持久化

请给 Zeabur 服务挂一个持久化目录，并让它映射到：

- `/data/control-plane.json`
- `/data/state`

否则重启后：
- 用户账号
- session
- API key
- usage log

都会丢失。

## 健康检查

可用：

```text
/healthz
```

## 如果之后要拆成两服务

仓库里也准备了：

- `Dockerfile.console`
- `Dockerfile.gateway`

但只有在你把控制平面迁到共享数据库之后，才建议在 Zeabur 上拆成两个服务。
