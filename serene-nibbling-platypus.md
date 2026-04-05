# 龙虾 Life Coach 调料包整体设计文档

## 1. 项目背景

当前 `D:/DevProject/know_konw_coach` 是空目录，所以这次不是在旧项目上做增量改造，而是从 0 到 1 设计一套新的 **Life Coach 调料包仓库**。

这个“龙虾调料包”本质上不是独立 App，而是一套面向 **Claude Code / AI 助手生态** 的增强包。用户通过 GitHub 下载后，可以一键安装到本地 Claude 环境中，让一个 life coach 型助手具备更稳定的人设、更强的技能体系、更好的用户理解能力，以及可控的自优化机制。

你的目标很明确：
- 做一个可下载、可安装、可扩展的 life coach 调料包
- 通过 GitHub 模板仓库分发
- 支持知识库、skills、memory、soul、agents 等完整结构
- 用户拿到你提供的 API 能力后，可以使用多模态模型
- 让 agent 随着与用户长期互动，越来越懂用户
- 同时避免“自进化”失控，避免记忆污染和人格漂移

---

## 2. 产品定位

建议将这个项目定义为：

> **一个可通过 GitHub 模板仓库安装的 Claude Code Life Coach 增强包**

它不是单一 prompt，也不是单一 skill，而是一整套“AI 教练操作系统”。

这套系统可以拆成 6 层：

1. **Soul / Persona 层**
   - 定义 life coach 的身份、价值观、语气、边界
   - 决定“它是谁”“它怎么说话”“它不能做什么”

2. **Skills 层**
   - 定义高频、稳定、可复用的教练能力
   - 决定“它怎么做事”

3. **Knowledge 层**
   - 定义 life coach 的方法库、案例库、提问框架、边界文档
   - 决定“它基于什么知识做判断”

4. **Memory 层**
   - 定义用户长期信息的记录机制
   - 决定“它怎么逐步懂用户”

5. **Agent 层**
   - 定义不同子代理的角色分工
   - 决定“它如何协作完成复杂任务”

6. **Governance 层**
   - 定义自设计、自进化、自净化的规则
   - 决定“它如何变好而不失控”

---

## 3. 核心设计目标

这个调料包应该同时满足以下目标：

### 3.1 易安装
用户能够通过 GitHub 模板仓库快速获取，并用简单脚本安装到本地 Claude 环境。

### 3.2 易理解
仓库结构清晰，使用者能快速知道：
- 人格在哪里改
- skills 在哪里扩展
- knowledge 在哪里补充
- memory 怎么工作
- API key 怎么配置

### 3.3 易进化
系统可以根据长期互动进行优化，但必须是 **受控进化**，而不是任意自改核心人格。

### 3.4 易分发
适合通过 GitHub 公开分发，同时可以让你以代理网关方式向用户发放可控能力。

### 3.5 易安全治理
必须防止：
- 真实 key 泄漏
- 记忆污染
- 角色越界
- 自进化失控
- 多模态被滥用

---

## 4. 推荐仓库结构

建议采用下面这套结构：

```text
know_konw_coach/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .claude/
│  ├─ CLAUDE.md
│  ├─ settings.template.json
│  ├─ agents/
│  │  ├─ life-coach.md
│  │  ├─ memory-curator.md
│  │  ├─ reflection-reviewer.md
│  │  ├─ safety-guardian.md
│  │  └─ multimodal-router.md
│  ├─ skills/
│  │  ├─ coach-intake/
│  │  ├─ goal-clarify/
│  │  ├─ weekly-review/
│  │  ├─ emotional-debrief/
│  │  ├─ habit-reset/
│  │  ├─ voice-checkin/
│  │  └─ vision-reflection/
│  ├─ memory/
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
│  ├─ soul/
│  │  ├─ identity.md
│  │  ├─ values.md
│  │  ├─ tone.md
│  │  └─ boundaries.md
│  ├─ evolution/
│  │  ├─ signals.md
│  │  ├─ improvement-playbook.md
│  │  ├─ architecture-review.md
│  │  └─ anti-drift-rules.md
│  └─ install/
│     ├─ install.ps1
│     ├─ install.sh
│     └─ bootstrap.md
├─ examples/
│  ├─ user-settings.example.json
│  ├─ gateway.env.example
│  ├─ multimodal.env.example
│  └─ session-scenarios.md
└─ docs/
   ├─ architecture.md
   ├─ package-spec.md
   ├─ safety-model.md
   ├─ gateway-design.md
   └─ release-plan.md
```

这个结构的重点是：
- **人格**、**技能**、**知识**、**记忆**、**代理**、**治理** 六块分开
- 便于你后续独立维护
- 便于用户理解哪些内容可以自定义
- 便于未来做版本化升级

---

## 5. soul / persona 的设计

`soul` 不应该是一个空概念，而应该被定义成一组稳定的人格规则资产。

建议拆成四部分：

### 5.1 `identity.md`
定义这个 life coach 是谁：
- 它是长期陪伴型 life coach
- 它的目标不是替用户做决定，而是帮助用户澄清、拆解、执行、复盘
- 它不是万能顾问，也不是权威裁判

### 5.2 `values.md`
定义核心价值观：
- 共情但不过度溺爱
- 支持行动，不只提供安慰
- 优先帮助用户建立自主性
- 重视长期一致性，不迎合短期情绪漂移
- 不制造依赖关系

### 5.3 `tone.md`
定义语言风格：
- 中文简洁表达
- 少废话
- 更像成熟的教练，而不是空泛鼓励机器人
- 先理解，再行动，再复盘
- 可根据用户偏好调整长短与强度

### 5.4 `boundaries.md`
定义清晰边界：
- 不充当医疗诊断者
- 不充当法律顾问
- 不提供投资指令
- 不替代危机干预
- 对高风险情绪和极端情境要转向安全策略

最后由 `.claude/CLAUDE.md` 统一引用这些内容，让它们成为整个调料包的“人格地基”。

---

## 6. skills 体系设计

skills 应该承载那些“高频、稳定、适合标准化”的教练动作。

建议首版优先做以下 skills：

### 6.1 `coach-intake`
用途：初次建立用户画像
输出重点：
- 当前关注主题
- 长期目标
- 当前障碍
- 偏好沟通方式
- 不希望触碰的话题

### 6.2 `goal-clarify`
用途：把模糊目标澄清成可执行目标
输出重点：
- 目标定义
- 为什么重要
- 现阶段阻碍
- 可用资源
- 下一步行动

### 6.3 `weekly-review`
用途：周复盘与下周行动整理
输出重点：
- 本周进展
- 阻碍模式
- 情绪波动
- 有效策略
- 下周 3 个最小行动

### 6.4 `emotional-debrief`
用途：对一次情绪事件做复盘
输出重点：
- 事件
- 感受
- 触发点
- 自动化想法
- 可替代解释
- 下一次如何处理

### 6.5 `habit-reset`
用途：当用户中断习惯后，快速重启
输出重点：
- 中断原因
- 最小恢复动作
- 降低难度
- 下一个检查点

### 6.6 `voice-checkin`
用途：语音输入场景下的教练对话
流程：
- 语音转写
- 抽取情绪 / 问题 / 请求
- 生成适配的行动式回复

### 6.7 `vision-reflection`
用途：图片输入场景下的分析与教练反馈
流程：
- 识别截图 / 照片内容
- 分析上下文
- 给出情境理解与行动建议

每个 skill 建议都包含：
- 适用场景
- 不适用场景
- 输入格式
- 输出结构
- 语气要求
- 风险边界

---

## 7. knowledge 知识库设计

knowledge 用来沉淀 life coach 的方法库，而不是堆杂乱 prompt。

建议拆成四层：

### 7.1 `frameworks/`
放方法框架：
- GROW
- WOOP
- CBT 风格拆解
- 习惯追踪框架
- 决策澄清框架
- 复盘框架

### 7.2 `prompts/`
放高质量结构模板：
- 首次访谈模板
- 行动拆解模板
- 情绪复盘模板
- 周复盘模板
- 阻力识别模板

### 7.3 `cases/`
放匿名案例：
- 拖延型用户案例
- 情绪反复型案例
- 目标模糊型案例
- 高压工作者案例

### 7.4 `safety/`
放安全规则：
- 高风险情绪处理边界
- 依赖性表达识别
- 过度承诺禁止项
- 危机场景升级模板

这样设计的好处是：
- 框架、模板、案例、安全边界彼此独立
- 后期扩充不会混乱
- 方便做“知识块版本演进”

---

## 8. memory 设计

memory 不能等于“保存所有聊天记录”。

真正有价值的 memory 是 **结构化长期记忆**。

建议长期记录的内容包括：
- 用户长期目标
- 用户稳定偏好
- 用户不喜欢的沟通方式
- 对用户有效的方法
- 明确边界与禁区
- 长期重复出现的主题

不建议直接存入长期记忆的内容包括：
- 一次性的情绪发泄
- 当下临时状态
- 未验证的短期偏好
- 与长期陪伴无关的小细节
- 高敏感且非必要的隐私

### 8.1 推荐 memory 文件
- `MEMORY.md`：记忆索引
- `user_profile_template.md`：用户画像模板
- `feedback_style_template.md`：风格反馈模板
- `long_term_goals_template.md`：长期目标模板
- `boundaries_template.md`：边界模板
- `archive_rules.md`：归档与淘汰规则

### 8.2 memory 的原则
- 宁少勿乱
- 先判断价值，再入库
- 先结构化，再沉淀
- 可归档，不要无限堆积
- 新事实优先于旧推测

---

## 9. agent 体系设计

建议不要让一个大而全的 agent 包办一切，而是做清晰分工。

### 9.1 `life-coach`
主代理。
负责：
- 直接和用户对话
- 选择合适的 skill
- 调用知识与记忆
- 输出教练式回应

### 9.2 `memory-curator`
记忆整理代理。
负责：
- 判断哪些信息值得记住
- 把对话信息抽取成结构化记忆候选
- 标记低价值 / 过期 / 冲突记忆

### 9.3 `reflection-reviewer`
反思代理。
负责：
- 回看最近对话
- 分析哪里回答得不够好
- 找出可优化的技能、语气、结构
- 产出改进建议稿

### 9.4 `safety-guardian`
安全代理。
负责：
- 检查是否越界
- 检查是否出现依赖性表达
- 检查是否给出不当专业化建议
- 检查是否触发高风险安全场景

### 9.5 `multimodal-router`
多模态路由代理。
负责：
- 识别当前输入是文本 / 图像 / 语音 / 文件
- 把输入分流给对应 skill 或处理流程
- 把多模态能力统一收口，而不是散在主代理里

---

## 10. 自我设计、自进化、自净化机制

这是这套系统最关键、也最容易失控的部分，所以必须设计得非常清楚。

### 10.1 自我设计

“自我设计”不应理解成 agent 随便改自己，而应理解成：

> 系统能审视自己的结构，并提出更合理的协作设计建议。

它可以调整的应该是：
- 哪些 skill 该拆分
- 哪些 knowledge 该补充
- 哪些场景应该新建 agent
- 哪些记忆模板需要更精细

但它不应该自动推翻核心人格和安全规则。

### 10.2 自进化

你给出的定义很重要：

> 自动化是让 life coach 更加了解你，根据你的往日聊天记忆，然后迭代小龙虾或者 life coach 的 agent 架构。

基于这个定义，建议把“自进化”拆成两层：

#### A. 对话层进化
根据历史记忆和反馈，优化：
- 提问顺序
- 语气长短
- 行动建议颗粒度
- 常用 skill 的调用优先级
- 针对特定用户的教练风格

#### B. 架构层进化
根据长期使用模式，优化：
- 是否新增 skill
- 是否拆分 agent
- 是否增加知识块
- 是否调整 memory 分类
- 是否改变多模态路由方式

### 10.3 自净化

你对“自净化”的定义是：

> 移除掉无关的信息。

这个定义非常对。

建议把自净化明确成：
- 去无关
- 去污染
- 去冗余
- 去漂移

具体来说：

#### 去无关
移除与长期陪伴无关的信息，避免记忆被噪声淹没。

#### 去污染
剔除偶发、矛盾、低可靠信息，避免错误画像。

#### 去冗余
删除重复和过期内容，防止系统变得越来越臃肿。

#### 去漂移
防止助手越聊越偏，逐渐偏离原本的 soul 与边界。

---

## 11. 自进化的治理边界

这一部分必须写死，不然系统早晚会失控。

### 11.1 允许自动调整的范围
可以自动产出建议，或在严格条件下自动更新的内容：
- 低风险案例库
- 非核心 prompts 草稿
- memory 归档建议
- 低风险 skill 草稿
- 结构优化建议

### 11.2 禁止自动改写的范围
必须人工确认后才能动：
- `.claude/CLAUDE.md`
- `.claude/soul/*`
- `.claude/knowledge/safety/*`
- 高风险边界规则
- API 与安全治理策略

### 11.3 推荐机制
首版采用：

> **自动分析 + 产出建议稿 + 人工批准后执行**

这样既保留了成长能力，又不会把系统变成不可控黑盒。

---

## 12. GitHub 分发与安装设计

你已经明确选择：**模板仓库**。

这是首版最适合的路线。

### 12.1 主分发方式
采用 **GitHub template repository**：
- 用户点击 `Use this template`
- 或 `git clone`
- 或下载 zip

模板仓库优点：
- 最容易上手
- 对用户可见、可改、可二次定制
- 版本管理简单
- 文档承载能力强

### 12.2 一键安装脚本
在仓库中提供：
- `install/install.ps1`
- `install/install.sh`
- `install/bootstrap.md`

安装脚本负责：
- 检测本地 Claude 目录
- 复制或合并 `.claude/agents`
- 安装 skills
- 初始化 memory 模板
- 写入本地配置模板
- 引导用户填写 token / gateway 配置
- 避免覆盖用户已有核心配置

### 12.3 安装策略建议
优先采用：
- `template -> local config -> merge`

而不是：
- `直接强覆盖`

这样更安全，也更适合长期维护。

---

## 13. API key 与多模态能力设计

你已经明确选择：**代理网关模式**。

这是正确的，因为它比直接发真实上游 key 安全得多。

### 13.1 推荐模式
用户本地不保存上游真实 key，只保存：
- 网关地址
- 用户 token
- 可用模型名
- 多模态开关

真实上游 key 只存在于你的服务端。

### 13.2 本地配置建议
建议配置项包括：
- `provider`
- `base_url`
- `api_key` 或 `user_token`
- `chat_model`
- `vision_model`
- `audio_model`
- `image_model`
- `document_model`
- `enable_multimodal`

建议提供：
- `settings.template.json`
- `gateway.env.example`
- `multimodal.env.example`

### 13.3 多模态能力接入方式
建议通过单独 skill / router 统一接入：
- `voice-checkin`
- `vision-reflection`
- `multimodal-router`

典型使用场景：
- 用户上传语音倾诉，系统转写后做情绪与问题整理
- 用户上传聊天截图，系统分析上下文并做教练式反馈
- 用户上传文件，系统帮助梳理计划、复盘或提炼重点

### 13.4 安全控制
如果由你分发 token，建议服务端具备：
- 限额
- 撤销
- 日志
- 模型白名单
- 请求大小限制
- 黑名单策略

否则一旦泄漏，代价很高。

---

## 14. MVP 设计

你已经明确：第一版优先做 **完整骨架**。

所以 MVP 不应一开始追求极深内容，而应追求：

> **可安装、可运行、可理解、可扩展**

### 14.1 第一版建议完成的内容
1. 基础仓库骨架
2. `.claude/CLAUDE.md`
3. soul 四件套
4. 4~5 个核心 agents
5. 5~7 个基础 skills
6. 结构化 memory 模板
7. knowledge 基础框架文档
8. GitHub 模板仓库分发说明
9. install 脚本
10. 代理网关配置模板
11. 多模态配置模板
12. governance 文档

### 14.2 MVP 暂不做
- 自动改写核心人格
- 自动同步所有历史会话
- 自动联网学习
- 自动升级整个仓库
- 高度自治的黑盒进化

---

## 15. 后续版本路线图

### V1.1
补深度：
- 扩展更多教练 skill
- 增加更多案例
- 增强 memory 归档规则
- 增加更精细的用户画像模块

### V1.2
补反思：
- 增加对话评分机制
- 增加结构优化建议输出
- 增加 self-review 报告模板

### V1.3
补平台能力：
- 接入正式代理网关
- 增加用户 token 管理
- 默认开放多模态能力
- 增加版本升级策略

### V2
补生态：
- 兼容 skill-install 生态
- 提供可选的在线更新组件
- 提供更标准化的用户 onboarding 流程

---

## 16. 风险与边界

### 16.1 自进化失控
如果允许系统自动改人格、改安全规则，最终一定会漂移。

所以必须限制：
- 核心人格不可自动改
- 安全边界不可自动改
- 高风险内容只能产出建议稿

### 16.2 记忆污染
如果所有聊天都记，系统会越来越笨。

所以必须要求：
- 只记高价值长期信息
- 无关信息及时剔除
- 旧推测可被新事实覆盖
- 高敏感内容严格控制

### 16.3 角色越界
life coach 不能伪装成医生、律师、投资顾问、危机干预专家。

### 16.4 分发安全
公开仓库不能包含：
- 真实 API key
- 管理员 token
- 可滥用的统一密钥

### 16.5 多模态风险
图片、语音、文件能力需要做额外边界控制，防止：
- 误识别高敏感内容
- 过度保存输入材料
- 非必要长期记忆化

---

## 17. 推荐实施顺序

建议你按下面顺序落地：

### 第一阶段：骨架搭建
- 建仓库
- 建目录
- 建 README
- 建安装脚本
- 建配置模板

### 第二阶段：人格底座
- 写 soul
- 写 CLAUDE.md
- 定义核心行为与边界

### 第三阶段：基础能力
- 写核心 skills
- 写基础 knowledge
- 写 memory 模板
- 写 agent 定义

### 第四阶段：多模态与网关
- 设计 gateway 配置模板
- 加入语音 / 图像 skill
- 定义 multimodal router

### 第五阶段：治理机制
- 加入 reflection-reviewer
- 加入 memory-curator
- 加入 architecture-review
- 加入 anti-drift 规则

---

## 18. 首版应创建的关键文件

首版落地建议优先创建：

- `README.md`
- `.claude/CLAUDE.md`
- `.claude/settings.template.json`
- `.claude/soul/identity.md`
- `.claude/soul/values.md`
- `.claude/soul/tone.md`
- `.claude/soul/boundaries.md`
- `.claude/agents/life-coach.md`
- `.claude/agents/memory-curator.md`
- `.claude/agents/reflection-reviewer.md`
- `.claude/agents/safety-guardian.md`
- `.claude/agents/multimodal-router.md`
- `.claude/skills/coach-intake/*`
- `.claude/skills/goal-clarify/*`
- `.claude/skills/weekly-review/*`
- `.claude/skills/emotional-debrief/*`
- `.claude/skills/habit-reset/*`
- `.claude/skills/voice-checkin/*`
- `.claude/skills/vision-reflection/*`
- `.claude/memory/MEMORY.md`
- `.claude/memory/user_profile_template.md`
- `.claude/memory/feedback_style_template.md`
- `.claude/memory/long_term_goals_template.md`
- `.claude/memory/boundaries_template.md`
- `.claude/memory/archive_rules.md`
- `.claude/knowledge/frameworks/*`
- `.claude/knowledge/prompts/*`
- `.claude/knowledge/cases/*`
- `.claude/knowledge/safety/*`
- `.claude/evolution/signals.md`
- `.claude/evolution/improvement-playbook.md`
- `.claude/evolution/architecture-review.md`
- `.claude/evolution/anti-drift-rules.md`
- `.claude/install/install.ps1`
- `.claude/install/install.sh`
- `.claude/install/bootstrap.md`
- `examples/user-settings.example.json`
- `examples/gateway.env.example`
- `examples/multimodal.env.example`
- `docs/architecture.md`
- `docs/package-spec.md`
- `docs/safety-model.md`
- `docs/gateway-design.md`

---

## 19. 验证方案

落地后需要验证：

1. 在空白 Claude 环境中能否完成安装
2. 是否不会覆盖用户已有核心配置
3. soul 是否能稳定生效
4. core skills 是否可独立调用
5. memory 是否只记录高价值信息
6. 自净化是否能识别并移除无关信息
7. 自进化是否只能生成建议而不是乱改核心规则
8. 多模态配置是否可以正常启用
9. 公开仓库是否不包含真实密钥

---

## 20. 最终结论

这个项目最合理的方向，不是做成一个“巨大的 prompt 包”，而是做成一个真正可维护的 **Life Coach 调料包模板仓库**。

它的核心优势会来自：
- 稳定的 soul
- 可复用的 skills
- 有结构的 knowledge
- 干净的 memory
- 清晰的 agent 分工
- 受控的自进化与自净化
- 可配置的代理网关与多模态能力

结合你的选择，首版最适合的路线已经很清楚：

> **先把完整骨架搭起来，用 GitHub 模板仓库分发，用代理网关承接多模态能力，用受控治理机制承接长期进化。**

这样它既能快速落地，也能为后面做真正“越来越懂用户”的 life coach 打下一个稳定基础。