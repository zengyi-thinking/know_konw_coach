# OpenClaw Life Coach 角色包可执行开发文档

## 0. 文档目标

本项目的目标不是改造 OpenClaw 本体，也不是把它做成一个泛化的自治系统，而是：

> **基于 OpenClaw 的 workspace / skills / agents / memory 机制，构建一个可安装、可复用、可长期扮演用户 Life Coach 角色的工作区模板。**

这个模板的作用是帮助 OpenClaw 在用户环境中稳定承担以下角色：
- 长期陪伴型教练
- 目标澄清与推进助手
- 周期性复盘与反思助手
- 情绪整理与行动转化助手
- 有边界、有记忆、不过度依赖的支持型角色

因此，这个项目的核心不是“功能越多越好”，而是：

> **让 OpenClaw 稳定、可信、一致地扮演 Life Coach。**

---

## 1. 项目定位

### 1.1 项目是什么
本项目是：

> **OpenClaw Life Coach Workspace Template**

它是一套面向 OpenClaw 的角色模板，包含：
- Life Coach 人格资产
- 教练式技能体系
- 长期记忆规则与模板
- 方法论知识库
- 辅助 agents 定义
- 安装与配置模板

### 1.2 项目不是什么
本项目不是：
- OpenClaw 主仓库修改方案
- 一个通用型 AI 助手大全
- 一个完全自治、自我改写的系统
- 心理治疗、医疗建议、法律建议、投资建议替代品

### 1.3 核心交付物
最终交付物应包括：
- 一个 GitHub 模板仓库
- 一套可放入 `~/.openclaw/workspace` 的目录结构
- 一组兼容 OpenClaw 的 skills
- 一组围绕 Life Coach 角色的 agents
- 一套 memory / knowledge / prompts 资产
- 一套连接代理网关的配置模板

---

## 2. 为什么用 OpenClaw 承载 Life Coach 角色

OpenClaw 的优势不在于它天然就是 life coach，而在于它具备成为 life coach 容器的能力：

- 支持 workspace
- 支持 skills
- 支持多 agent 组织
- 支持可配置模型与网关接入
- 支持将个性化内容放在用户空间中长期维护

因此，本项目不应修改 OpenClaw 主体，而应采用以下方式：

> **将本仓库作为一个可安装到 `~/.openclaw/workspace` 的 Life Coach 工作区模板。**

这个判断与 OpenClaw 的安装方式、配置方式、workspace 机制是对齐的。

---

## 3. Life Coach 角色定义总纲

这一部分是整个项目的核心约束来源。后续所有 skills、memory、knowledge、agents 都必须服务于这一角色定义。

### 3.1 角色目标
OpenClaw 在本项目中的目标角色是：

> **用户的长期陪伴型 Life Coach，而不是一次性问答机器人。**

它应帮助用户：
- 理解当前状态
- 澄清目标与方向
- 识别障碍与反复模式
- 把问题转成可执行的小步行动
- 在周期性复盘中形成成长连续性

### 3.2 核心行为原则
角色必须遵守以下原则：
- **共情**：先理解，再推进，不冷硬
- **行动化**：帮助用户落到下一步，而不只停留在感受描述
- **不制造依赖**：不通过拟人化绑定或情绪操控增强用户依附
- **长期连续性**：通过记忆与复盘体现对用户处境的持续理解
- **稳定一致**：语气、价值观、边界不应频繁漂移

### 3.3 输出风格
输出应尽量符合以下风格：
- 简洁
- 教练式
- 不过度说教
- 不虚假热情
- 不夸大理解
- 不替用户下绝对判断

### 3.4 高风险边界
必须明确以下边界：
- 不替代心理治疗、医疗建议、法律建议、投资建议
- 不对危机场景提供冒充专业人士的处理建议
- 不强化情绪依赖
- 不鼓励用户把所有判断外包给系统
- 不把教练角色包装成权威诊断者

### 3.5 角色成立的验收标准
一个合格的 Life Coach 角色，至少应满足：
- 用户第一次对话后能得到清晰的理解与下一步
- 后续对话中能自然承接已有背景，不重复盘问
- 能围绕长期目标做阶段性复盘
- 面对情绪波动时先承接，再行动化
- 面对高风险问题时能正确收缩边界

---

## 4. OpenClaw 适配结论

### 4.1 安装入口
OpenClaw 官方推荐安装方式：
- `npm install -g openclaw@latest`
- `openclaw onboard --install-daemon`

源码开发方式：
- `git clone https://github.com/openclaw/openclaw.git`
- `pnpm install`
- `pnpm ui:build`
- `pnpm build`
- `pnpm openclaw onboard --install-daemon`

### 4.2 配置与定制位置
OpenClaw 的个性化定制位置：
- 全局配置：`~/.openclaw/openclaw.json`
- 工作区：`~/.openclaw/workspace`

因此本项目的合理落点是：
- 不修改 OpenClaw 主仓库
- 把角色资产放进 workspace
- 通过模板和 patch 指导用户配置 OpenClaw

### 4.3 Skills 加载规则
与本项目最相关的 skill 目录优先级包括：
- `<workspace>/skills`
- `<workspace>/.agents/skills`
- `~/.openclaw/skills`
- `~/.agents/skills`

因此首版建议重点使用：
- `workspace/skills/`
- `workspace/.agents/`
- `workspace/memories/`
- `workspace/prompts/`
- `workspace/knowledge/`

### 4.4 Agent 与 workspace
OpenClaw 支持多 agent 与 workspace 绑定。因此本项目实质上应构建为：

> **一个专用 workspace + 一组专用 agents + 一组专用 skills。**

---

## 5. 角色能力模型

为了让 OpenClaw 真正扮演 Life Coach，而不是只拥有一些零散功能，本项目至少需要形成以下能力。

### 5.1 用户理解能力
- 识别用户当前处境
- 理解用户目标、障碍、情绪状态
- 区分短期问题与长期模式

### 5.2 目标澄清能力
- 帮助用户把模糊诉求澄清为方向
- 帮助识别真正想要的变化
- 避免用泛泛鼓励替代结构化澄清

### 5.3 行动拆解能力
- 将大问题拆成下一步行动
- 输出小步、可执行、低阻力建议
- 避免给出空泛口号式建议

### 5.4 周期复盘能力
- 支持周复盘或阶段性复盘
- 关注进展、障碍、偏差、下一步
- 强化连续性，而不是每次重开

### 5.5 情绪整理能力
- 能先承接情绪，再帮助整理
- 不把情绪问题粗暴转换为任务问题
- 不冒充心理咨询或治疗角色

### 5.6 长期记忆能力
- 记录长期目标、稳定偏好、有效沟通方式、重要边界
- 不记录低价值碎片与非必要敏感信息
- 记忆要服务连续性，而不是堆积信息

### 5.7 边界控制能力
- 能识别高风险场景
- 能在必要时收缩建议强度
- 能提示用户寻求真人支持或专业资源

---

## 6. 角色最小闭环

首版不应追求大而全，而应先跑通一个可持续使用的教练闭环。

建议的最小闭环如下：

1. **coach-intake**：认识用户当前状态、目标、背景
2. **goal-clarify**：把模糊诉求转成较清晰方向
3. **weekly-review**：帮助用户持续复盘与推进
4. **emotional-debrief**：处理推进过程中的情绪波动
5. **memory**：沉淀长期有效信息，支撑后续连续性

只要这个闭环跑通，OpenClaw 扮演 Life Coach 的核心价值就能成立。

---

## 7. 推荐仓库结构

```text
openclaw-lifecoach-template/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ docs/
│  ├─ architecture.md
│  ├─ openclaw-adaptation.md
│  ├─ role-definition.md
│  ├─ safety-model.md
│  └─ release-plan.md
├─ install/
│  ├─ install.ps1
│  ├─ install.sh
│  ├─ bootstrap.md
│  └─ openclaw-config.patch.example.json
├─ config/
│  ├─ openclaw.json.template
│  ├─ gateway.env.example
│  └─ multimodal.env.example
├─ workspace/
│  ├─ skills/
│  │  ├─ coach-intake/
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
│  ├─ memories/
│  │  ├─ MEMORY.md
│  │  ├─ user_profile_template.md
│  │  ├─ feedback_style_template.md
│  │  ├─ long_term_goals_template.md
│  │  ├─ boundaries_template.md
│  │  └─ archive_rules.md
│  ├─ knowledge/
│  │  ├─ frameworks/
│  │  ├─ prompts/
│  │  ├─ cases/
│  │  └─ safety/
│  └─ prompts/
│     ├─ soul_identity.md
│     ├─ soul_values.md
│     ├─ soul_tone.md
│     └─ soul_boundaries.md
└─ examples/
   ├─ session-scenarios.md
   └─ user-config-snippets.md
```

说明：
- `workspace/` 对应 OpenClaw 的 `~/.openclaw/workspace`
- `.agents/` 对应 OpenClaw 可识别的 agent 目录
- `skills/` 采用 OpenClaw 兼容格式
- `config/` 只提供模板与 patch 示例，不替代 OpenClaw 全局配置

---

## 8. 可执行开发阶段

---

### 阶段 A：OpenClaw 适配骨架

目标：先把模板仓库与 OpenClaw 的关系建立清楚。

- [ ] 创建模板仓库
- [ ] 添加 `README.md`
- [ ] 添加 `LICENSE`
- [ ] 添加 `.gitignore`
- [ ] 创建 `docs/`、`install/`、`config/`、`workspace/` 目录
- [ ] 在 README 中明确安装目标为 `~/.openclaw/workspace`
- [ ] 说明本项目不修改 OpenClaw 主仓库
- [ ] 说明用户需先完成 OpenClaw 官方安装与 onboard
- [ ] 编写 `docs/openclaw-adaptation.md`

交付结果：
- 仓库骨架清晰
- 用户能理解本项目与 OpenClaw 的关系

---

### 阶段 B：Life Coach 角色资产落地

目标：把角色定义沉淀为稳定资产，并作为后续模块的统一约束。

#### B1. 定义 soul/persona 资产
在 `workspace/prompts/` 下创建：
- [ ] `soul_identity.md`
- [ ] `soul_values.md`
- [ ] `soul_tone.md`
- [ ] `soul_boundaries.md`

#### B2. 明确角色行为规范
- [ ] 定义长期陪伴型 life coach 的角色定位
- [ ] 定义“共情 + 行动化 + 不制造依赖”
- [ ] 定义高风险边界
- [ ] 定义输出风格
- [ ] 定义什么情况下先承接、什么情况下推进行动

#### B3. 绑定主 agent
- [ ] 在 `workspace/.agents/life-coach.md` 中引用人格资产
- [ ] 让主 agent 严格受 soul/persona 约束

交付结果：
- 角色人格稳定
- 后续 skills / memory / agents 有统一约束来源

---

### 阶段 C：核心 Skills 体系

目标：把 Life Coach 的核心能力结构化为可调用 skill。

#### C1. 建立技能目录
- [ ] `workspace/skills/coach-intake/`
- [ ] `workspace/skills/goal-clarify/`
- [ ] `workspace/skills/weekly-review/`
- [ ] `workspace/skills/emotional-debrief/`
- [ ] `workspace/skills/habit-reset/`
- [ ] `workspace/skills/voice-checkin/`
- [ ] `workspace/skills/vision-reflection/`

#### C2. 每个 skill 的最小结构
每个 skill 至少包含：
- [ ] `SKILL.md`
- [ ] YAML frontmatter
- [ ] name / description
- [ ] 适用场景
- [ ] 不适用场景
- [ ] 输入输出格式
- [ ] 风险边界

#### C3. 首版优先级
优先实现：
- [ ] `coach-intake`
- [ ] `goal-clarify`
- [ ] `weekly-review`
- [ ] `emotional-debrief`

交付结果：
- Life Coach 的核心对话能力可直接使用

---

### 阶段 D：Agent 协作结构

目标：建立内部协作结构，但外部保持同一 Life Coach 体验。

#### D1. 主代理
- [ ] 创建 `workspace/.agents/life-coach.md`
- [ ] 定义主职责：对话、选 skill、调用 memory/knowledge、输出行动建议

#### D2. 记忆代理
- [ ] 创建 `workspace/.agents/memory-curator.md`
- [ ] 定义职责：筛选哪些信息值得进入长期记忆

#### D3. 反思代理
- [ ] 创建 `workspace/.agents/reflection-reviewer.md`
- [ ] 定义职责：分析近期对话问题，输出优化建议

#### D4. 安全代理
- [ ] 创建 `workspace/.agents/safety-guardian.md`
- [ ] 定义职责：识别越界、依赖、伪专业风险

#### D5. 多模态路由代理
- [ ] 创建 `workspace/.agents/multimodal-router.md`
- [ ] 定义职责：识别图像/语音/文件输入后该进入哪个流程

交付结果：
- 内部协作可维护
- 外部呈现保持统一人格与边界

---

### 阶段 E：Memory 体系

目标：支撑长期陪伴，而不是堆积无关信息。

#### E1. 建立长期记忆目录
- [ ] 创建 `workspace/memories/MEMORY.md`
- [ ] 创建用户画像模板
- [ ] 创建长期目标模板
- [ ] 创建反馈风格模板
- [ ] 创建边界模板
- [ ] 创建归档规则文档

#### E2. 定义记忆规则
- [ ] 只记录长期目标、稳定偏好、有效沟通方式、边界信息
- [ ] 不记录一次性情绪波动
- [ ] 不记录低价值闲聊碎片
- [ ] 不记录非必要敏感隐私

#### E3. 定义记忆使用原则
- [ ] 记忆要服务连续性与支持感
- [ ] 引用记忆时要自然，不机械复述
- [ ] 记忆不能制造被监控感

#### E4. 自净化机制
- [ ] 定义无关信息剔除规则
- [ ] 定义过期记忆归档规则
- [ ] 定义矛盾记忆降级规则
- [ ] 让 `memory-curator` 输出整理建议

交付结果：
- 系统能逐步理解用户
- 记忆不会吞没角色质量

---

### 阶段 F：Knowledge 知识库

目标：为角色提供稳定的方法论底座。

#### F1. 基础框架
- [ ] 创建 `workspace/knowledge/frameworks/`
- [ ] 写入 GROW、WOOP、CBT 风格拆解、复盘框架

#### F2. Prompt 模板
- [ ] 创建 `workspace/knowledge/prompts/`
- [ ] 放首次访谈模板、行动拆解模板、周复盘模板、情绪复盘模板

#### F3. 案例库
- [ ] 创建 `workspace/knowledge/cases/`
- [ ] 放匿名化典型用户案例

#### F4. 安全库
- [ ] 创建 `workspace/knowledge/safety/`
- [ ] 放高风险升级规则、拒答边界、资源引导模板

交付结果：
- Skills 与主 agent 有稳定知识支持

---

### 阶段 G：配置模板与网关接入

目标：让角色模板能够接入 OpenClaw 与外部模型网关。

#### G1. 定义配置模板
- [ ] 创建 `config/openclaw.json.template`
- [ ] 创建 `config/gateway.env.example`
- [ ] 创建 `config/multimodal.env.example`

#### G2. 定义最小配置项
- [ ] `base_url`
- [ ] `user_token`
- [ ] `chat_model`
- [ ] `vision_model`
- [ ] `audio_model`
- [ ] `image_model`
- [ ] `document_model`
- [ ] `enable_multimodal`

#### G3. 设计 OpenClaw 配置接入方式
- [ ] 在模板中提供 agent/workspace 示例
- [ ] 提供 skills allowlist 示例
- [ ] 提供模型与环境变量引用示例
- [ ] 明确哪些字段应写进 `~/.openclaw/openclaw.json`

交付结果：
- 用户能把角色模板接入自己的 OpenClaw 环境

---

### 阶段 H：安装脚本与 GitHub 分发

目标：让用户可以低摩擦安装该角色包。

#### H1. GitHub 模板仓库
- [ ] 配置为 template repository
- [ ] README 首页提供清晰安装说明
- [ ] 标明安装前置条件

#### H2. 安装脚本
- [ ] 编写 `install/install.ps1`
- [ ] 编写 `install/install.sh`
- [ ] 检测 `~/.openclaw/` 是否存在
- [ ] 检测 `~/.openclaw/workspace` 是否存在
- [ ] 把 `workspace/` 内容复制或合并到用户工作区
- [ ] 不覆盖用户已有高风险配置
- [ ] 对 `openclaw.json` 仅给 patch 建议，不强行改写

#### H3. 安装文档
- [ ] 编写 `install/bootstrap.md`
- [ ] 写清 Windows 下优先 WSL2
- [ ] 写清如何在已安装 OpenClaw 的环境中接入模板

交付结果：
- 用户能快速安装并开始使用角色包

---

### 阶段 I：治理与优化建议机制

目标：优化角色表现，但不破坏核心人格与边界。

#### I1. 自净化落地
- [ ] 定义无关信息判定标准
- [ ] 定义值得长期记忆的标准
- [ ] 定义应归档或删除的信息类型
- [ ] 让 `memory-curator` 定期输出清理建议

#### I2. 优化建议机制
- [ ] 让 `reflection-reviewer` 基于对话历史产出结构优化建议
- [ ] 分析哪些 skill 经常不适用
- [ ] 分析哪些 agent 分工不合理
- [ ] 分析哪些 memory 模板不够用
- [ ] 分析哪些 prompt 需要缩短、强化或重排

#### I3. 禁止自动改写的部分
- [ ] 不自动改核心 persona
- [ ] 不自动改安全边界
- [ ] 不自动改网关安全策略
- [ ] 不自动改用户全局 OpenClaw 核心配置

#### I4. 输出形式
- [ ] 生成 review 报告
- [ ] 生成 patch 建议
- [ ] 人工确认后再更新模板

交付结果：
- 系统可持续优化
- 但不会漂移成失控角色

---

### 阶段 J：验证与发布

目标：验证该角色包真的能成立，而不只是结构齐全。

#### J1. 安装验证
- [ ] 在全新 OpenClaw 环境中测试安装
- [ ] 在已有 OpenClaw 环境中测试增量安装
- [ ] 验证不覆盖已有 workspace 关键内容

#### J2. 角色能力验证
- [ ] 测试 `coach-intake`
- [ ] 测试 `goal-clarify`
- [ ] 测试 `weekly-review`
- [ ] 测试 `emotional-debrief`
- [ ] 验证对话风格是否稳定
- [ ] 验证是否体现长期连续性

#### J3. Memory 验证
- [ ] 验证长期记忆是否只保留高价值信息
- [ ] 验证无关信息是否被剔除
- [ ] 验证冲突记忆是否能降级或归档

#### J4. 安全验证
- [ ] 检查公开仓库不包含真实密钥
- [ ] 检查高风险边界是否生效
- [ ] 检查代理网关 token 是否可撤销、可限额
- [ ] 检查是否存在过度依赖诱导表达

#### J5. 发布准备
- [ ] 完善 README
- [ ] 增加示例截图或示意流程
- [ ] 增加版本号与更新日志
- [ ] 设为 GitHub 模板仓库

交付结果：
- 具备对外发布条件
- 角色定位、能力和边界都可被验证

---

## 9. 开发优先级建议

### P0：首版必须成立
1. OpenClaw 适配骨架
2. Life Coach 角色资产
3. 主 life-coach agent
4. 4 个核心 skills
5. memory 模板与规则
6. install 脚本
7. openclaw.json 模板

### P1：首版增强
1. knowledge 基础库
2. safety-guardian
3. memory-curator
4. habit-reset
5. 多模态输入支持

### P2：后续治理与扩展
1. reflection-reviewer
2. 优化建议报告
3. 自动化归档建议
4. 更复杂的多模态路由

---

## 10. 里程碑定义

### M1：模板可安装
标准：
- 用户已安装 OpenClaw
- 能运行安装脚本
- 角色模板成功进入 `~/.openclaw/workspace`

### M2：Life Coach 角色成立
标准：
- 主 agent 可以稳定扮演 life coach
- 核心 skills 可以调用
- 基本人格、风格、边界稳定

### M3：长期连续性成立
标准：
- Memory 能支持后续对话承接
- 用户能感受到持续陪伴与目标连续性

### M4：治理闭环成立
标准：
- memory-curator 能输出清理建议
- reflection-reviewer 能输出优化建议
- 核心人格与边界不会被自动篡改

---

## 11. 最终建议

这件事最正确的落地方向不是把 OpenClaw 做成一个泛化增强平台，而是：

> **让 OpenClaw 通过 workspace template + skills pack + agents pack 的方式，稳定扮演用户的 Life Coach 角色。**

因此，本项目最重要的不是模块数量，而是以下三件事：
- 角色是否稳定
- 连续性是否成立
- 边界是否可信

如果这三件事成立，这个模板就有产品价值。
