# OpenClaw Life Coach 调料包产品设计文档 V3

## 0. 文档目标

这份 V3 文档用于收敛当前项目方向，明确这个产品到底要做成什么、为什么之前的结构还不够好、以及怎样把它真正落成一个 **便于 OpenClaw 调用、具备受控自进化能力的 Life Coach 调料包**。

V3 不再延续前两版里“文档越来越多、运行资产越来越重”的方向，
而是明确把系统拆成：

- **设计层**：给你维护和迭代思路
- **运行层**：给 OpenClaw 真正加载和调用
- **执行层**：把 routing / memory / retrieval / evolution 落成算法与接口
- **治理层**：保证自进化不会人格漂移或安全失控

---

## 1. 产品最终定义

这个项目不是一个普通 prompt 包，也不是一个泛化 AI 助手模板。

它的目标是：

> **做一个可安装到 OpenClaw 的 Life Coach 调料包，让 OpenClaw 能以稳定、轻量、可调用、可持续优化的方式扮演长期陪伴型 Life Coach。**

这个产品最终要同时满足 4 件事：

1. **像真正的 Life Coach**
   - 有稳定人格
   - 有明确边界
   - 会澄清、聚焦、行动化、复盘

2. **便于 OpenClaw 调用**
   - 运行时资产短、小、清晰
   - 可按需加载
   - 不依赖大段长 markdown

3. **能逐步越来越懂用户**
   - 有长期记忆机制
   - 有对话复盘机制
   - 有结构化优化信号

4. **能自进化但不失控**
   - 会提出改进建议
   - 会清理无关信息
   - 不会自动篡改核心人格和安全边界

---

## 2. V3 对前两版的纠偏

前两版设计方向并不完全错，但存在一个关键问题：

> **设计文档和运行资产混在了一起。**

这会导致：
- markdown 太长，不利于 OpenClaw 加载
- 同一个文件里同时出现“背景解释 + 运行规则 + 路线图”
- skills / agents / prompts 不够轻，难以精准调用
- 自进化无法只修改局部结构化资产，只能碰长文档

因此，V3 的核心纠偏是：

> **把“给人看的设计”与“给 OpenClaw 运行的资产”彻底分开。**

---

## 3. V3 的核心设计原则

### 3.1 运行层必须轻量化
给 OpenClaw 真正加载的文件必须：
- 短
- 单一职责
- 可拆分
- 可结构化调用

### 3.2 设计层和运行层分离
- `design/` 或 `docs/`：保留长文档、路线图、架构说明
- `workspace/`：只保留运行时真正需要的资产

### 3.3 自进化只优化低风险层
允许优化：
- 路由规则
- knowledge metadata
- memory 规则
- skill 流程细节
- 低风险 prompts 的重排建议

不允许自动优化：
- soul 核心人格
- 安全边界
- safety 升级规则
- 网关安全策略

### 3.4 资产驱动，而不是长文档驱动
系统运行不依赖长说明文档，而依赖：
- 小型 prompts
- skill route 规则
- knowledge metadata
- memory records
- evolution signals
- proposal files

### 3.5 自进化必须是受控闭环
不是“自动改自己”，而是：

> **自动观察 → 自动评分 → 自动出建议 → 人工批准后升级**

---

## 4. 产品架构总览

V3 建议采用四层结构。

### 第一层：设计层
作用：给你维护、规划、复盘、升级策略使用。

适合放：
- 产品设计文档
- 执行层架构说明
- 路由策略说明
- memory / knowledge / evolution 机制设计
- 发布路线图

建议目录：
- `docs/`
- 或未来新增 `design/`

这一层 **不作为 OpenClaw 的主运行输入**。

---

### 第二层：运行资产层
作用：给 OpenClaw 真正加载和调用。

建议目录：
- `workspace/prompts/`
- `workspace/skills/`
- `workspace/.agents/`
- `workspace/knowledge/`
- `workspace/memories/`
- `workspace/evolution/`

这一层的要求是：
- 文件短
- 职责清晰
- 能按需读取
- 能被局部替换

---

### 第三层：执行层
作用：把 routing / retrieval / memory / evolution 真正变成机制。

建议目录：
- `runtime/router/`
- `runtime/retrieval/`
- `runtime/memory/`
- `runtime/evolution/`
- `runtime/logging/`
- `runtime/schemas/`

这一层定义“系统怎么稳定运行”。

---

### 第四层：治理层
作用：控制自进化范围，防止失控。

建议目录：
- `config/evolution.policy.json`
- `workspace/evolution/policies/`
- `workspace/evolution/anti-drift-rules.md`
- `workspace/evolution/proposals/`

这一层定义“系统可以怎么变，不能怎么变”。

---

## 5. 运行层重构原则

这是 V3 最重要的变化之一。

### 5.1 prompts 不再写成长文
原来的 soul/persona 类文件容易写成长解释文。
V3 建议改成“核心规则卡片”。

例如：
- `workspace/prompts/core_identity.md`
- `workspace/prompts/core_values.md`
- `workspace/prompts/core_tone.md`
- `workspace/prompts/core_boundaries.md`

每个文件只保留：
- 5-12 条规则
- 不写大段背景
- 不写路线图
- 不写未来规划

它们的目标是：

> 让 OpenClaw 快速拿到人格约束，而不是读项目说明书。

---

### 5.2 skill 采用“三件套”
每个 skill 不应只有一个越写越长的 `SKILL.md`。

V3 建议每个 skill 拆成：

1. `SKILL.md`
   - 最短定义
   - name / description
   - 适用场景
   - 输入 / 输出
   - 禁止项

2. `route.json`
   - 触发关键词
   - 场景标签
   - 排除条件
   - 优先级

3. `response_schema.json`
   - skill 输出结构
   - 便于统一格式化与后续分析

例如：
- `workspace/skills/goal-clarify/SKILL.md`
- `workspace/skills/goal-clarify/route.json`
- `workspace/skills/goal-clarify/response_schema.json`

这样做的价值：
- OpenClaw 更容易加载
- router 更容易判断
- self-evolution 更容易只调整 route / schema 而不是改整篇文案

---

### 5.3 knowledge 改成“知识块库”，而不是“长文章库”
V3 中知识库应以“小块 + 元数据 sidecar”的形式存在。

每个知识块建议两部分：

1. `*.md`
   - 核心原则
   - 适用场景
   - 1 条提醒

2. `*.json`
   - id
   - topics
   - scenes
   - recommendedSkills
   - recommendedAgents
   - keywords
   - riskLevel
   - summary

例如：
- `workspace/knowledge/frameworks/goal-clarity-001.md`
- `workspace/knowledge/frameworks/goal-clarity-001.json`

这样检索时优先读 json metadata，
只有命中时再加载短 md 内容。

---

### 5.4 memory 必须结构化，而不是纯 markdown 堆积
V3 中，`workspace/memories/` 仍可保留人工可读模板，
但真正运行时应以结构化 record 为主。

建议记忆状态：
- `active`
- `observing`
- `archived`
- `discarded`

建议记忆类型：
- `goal`
- `preference`
- `boundary`
- `effective_support`
- `pattern`

建议字段：
- id
- type
- content
- confidence
- evidenceCount
- status
- tags
- createdAt
- updatedAt
- sourceSessions

这样 memory 才能被评分、合并、归档、自净化。

---

### 5.5 evolution 必须结构化，而不是一句“后续自进化”
V3 中，evolution 要单独成层。

建议目录：
- `workspace/evolution/signals/`
- `workspace/evolution/policies/`
- `workspace/evolution/templates/`
- `workspace/evolution/proposals/`

其中：

#### signals
定义哪些现象代表系统需要优化。
例如：
- 连续多次错路由
- 某 skill 经常中途失效
- 某类 memory 经常被归档
- 用户频繁表示“太长 / 太空 / 太硬 / 太泛”

#### policies
定义哪些可以自动调整，哪些只能出 proposal。

#### templates
定义优化建议生成模板。

#### proposals
放自进化输出的改进提案。

---

## 6. 自进化的真正定义

V3 中，“自进化”不能理解成 agent 随便改自己。

正确理解是：

> **系统能够基于长期使用数据，持续提升对用户的理解、路由准确度、对话质量和知识调用质量，并通过受控机制提出结构优化建议。**

因此，自进化应该拆成三条闭环。

### 6.1 用户理解闭环
流程：
`session -> memory candidate -> scoring -> merge -> clean memory -> better next session`

目标：
- 越来越懂用户
- 长期目标越来越准
- 偏好越来越稳
- 不把一次性情绪误写成长期画像

### 6.2 对话质量闭环
流程：
`session log -> review -> quality signals -> response/skill tuning proposal`

目标：
- 回答更像教练
- 更聚焦
- 更行动化
- 少废话
- 少错判

### 6.3 结构优化闭环
流程：
`usage patterns -> route analysis -> proposal -> manual approval -> runtime update`

目标：
- skill 触发条件更准
- knowledge 调用更准
- memory 规则更稳
- 系统结构随着真实使用优化

---

## 7. 自进化执行层最小模块

为了让自进化真正落地，V3 建议先做 6 个最小模块。

### 7.1 Session Event Logger
记录每一轮对话事件。

建议字段：
- sessionId
- turnId
- timestamp
- modality
- userInputSummary
- safetyRiskLevel
- selectedSkill
- routeReason
- knowledgeHits
- memoryReads
- memoryWrites
- responseSignals
- outcomeSignals

这是整个自进化系统的原始输入层。

---

### 7.2 Memory Pipeline Engine
把 `memory-curator` 变成真实机制。

建议拆分：
- collector
- scorer
- merger
- archive

能力包括：
- 抽取长期记忆候选
- 给记忆打价值分与置信度
- 合并重复和冲突
- 归档与自净化

---

### 7.3 Route Quality Analyzer
分析系统是不是“选对了 skill / knowledge / memory”。

重点评估：
- 是否错路由
- 是否过度注入 knowledge
- 是否缺少 memory 读取
- 是否把情绪事件粗暴行动化

---

### 7.4 Reflection Reviewer Engine
把近期会话表现转成结构化改进建议。

建议输出类型：
- `response_tuning`
- `skill_tuning`
- `knowledge_gap`
- `memory_rule_tuning`

---

### 7.5 Patch Proposal Generator
把 review 结果转成 patch proposal，而不是直接改仓库。

建议 proposal 类型：
- knowledge 增补建议
- route 规则调优建议
- memory 规则调优建议
- skill 流程微调建议

---

### 7.6 Evolution Guardrails
控制哪些层允许自动调整，哪些层绝对禁止自动改写。

这一步直接决定这个产品是“受控进化”，还是“人格漂移”。

---

## 8. 自动执行边界

V3 明确要求把自动执行分级。

### 8.1 可自动执行
- session event 记录
- memory candidate 抽取
- memory 打分
- 低风险归档建议
- route quality 分析
- review report 生成
- knowledge gap 识别

### 8.2 只能半自动执行
只允许生成 proposal，不允许直接修改：
- skill route 调整建议
- knowledge metadata 调整建议
- memory rule 调整建议
- response schema 微调建议

### 8.3 必须人工批准
- soul/persona 核心资产
- safety 边界
- safety 升级规则
- 高风险 knowledge
- 网关安全策略
- 任何改变角色定位的内容

结论：

> 自进化可以动“策略层”和“低风险结构层”，不能动“人格底座”和“安全底座”。

---

## 9. 建议的 V3 仓库结构

```text
know_konw_coach/
├─ docs/
│  ├─ architecture.md
│  ├─ 执行层架构设计.md
│  ├─ routing-strategy.md
│  ├─ knowledge-invocation-strategy.md
│  ├─ memory-invocation-strategy.md
│  └─ OPENCLAW_LIFECOACH_PRODUCT_DESIGN_V3.md
├─ config/
│  ├─ openclaw.json.template
│  ├─ gateway.env.example
│  ├─ multimodal.env.example
│  └─ evolution.policy.json
├─ runtime/
│  ├─ logging/
│  ├─ router/
│  ├─ retrieval/
│  ├─ memory/
│  ├─ evolution/
│  └─ schemas/
├─ workspace/
│  ├─ prompts/
│  │  ├─ core_identity.md
│  │  ├─ core_values.md
│  │  ├─ core_tone.md
│  │  └─ core_boundaries.md
│  ├─ skills/
│  │  ├─ coach-intake/
│  │  │  ├─ SKILL.md
│  │  │  ├─ route.json
│  │  │  └─ response_schema.json
│  │  ├─ goal-clarify/
│  │  ├─ weekly-review/
│  │  ├─ emotional-debrief/
│  │  ├─ habit-reset/
│  │  ├─ voice-checkin/
│  │  └─ vision-reflection/
│  ├─ .agents/
│  │  ├─ life-coach.md
│  │  ├─ memory-curator.md
│  │  ├─ reflection-reviewer.md
│  │  ├─ safety-guardian.md
│  │  └─ multimodal-router.md
│  ├─ knowledge/
│  │  ├─ frameworks/
│  │  ├─ prompts/
│  │  ├─ cases/
│  │  └─ safety/
│  ├─ memories/
│  │  ├─ MEMORY.md
│  │  ├─ schemas/
│  │  └─ policies/
│  └─ evolution/
│     ├─ signals/
│     ├─ policies/
│     ├─ templates/
│     └─ proposals/
└─ install/
   ├─ install.ps1
   ├─ install.sh
   ├─ bootstrap.md
   └─ openclaw-config.patch.example.json
```

---

## 10. OpenClaw 调用友好性要求

这是 V3 产品是否成立的核心验收点之一。

### 10.1 运行时主输入必须尽量短
- skill 的 `SKILL.md` 控制在短规格
- prompts 只保留硬规则
- knowledge 优先读取 metadata，而不是先读正文

### 10.2 一次只加载最少资产
一次响应尽量只需要：
- 1 个主 skill
- 1 组核心 persona 规则
- 1-2 个 knowledge block
- 少量相关 memory

### 10.3 长文档不直接进入运行主链路
长文档保留给你维护，不给 OpenClaw 当常规上下文。

### 10.4 自进化优先调整结构化 sidecar 文件
例如：
- `route.json`
- `response_schema.json`
- knowledge metadata json
- memory policy json
- evolution policy json

而不是优先碰长 markdown。

---

## 11. 产品分阶段落地建议

### Phase 1：轻量运行层重构
先做：
- prompts 收缩
- skill 三件套结构
- knowledge block + metadata 结构
- evolution 目录分层

目标：
让 OpenClaw 更容易调用。

### Phase 2：执行层首版
再做：
- skill router
- safety router
- knowledge retriever
- memory engine
- session event logger

目标：
让系统开始具备稳定执行能力。

### Phase 3：受控自进化闭环
再做：
- route quality analyzer
- reflection reviewer engine
- patch proposal generator
- evolution guardrails

目标：
让系统开始真正“越来越懂用户”，但不失控。

### Phase 4：多模态与网关协同
最后做：
- multimodal adapter
- audio / image / file normalization
- 与 evolution signals 联动

目标：
让 voice / image / file 真正进入同一教练闭环。

---

## 12. V3 的最终判断标准

如果未来要判断这个产品是否成功，不是看它文档多不多，而是看它是否达成下面这些标准：

### 12.1 角色成立
- 能稳定表现出 Life Coach 风格
- 不会频繁人格漂移
- 不会越界伪装成治疗师或权威顾问

### 12.2 调用成立
- OpenClaw 可以轻量加载运行资产
- 能按需调用 skill / knowledge / memory
- 不依赖大段长文作为主输入

### 12.3 连续性成立
- 能记住真正重要的长期信息
- 不会被噪声 memory 污染
- 用户能感受到连续性而不是机械复述

### 12.4 自进化成立
- 能发现回答和路由中的问题
- 能持续提出结构优化建议
- 能清理无关信息
- 不会自动篡改核心人格和安全边界

---

## 13. V3 最终结论

这个项目现在的正确方向已经很明确：

> **不是继续堆更长的 markdown，而是把 OpenClaw Life Coach 做成“轻量运行资产 + 执行层算法 + 受控自进化治理”的产品。**

也就是说，未来真正有价值的不是：
- prompt 越写越长
- docs 越写越多

而是：
- `workspace/` 更轻
- `runtime/` 更稳
- `evolution/` 更可控
- OpenClaw 更容易调用
- Life Coach 更容易持续变好

因此，V3 已经确定了这个产品的最终产品形态：

> **一个可安装到 OpenClaw、可轻量调用、可持续优化、具备受控自进化能力的 Life Coach 调料包。**
