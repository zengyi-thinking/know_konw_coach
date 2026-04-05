# lifecoach-core

运行时核心。

包含：
- `src/`：路由、记忆、检索、网关、演化与上下文装配
- `schemas/`：结构契约
- `tests/`：自测与真实网关验证脚本

职责：
- 读取静态 workspace 资产
- 处理动态 state 路径与落盘
- 为 OpenClaw 里的 life coach 提供稳定执行层
