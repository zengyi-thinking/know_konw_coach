# OpenClaw 适配说明

本项目采用 OpenClaw 官方建议的定制方式：
- 配置位于 `~/.openclaw/openclaw.json`
- 工作区位于 `~/.openclaw/workspace`
- app runtime 位于 `~/.openclaw/app/lifecoach/runtime`
- 动态状态位于 `~/.openclaw/state/lifecoach`

因此本仓库不会修改 OpenClaw 主仓库，而是提供一个可安装的 lifecoach package。

仓库内部结构已经重构为：
- `packages/lifecoach-core/`
- `packages/lifecoach-workspace/`
- `packages/lifecoach-installer/`

skills 仍采用 AgentSkills 兼容结构。
.agents 仍用于存放专用 agent 定义。
