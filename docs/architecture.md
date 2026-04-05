# 架构说明

本项目已经从单一 workspace template 重构为三层 package：

- `packages/lifecoach-core/`：运行核心
- `packages/lifecoach-workspace/`：静态 prompts / agents / skills / knowledge / memories
- `packages/lifecoach-installer/`：安装与分发

安装后：
- 静态内容进入 `~/.openclaw/workspace`
- 运行核心进入 `~/.openclaw/app/lifecoach/runtime`
- 动态数据进入 `~/.openclaw/state/lifecoach`
