# OpenClaw（小龙虾）Life Coach 调料包可执行开发清单

## 0. 目标修正

本项目不再按 Claude Code 调料包设计，而是明确改为：

> **面向 OpenClaw（你称为“小龙虾”）安装体系的 Life Coach 调料包 / 工作区模板仓库**

核心目标：
- 适配 OpenClaw 的安装、配置、workspace、skills、agents 机制
- 通过 GitHub 模板仓库分发
- 安装后可快速接入到 `~/.openclaw/workspace`
- 支持 life coach 的 skills、知识库、memory、soul/persona、agent 架构
- 通过你的代理网关给用户提供多模态模型能力
- 支持“自净化”和“受控自进化”，但不破坏 OpenClaw 的稳定运行

---

## 1. OpenClaw 适配结论

根据公开源码与文档，OpenClaw 的关键适配点如下：

### 1.1 安装入口
OpenClaw 官方推荐安装方式：
- `npm install -g openclaw@latest`
- `openclaw onboard --install-daemon`

源码开发方式：
- `git clone https://github.com/openclaw/openclaw.git`
- `pnpm install`
- `pnpm ui:build`
- `pnpm build`
- `pnpm openclaw onboard --install-daemon`

### 1.2 配置与定制位置
OpenClaw 明确建议把个性化定制放在仓库外：
- 全局配置：`~/.openclaw/openclaw.json`
- 工作区：`~/.openclaw/workspace`

这意味着你的调料包最合理的适配方式，不是去改 OpenClaw 主仓库，而是：

> **把你的 GitHub 仓库做成一个可安装到 `~/.openclaw/workspace` 的 Life Coach 工作区模板。**

### 1.3 Skills 加载规则
OpenClaw 支持 AgentSkills 兼容 skill 目录，优先级里与本项目最相关的是：
- `<workspace>/skills`
- `<workspace>/.agents/skills`
- `~/.openclaw/skills`
- `~/.agents/skills`

因此你的调料包首版应该优先落到：
- `workspace/skills/`
- `workspace/.agents/`
- `workspace/memories/`
- `workspace/prompts/`
- `workspace/knowledge/`

### 1.4 Agent 与 workspace
OpenClaw 支持多 agent，并通过配置把 agent 绑定到不同 workspace。
所以你的 life coach 调料包，实质上可以做成：

> 一个专用 workspace + 一组专用 agents + 一组专用 skills

### 1.5 配置策略
OpenClaw 配置文件为：
- `~/.openclaw/openclaw.json`

因此调料包不应该自己发明一套完全独立配置，而应该提供：
- `openclaw.json.template`
- 或局部配置 patch 示例
- 或安装脚本自动提示用户把相关配置写入 `~/.openclaw/openclaw.json`

---

## 2. 调料包的新产品形态

你的仓库应该定义为：

> **OpenClaw Life Coach Workspace Template**

而不是 Claude Code 包。

它更像一个可安装的“工作区人格包”。

### 2.1 这套模板将包含
1. `workspace/skills`：教练技能
2. `workspace/.agents`：life coach 相关 agent 定义
3. `workspace/memories`：长期记忆模板与索引
4. `workspace/knowledge`：方法库、案例库、安全边界
5. `workspace/prompts`：人格与提示资产
6. `install/`：把这些内容安装到 `~/.openclaw/workspace` 的脚本
7. `config/`：OpenClaw 配置模板与代理网关接入说明

---

## 3. 推荐仓库结构（适配 OpenClaw）

```text
know_konw_coach/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ docs/
│  ├─ architecture.md
│  ├─ openclaw-adaptation.md
│  ├─ gateway-design.md
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
- `skills/` 采用 OpenClaw 的 AgentSkills 兼容格式
- `config/` 不替代 OpenClaw 配置，只提供补丁模板

---

## 4. 可执行开发清单

下面是建议你逐步落地的执行清单。

---

### 阶段 A：OpenClaw 适配骨架

#### A1. 初始化模板仓库
- [ ] 创建 GitHub 仓库 `openclaw-lifecoach-template` 或保留当前仓库名
- [ ] 添加 `README.md`
- [ ] 添加 `LICENSE`
- [ ] 添加 `.gitignore`
- [ ] 添加 `docs/`、`install/`、`config/`、`workspace/` 目录

#### A2. 明确安装目标路径
- [ ] 在 README 中写清楚：本仓库安装目标是 `~/.openclaw/workspace`
- [ ] 说明本仓库不修改 OpenClaw 源码本体
- [ ] 说明用户需先完成 OpenClaw 官方安装与 onboard

#### A3. 写 OpenClaw 适配说明
- [ ] 编写 `docs/openclaw-adaptation.md`
- [ ] 说明 OpenClaw 的 `openclaw.json`、`workspace`、`skills`、`.agents` 关系
- [ ] 说明为什么本项目采用 workspace template 方案

交付结果：
- 仓库骨架完成
- 用户能看懂这个项目和 OpenClaw 的关系

---

### 阶段 B：Life Coach 人格底座

#### B1. 定义 soul/persona 资产
在 `workspace/prompts/` 下创建：
- [ ] `soul_identity.md`
- [ ] `soul_values.md`
- [ ] `soul_tone.md`
- [ ] `soul_boundaries.md`

#### B2. 明确人格边界
- [ ] 定义它是长期陪伴型 life coach，不是单次问答机器人
- [ ] 定义“共情 + 行动化 + 不制造依赖”
- [ ] 定义医疗/法律/投资/危机等高风险边界
- [ ] 定义输出风格：简洁、教练式、不过度说教

#### B3. 绑定到主 agent
- [ ] 在 `workspace/.agents/life-coach.md` 中引用这些人格资产
- [ ] 让主 agent 的行为严格受 soul/persona 约束

交付结果：
- life coach 的基础人格稳定可用

---

### 阶段 C：核心 Skills 体系

#### C1. 建立技能目录
创建以下 skills：
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
- [ ] 单行 YAML frontmatter
- [ ] name / description
- [ ] 适用场景
- [ ] 不适用场景
- [ ] 输入输出格式
- [ ] 风险边界

#### C3. 先做首批高价值 skill
优先实现：
- [ ] `coach-intake`
- [ ] `goal-clarify`
- [ ] `weekly-review`
- [ ] `emotional-debrief`

交付结果：
- 安装后即可使用最核心的教练能力

---

### 阶段 D：Agent 分工设计

#### D1. 主代理
- [ ] 创建 `workspace/.agents/life-coach.md`
- [ ] 定义主职责：对话、选 skill、调用 memory/knowledge、输出行动建议

#### D2. 记忆代理
- [ ] 创建 `workspace/.agents/memory-curator.md`
- [ ] 定义其职责：筛选哪些信息值得进入长期记忆

#### D3. 反思代理
- [ ] 创建 `workspace/.agents/reflection-reviewer.md`
- [ ] 定义其职责：分析近期对话问题，输出优化建议

#### D4. 安全代理
- [ ] 创建 `workspace/.agents/safety-guardian.md`
- [ ] 定义其职责：识别越界、依赖、伪专业风险

#### D5. 多模态路由代理
- [ ] 创建 `workspace/.agents/multimodal-router.md`
- [ ] 定义其职责：识别图像/语音/文件输入后该进入哪个流程

交付结果：
- 形成可维护的多 agent 协作结构

---

### 阶段 E：Memory 体系

#### E1. 建立长期记忆目录
- [ ] 创建 `workspace/memories/MEMORY.md`
- [ ] 创建用户画像模板
- [ ] 创建长期目标模板
- [ ] 创建反馈风格模板
- [ ] 创建边界模板
- [ ] 创建归档规则文档

#### E2. 定义“记什么，不记什么”
- [ ] 只记录长期目标、稳定偏好、有效沟通方式、边界信息
- [ ] 不记录一次性情绪波动
- [ ] 不记录低价值闲聊碎片
- [ ] 不记录非必要敏感隐私

#### E3. 自净化机制
- [ ] 定义“无关信息剔除”规则
- [ ] 定义“过期记忆归档”规则
- [ ] 定义“矛盾记忆降级”规则
- [ ] 让 `memory-curator` 负责判断和输出整理建议

交付结果：
- 系统能逐步懂用户，但不会被无关信息淹没

---

### 阶段 F：Knowledge 知识库

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
- 主 agent 与 skills 有稳定知识支撑

---

### 阶段 G：代理网关与多模态接入

你已经明确选择“代理网关模式”，所以这阶段非常重要。

#### G1. 定义配置模板
- [ ] 创建 `config/openclaw.json.template`
- [ ] 创建 `config/gateway.env.example`
- [ ] 创建 `config/multimodal.env.example`

#### G2. 定义最小配置项
需要支持：
- [ ] `base_url`
- [ ] `user_token`
- [ ] `chat_model`
- [ ] `vision_model`
- [ ] `audio_model`
- [ ] `image_model`
- [ ] `document_model`
- [ ] `enable_multimodal`

#### G3. 设计 OpenClaw 配置接入方式
- [ ] 在 `openclaw.json.template` 中提供 agent/workspace 示例
- [ ] 提供 skills allowlist 示例
- [ ] 提供模型与环境变量引用示例
- [ ] 让用户知道哪些字段要写进 `~/.openclaw/openclaw.json`

#### G4. 多模态接入策略
- [ ] `voice-checkin` 负责语音倾诉场景
- [ ] `vision-reflection` 负责截图/图片分析场景
- [ ] `multimodal-router` 负责识别输入并转发
- [ ] 避免把多模态逻辑散落到所有 skills 中

交付结果：
- 调料包可以通过 OpenClaw 配置连接你的网关，并启用多模态能力

---

### 阶段 H：安装脚本与 GitHub 分发

#### H1. GitHub 模板仓库
- [ ] 配置为 template repository
- [ ] README 首页直接写“5 分钟安装”
- [ ] 增加安装前置条件：先装 OpenClaw，再装本模板

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
- [ ] 写清楚 Windows 下优先 WSL2
- [ ] 写清楚如何在已安装 OpenClaw 的环境中接入模板

交付结果：
- 用户能从 GitHub 下载后快速装进 OpenClaw

---

### 阶段 I：自进化与自净化治理

#### I1. 自净化落地
- [ ] 定义“无关信息”判定标准
- [ ] 定义“值得长期记忆”的标准
- [ ] 定义“哪些信息应归档/删除”
- [ ] 让 `memory-curator` 定期做记忆清理建议

#### I2. 自进化落地
根据你的定义：
> 自动化是让 life coach 更加了解你，根据往日聊天记忆，迭代小龙虾或 life coach agent 架构。

因此应实现：
- [ ] 让 `reflection-reviewer` 基于对话历史产出结构优化建议
- [ ] 分析哪些 skill 经常不适用
- [ ] 分析哪些 agent 分工不合理
- [ ] 分析哪些 memory 模板不够用
- [ ] 分析哪些 prompt 需要缩短、强化或重排

#### I3. 必须禁止自动改写的部分
- [ ] 不自动改核心 persona
- [ ] 不自动改安全边界
- [ ] 不自动改网关安全策略
- [ ] 不自动改用户的全局 OpenClaw 核心配置

#### I4. 建议输出形式
- [ ] 生成 review 报告
- [ ] 生成 patch 建议
- [ ] 人工确认后再更新仓库模板

交付结果：
- 有成长能力，但不会变成失控自治系统

---

### 阶段 J：验证与发布

#### J1. 安装验证
- [ ] 在全新 OpenClaw 环境中测试安装
- [ ] 在已有 OpenClaw 环境中测试增量安装
- [ ] 验证不覆盖已有 workspace 关键内容

#### J2. 功能验证
- [ ] 测试 `coach-intake`
- [ ] 测试 `goal-clarify`
- [ ] 测试 `weekly-review`
- [ ] 测试 `voice-checkin`
- [ ] 测试 `vision-reflection`

#### J3. Memory 验证
- [ ] 验证长期记忆是否只保留高价值信息
- [ ] 验证无关信息是否被剔除
- [ ] 验证冲突记忆是否能降级或归档

#### J4. 安全验证
- [ ] 检查公开仓库不包含真实密钥
- [ ] 检查高风险边界是否生效
- [ ] 检查代理网关 token 是否可撤销、可限额

#### J5. 发布准备
- [ ] 完善 README
- [ ] 增加示例截图/示意流程
- [ ] 增加版本号与更新日志
- [ ] 设为 GitHub 模板仓库

交付结果：
- 具备对外发布条件

---

## 5. 推荐开发优先级

如果你现在要快速落地，我建议按这个顺序做：

### P0：必须先做
1. OpenClaw 适配骨架
2. workspace 结构
3. 主 life-coach agent
4. 4 个核心 skills
5. memory 模板
6. install 脚本
7. openclaw.json 模板

### P1：首版增强
1. knowledge 基础库
2. voice-checkin
3. vision-reflection
4. memory-curator
5. safety-guardian

### P2：第二版治理
1. reflection-reviewer
2. 自进化 review 报告
3. 架构优化建议输出
4. 自动化归档建议

---

## 6. 首版里程碑定义

### 里程碑 M1：模板可安装
标准：
- 用户已安装 OpenClaw
- 能运行安装脚本
- 内容成功进入 `~/.openclaw/workspace`

### 里程碑 M2：主教练可用
标准：
- life-coach agent 可以跑通
- 核心 skills 可以调用
- 基本人格与边界稳定

### 里程碑 M3：多模态可接入
标准：
- OpenClaw 能通过配置连接你的代理网关
- 语音/图像场景能被路由到对应 skill

### 里程碑 M4：治理闭环成立
标准：
- memory-curator 可以产出清理建议
- reflection-reviewer 可以产出优化建议
- 但不会自动篡改核心边界

---

## 7. 最终建议

现在这件事的正确落地方向已经明确：

> **不要把它做成 Claude Code 调料包，而要做成 OpenClaw 的 workspace template + skills pack + agents pack。**

你的“小龙虾 Life Coach 调料包”最合理的交付物是：
- 一个 GitHub 模板仓库
- 一套可复制到 `~/.openclaw/workspace` 的目录
- 一套兼容 OpenClaw 的 skills
- 一组专门的 life coach agents
- 一套 memory / knowledge / prompts 体系
- 一套连接你代理网关的配置模板

这条路径与 OpenClaw 官方安装方式、配置方式、workspace 机制是对齐的。

如果你愿意，下一步我可以继续直接帮你做：

1. **把这份清单继续拆成第一周开发任务表**
2. **直接生成这个 OpenClaw 版本仓库的首版目录和文件草稿**