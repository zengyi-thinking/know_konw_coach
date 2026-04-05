# OpenClaw 适配说明

本项目采用 OpenClaw 官方建议的定制方式：
- 配置位于 `~/.openclaw/openclaw.json`
- 工作区位于 `~/.openclaw/workspace`

因此本仓库不会修改 OpenClaw 主仓库，而是提供一个可合并到 workspace 的模板。

skills 采用 AgentSkills 兼容结构。
.agents 用于存放专用 agent 定义。
