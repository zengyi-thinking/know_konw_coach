# 分层治理架构

## 1. 目标

本文件把 `product-design-qa-summary.md` 中“分层切口”的产品判断，落成当前仓库内可执行的治理结构。

目标不是再抽象一层概念，而是回答：

- 哪些层属于宿主与接入
- 哪些层属于人格与边界
- 哪些层属于后台治理 agent
- 哪些层允许自动优化
- 哪些层必须进入系统内审
- proposal / review / 自进化 应该按照什么边界工作

## 2. 外部案例借鉴

本轮分层治理主要借鉴了以下公开资料：

### 2.1 LangChain Supervisor / Subagents
参考：
- https://docs.langchain.com/oss/python/langchain/supervisor
- https://docs.langchain.com/oss/python/langchain/multi-agent/subagents

借鉴点：
- 用一个主 supervisor 统一调度多个专用子 agent
- 子 agent 不直接与用户争夺主导权
- 子 agent 的主要价值之一是 **context isolation**

映射到本项目：
- 用户前台只感受到一个 `life-coach`
- `memory-curator`、`reflection-reviewer`、`safety-guardian` 等处于后台治理层

### 2.2 OpenAI Agents SDK Guardrails
参考：
- https://openai.github.io/openai-agents-python/guardrails/

借鉴点：
- guardrail 应该与 agent / tool 的边界紧密关联
- 输入、输出、工具调用都应有明确 tripwire
- 一旦触发 guardrail，应立即中止当前路径

映射到本项目：
- 不再只用硬编码 blocklist
- 改为由分层治理清单决定 proposal 能否触碰某层

### 2.3 LangMem Memory Manager
参考：
- https://langchain-ai.github.io/langmem/
- https://langchain-ai.github.io/langmem/background_quickstart/

借鉴点：
- 记忆应区分 hot path 与 background enrichment
- 结构化 memory manager 比“把所有会话都当记忆”更稳
- memory 的真相源应是结构化记录，而不是随手拼接的情绪碎片

映射到本项目：
- `user_model_memory` 单独成为一层
- 强调 runtime-managed，而不是任意 proposal 改写

### 2.4 AutoGen Group Chat / Anthropic Subagents
参考：
- https://microsoft.github.io/autogen/0.4.6/user-guide/core-user-guide/design-patterns/group-chat.html
- https://docs.anthropic.com/en/docs/claude-code/sub-agents

借鉴点：
- 多 agent 协作需要明确 manager / orchestrator
- 子 agent 的独立上下文能减少主线程污染
- 适合把专用能力放在后台，而不是让所有 agent 直接面向用户

映射到本项目：
- agent 治理层被单独列出
- 引入 agent 仲裁顺序

## 3. 当前落地结果

### 3.1 机器可读的治理清单
文件：
- `packages/lifecoach-workspace/content/.lifecoach/layer-governance.json`

当前把系统拆成 7 层：

1. `host_integration`
2. `core_identity_policy`
3. `agent_governance`
4. `decision_engine`
5. `skill_surface`
6. `user_model_memory`
7. `surface_adapter`

每层都定义了：
- `paths`
- `allowedMutation`
- `ownedBy`

### 3.2 Workspace manifest 与治理绑定
文件：
- `packages/lifecoach-workspace/content/.lifecoach/workspace.manifest.json`

新增：
- `governance.layerManifestPath`

这样 runtime 可以把 workspace 内容与治理清单一起加载。

### 3.3 Guardrails 不再只靠硬编码
文件：
- `packages/lifecoach-core/src/evolution/guardrails.js`
- `packages/lifecoach-core/src/governance/layer_governance.js`

当前 proposal 会先按 target 匹配 layer，再根据 layer 的 `allowedMutation` 决定：
- `manual_only`：直接阻断
- `proposal_with_system_review`：进入后台系统内审
- 其他层：允许继续进入 proposal 流程

### 3.4 校验脚本可发现治理漂移
文件：
- `scripts/validate-package.js`

新增校验：
- `layer-governance.json` 是否存在
- 每层路径是否真实存在
- evolution 配置引用的 layer id 是否存在
- workspace protected targets 是否与治理层一致

### 3.5 自测覆盖治理映射
文件：
- `packages/lifecoach-core/tests/run-selftest.js`

新增验证：
- `layer governance` 清单存在
- `workspace/skills/...` 能正确映射到 `skill_surface`
- safety proposal 会被治理层阻断
- `surface_adapter` proposal 会被标记为系统内审

## 4. 这次分层治理解决的关键问题

### 4.1 解决“哪些能自动改、哪些不能自动改”不清楚的问题
之前：
- 主要靠硬编码路径 blocklist
- 扩展新层级时容易漏掉

现在：
- 每层都有 `allowedMutation`
- 自进化边界从“路径例外”升级为“层级规则”
- 高影响 proposal 会进入后台系统内审，而不是暴露成用户审批流程

### 4.2 解决“多 agent 只是概念，没有仲裁结构”的问题
之前：
- 文档里有多 agent，但代码里缺少统一治理层抽象

现在：
- `agent_governance` 成为单独层
- 有 `agentOrder` 可作为后续仲裁实现基础

### 4.3 解决“memory 到底算内容层还是动态层”不清楚的问题
之前：
- memory 模板、memory 规则、runtime state 比较混

现在：
- `user_model_memory` 被单独抽出来
- 明确它是 `runtime_managed`

### 4.4 解决“宿主 / 调料包 / surface adapter` 边界混”的问题
之前：
- installer、console、gateway 和 core 容易混成一个大系统

现在：
- `host_integration`
- `surface_adapter`
- `decision_engine`

三层分开后，后续迁移到其他宿主会更容易。

### 4.5 解决“后续跨产品迁移没有抓手”的问题
之前：
- 只有 package 分层，还不足以支持跨产品内核抽象

现在：
- 至少已经把可迁移的治理层和不可轻动的身份层区分出来
- 后续可以继续抽 `Surface Adapter`

## 5. 仍未完全解决的问题

这次是分层治理的第一步，下面这些还没有完全落地：

- `persona-guardian` 仍未真正成为实际运行模块
- agent 仲裁顺序现在只存在于 manifest，还未驱动 runtime 决策
- `proposal_with_system_review` 目前只有后台内审骨架，还没有更细的自动复核器
- “越用越对味”的指标体系还未落成可计算评分
- 跨产品 adapter 还没有从 OpenClaw 中真正拆出来

## 6. 下一步最合理的优化顺序

基于当前成果，建议下一轮按这个顺序继续：

1. 把 agent 仲裁顺序真正接入 runtime
2. 定义 system review workflow
3. 定义“对味评分”指标
4. 再做跨产品 adapter 抽象
