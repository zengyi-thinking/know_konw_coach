# OpenClaw Life Coach 执行层架构设计

## 1. 文档目标

这份文档的目标是回答一个核心问题：

> 如何让 OpenClaw Life Coach 调料包不只是“会说”，而是具备可执行、可扩展、可验证的真实效果？

为实现这一目标，本项目不能只依赖 prompts / skills / agents 的 markdown 说明，还必须逐步引入：
- 路由层
- 检索层
- 记忆层
- 多模态接入层
- 工具 / 插件层

本文件定义这些执行层模块的职责、边界、数据流与演进方向。

---

## 2. 总体架构

建议采用四层结构。

### 第一层：认知定义层（Markdown）
负责：
- 人格
- 教练风格
- 技能说明
- 提问结构
- 边界规则
- 知识内容

目录：
- `packages/lifecoach-workspace/content/prompts/`
- `packages/lifecoach-workspace/content/.agents/`
- `packages/lifecoach-workspace/content/skills/`
- `packages/lifecoach-workspace/content/knowledge/`
- `packages/lifecoach-workspace/content/memories/`

这一层定义“应该如何思考与回应”。

---

### 第二层：配置与调度层（OpenClaw Config）
负责：
- agent 与 workspace 绑定
- skills 可见性与 allowlist
- 模型配置
- 环境变量注入
- 多模态开关
- 部分路由策略配置

目录：
- `packages/lifecoach-installer/config/openclaw.json.template`
- `packages/lifecoach-installer/install/openclaw-config.patch.example.json`
- `packages/lifecoach-installer/config/*.env.example`

这一层定义“系统在什么条件下允许调用什么能力”。

---

### 第三层：执行层（代码 / 规则引擎）
负责：
- 输入分类
- skill 路由
- safety 分流
- memory 处理
- knowledge 检索
- 多模态请求编排
- 结构化输出

未来建议模块：
- `packages/lifecoach-core/src/router/skill_router`
- `packages/lifecoach-core/src/router/safety_router`
- `packages/lifecoach-core/src/retrieval/knowledge_retriever`
- `packages/lifecoach-core/src/memory/memory_manager`
- `packages/lifecoach-core/src/gateway/multimodal_adapter`

这一层定义“系统如何稳定执行”。

---

### 第四层：工具 / 插件层（OpenClaw Tool / Plugin）
负责：
- 对外部模型网关发起请求
- 执行检索与结构化处理
- 提供特殊工具能力
- 承接多模态与外部服务

可能形式：
- 直接利用 OpenClaw 内建工具
- 增加 workspace skill 对内建工具的调用规则
- 后续设计最小 plugin，提供结构化工具函数

这一层定义“系统真正能做什么”。

---

## 3. 关键模块设计

## 3.1 Skill Router

### 目标
根据用户当前输入与会话状态，把问题导向最合适的 skill，而不是随机回应。

### 输入
- 用户当前文本
- 会话历史摘要
- memory 命中结果
- knowledge 命中结果（可选）
- 输入模态类型（文本 / 图像 / 语音 / 文件）
- safety 风险评分

### 输出
- 应调用的 skill
- 是否继续普通 life-coach 对话
- 是否需要先转 safety
- 是否需要读取特定 knowledge 块

### 首版建议支持的路由目标
- `coach-intake`
- `goal-clarify`
- `weekly-review`
- `emotional-debrief`
- `habit-reset`
- `voice-checkin`
- `vision-reflection`
- `default-coach-response`

### 路由判断维度
- 用户是在倾诉还是在求行动方案
- 用户是在目标模糊还是执行卡住
- 用户是在做周期复盘还是单次事件复盘
- 当前是否属于高风险场景
- 当前输入是否为多模态材料

### 初期实现建议
第一阶段可先做“规则路由”：
- 关键词
- 输入特征
- 会话状态
- memory 标签

第二阶段再升级为：
- 规则 + LLM 辅助判别
- 结构化分类输出

---

## 3.2 Safety Router

### 目标
优先识别是否越过 coaching 合理边界，防止系统在高风险情况下仍继续普通教练对话。

### 输入
- 当前用户输入
- 会话上下文
- memory 中的敏感边界信息

### 输出
- 风险等级
- 是否允许进入普通 coaching 流程
- 是否应切换到 safety-guardian 约束模式
- 是否建议现实世界专业支持

### 风险等级建议
- `low`：普通 life coach 场景
- `medium`：情绪波动较强，需要收紧表达和边界
- `high`：涉及自伤、危机、严重风险，不继续普通 coaching

### 首版判断方向
- 是否出现自伤、自杀、严重失控、现实安全威胁
- 是否要求诊断或治疗判断
- 是否要求法律、医疗、投资类确定性建议
- 是否出现明显依赖性表达并要求 agent 替代现实支持

### 实现建议
- 首版：规则优先
- 后续：规则 + LLM 分类器联合判定

---

## 3.3 Knowledge Retriever

### 目标
从知识库中精准选择最相关的知识块，而不是整库灌输。

### 输入
- 当前用户问题
- 当前 skill
- 当前会话状态
- memory 中的长期主题

### 输出
- 命中的知识块列表
- 每个知识块的相关性评分
- 推荐注入方式（全文 / 摘要 / 仅结论）

### 知识块元数据建议
每个知识块建议包含：
- `id`
- `title`
- `type`（framework / prompt / case / safety）
- `topics`
- `scenes`
- `riskLevel`
- `recommendedSkills`
- `recommendedAgents`
- `keywords`
- `summary`

### 调用原则
- 优先少量高相关知识块
- 优先摘要注入，不直接整篇贴给模型
- skill 明确时，优先调与该 skill 匹配的知识块
- 高风险场景下，优先 safety 知识块

### 实现建议
- 第一阶段：标签 + 关键词召回
- 第二阶段：标签 + 摘要向量召回 / 语义检索
- 第三阶段：召回 + rerank

---

## 3.4 Memory Manager

### 目标
把长期记忆从 markdown 模板升级为稳定机制。

### 输入
- 当前对话内容
- 已有 memory
- 当前使用的 skill
- 会话结果（是否形成明确新结论）

### 输出
- 新的记忆候选
- 更新建议
- 归档建议
- 删除建议

### 记忆分层建议
- `short-term session memory`：当前会话短期信息
- `long-term user memory`：长期有效信息
- `archived memory`：过期但可追溯的信息

### 长期记忆推荐保留内容
- 长期目标
- 稳定偏好
- 明确边界
- 已验证有效的支持方式
- 反复出现的长期阻碍模式

### 不应保留的内容
- 一次性情绪波动
- 偶发抱怨
- 与长期成长无关的碎片
- 未验证短期偏好
- 非必要高敏感隐私

### 核心子模块建议
- `collector`：从对话中抽记忆候选
- `scorer`：给候选打价值分和置信度
- `merger`：与已有 memory 合并或冲突检测
- `archive`：归档、降级、删除

### 实现建议
- 首版：规则为主
- 中期：LLM 提取 + 规则校验
- 后期：引入置信度与冲突处理评分

---

## 3.5 Multimodal Gateway Adapter

### 目标
把文本、语音、图像、文件能力统一接到你的代理网关，而不是散在各处。

### 输入
- 文本输入
- 图片输入
- 语音输入
- 文件输入
- 当前 skill / route 结果

### 输出
- 结构化文本结果，供主 agent 使用
- 模态摘要
- 模态特有标签（如图像场景、语音情绪强度等）

### 建议子能力
- `audio -> transcript`
- `image -> scene summary`
- `file -> structured summary`
- `multimodal -> normalized input`

### 调用原则
- 先识别输入模态
- 再转成结构化文本摘要
- 再交给 skill router 和主 agent

### 实现建议
- 首版不让主 agent 直接自己拼多模态逻辑
- 统一通过 `multimodal-router` + gateway adapter 处理

---

## 4. 端到端数据流

建议的会话执行顺序：

1. 接收输入
2. 判断输入模态
3. 运行 Safety Router 做风险初筛
4. 读取相关 memory
5. 运行 Skill Router 判断当前场景
6. 运行 Knowledge Retriever 选取相关知识块
7. 组合 prompts + agent + skill + memory + knowledge
8. 必要时调用多模态网关
9. 生成最终回复
10. 把对话结果交给 Memory Manager 生成记忆更新建议
11. 交给 Reflection Reviewer 生成后续优化建议（后续版本）

---

## 5. 实现优先级建议

## P0：必须先做
- skill router 规则设计
- safety router 规则设计
- knowledge 元数据结构
- memory 数据模型

## P1：紧接着做
- knowledge retriever 首版
- memory manager 首版
- multimodal adapter 接口定义

## P2：后续增强
- plugin 化工具
- rerank / scoring
- reflection reviewer 自动分析
- 自进化 patch 建议机制

---

## 6. 当前最适合的落地方式

在现阶段，不建议一上来就写复杂 plugin。

更合理的路线是：

### 第一步
先把：
- `routing strategy`
- `knowledge invocation strategy`
- `memory invocation strategy`
- `safety routing strategy`

这几份规则文档写清楚。

### 第二步
再根据这些文档，设计：
- 数据结构
- JSON 模板
- 执行层模块接口

### 第三步
最后再决定哪些做成 plugin，哪些直接走 OpenClaw 原生工具。

---

## 7. 最终结论

这个项目真正有效的关键不在于“多写一些 prompt”，而在于把以下链路打通：

> 输入识别 → 风险判断 → skill 路由 → knowledge 精准召回 → 生成回复 → memory 更新

Markdown 负责定义行为，
配置层负责控制可见性与条件，
执行层代码负责保证这条链路稳定工作，
插件层负责补足 OpenClaw 原生能力之外的执行能力。

这才是 OpenClaw Life Coach 调料包后续应该真正走向的执行架构。
