# LifeCoach 调料包能力接入计划

## 目标

本文用于整理当前展示界面与 `LifeCoach` 调料包核心架构之间的接入现状、能力缺口与后续落地计划。

目标不是继续堆更多页面，而是把已经存在于 `lifecoach-core`、`lifecoach-control-plane`、`workspace` 和 `state` 里的关键能力，逐步接成一个真正可解释、可追踪、可治理的教练工作台。

---

## 一、当前判断

当前前端已经不是纯展示壳，而是已经接上了几条核心能力链路：

- 聊天主链路
- 多模态能力入口
- 钥匙库 / 模型目录 / OpenClaw 接入信息
- 基础版用户画像侧栏
- 教练 To-Do 生成与展示

但从调料包的核心架构来看，前端还没有把最“系统味”的那一层真正接出来：

- 结构化长期记忆真相源
- 时间线阶段变化
- 多 agent 治理结果
- review / routeQuality / flavorOptimization / proposal
- layer governance / system review
- state artifacts 浏览与追踪

所以接下来的重点不应再是增加更多静态页，而是逐步把这些核心能力接进现有工作台。

---

## 二、已接入能力

### 1. 聊天主链路

已通过 `apps/console/public/app.js -> /api/chat/completions -> apps/console/server.js -> finalizeChatCompletion() -> runSession()` 打通。

当前已经接上的后端能力包括：

- 安全判断
- 技能路由
- 知识检索
- 记忆处理
- 时间线构造
- 自适应策略
- 路由质量分析
- 回顾报告
- flavor 评分
- 提案生成
- backstage arbitration

### 2. 接入与配置能力

已经接上的配置类能力包括：

- 钥匙库
- OpenClaw 接入片段
- 模型目录
- 使用情况查询

### 3. 多模态入口

当前展示层已经接上：

- 图片生成
- 语音合成
- 语音转写

### 4. 教练 To-Do

已接上：

- Chat 顶部按钮触发生成
- 左侧栏 To-Do 展示
- progress / deadline 展示
- 本地持久化

### 5. 用户画像基础展示

当前侧栏已经有用户画像区域，但还处于“画像感展示”阶段，不是直接映射 `memory.records` 的结构化长期画像。

---

## 三、主要缺口

### 1. 用户画像还不够“真”

当前前端展示的更多是：

- 聊天摘要
- 最近状态说明
- To-Do 概览

但还没真正接出：

- 长期目标
- 稳定偏好
- 用户边界
- 重复出现的模式
- 有效支持方式

### 2. 时间线还没有独立可视化

后端已经有：

- `timeline.activeTimeline`
- `timeline.timelines`
- `timeline.phase`
- `timeline.canClose`
- `timelineOutcome`

但前端还没有真正把它做成一个“主线推进视图”。

### 3. To-Do 还没有和 followup/toolList 完全打通

当前前端 To-Do 更像 control-plane 层的教练待办生成器，还不是核心 followup/tool list 系统的完整前台呈现。

### 4. 多 agent 治理不可见

后端已有：

- `arbitration.activeBackstageAgents`
- `arbitration.directives`
- `arbitration.gatingAgent`
- `arbitration.frontstageMode`

但前端没有把这些治理结果展示出来。

### 5. 自进化闭环不可见

后端已有：

- `routeQuality`
- `review`
- `flavorScores`
- `timelineOutcome`
- `flavorOptimization`
- `proposal`
- `systemReview`

但前端目前还没有任何“系统回顾 / 系统提案 / 治理审核”层的展示。

### 6. 状态工件没有浏览入口

当前状态目录中的：

- `events`
- `timeline`
- `reviews`
- `memory-cache`
- `proposals`
- `tool-lists`
- `followups`

还没有前端浏览页。

---

## 四、推荐接入顺序

建议分为 4 期推进。

---

## 第 1 期：接实“用户画像 + 时间线”

### 目标

让用户真正感受到这个系统在长期理解自己，而不是只会记住一轮聊天。

### 接入项

#### 1. 用户画像页 / 画像卡升级

接入来源：

- `memory.records`
- `memory.updates`
- `memory.archives`

前端展示建议：

- 长期目标
- 稳定偏好
- 明确边界
- 重复模式
- 有效支持方式

#### 2. 时间线页 / 主线视图

接入来源：

- `timeline.activeTimeline`
- `timeline.timelines`
- `timeline.phase`
- `timeline.canClose`
- `timelineOutcome`

前端展示建议：

- 当前主线
- 所处阶段
- 最近关键节点
- 适合继续 / 修订 / 收束

### 本期结果

用户会明确感受到：

> 这个系统正在长期理解我，而不是只回复我。

---

## 第 2 期：接实“行动推进层”

### 目标

让系统不仅能理解用户，还能推动用户往前走。

### 接入项

#### 1. 打通 To-Do 与 toolList

当前 To-Do 已存在，但建议进一步接入：

- `packages/lifecoach-core/src/followup/tool_list_builder.js`

让前端看到的待办，不只是教练总结出来的动作，也能和核心 followup 策略保持一致。

#### 2. 前端进度与完成状态更新

建议增加：

- 完成勾选
- 进度调整
- deadline 更新
- 延期理由

#### 3. followup 跟进视图

接入来源：

- `followup record`
- `reviewAfter`
- `cooldownHours`
- `followupStyle`

前端展示建议：

- 下一次建议回看时间
- 当前是否处于冷却期
- 应该 gentle check-in 还是 progress check-in

### 本期结果

产品会从“会聊天的教练”进一步变成：

> 一个会陪用户推进事情的教练系统。

---

## 第 3 期：接实“多 agent 治理层”

### 目标

把后台治理逻辑从黑盒变成可见能力，但仍然保持前台只有一个教练身份。

### 接入项

#### 1. 后台 agent 状态卡

接入来源：

- `arbitration.activeBackstageAgents`
- `arbitration.directives`
- `arbitration.gatingAgent`
- `arbitration.frontstageMode`

前端展示建议：

- 当前有哪些后台 agent 在工作
- 当前是谁在收紧边界
- 谁在整理记忆
- 谁在产出 review 信号

#### 2. 风险模式可视化

接入来源：

- `safety.riskLevel`
- `safety.needsSafetyMode`
- `route.primarySkill`

前端展示建议：

- 普通 coaching
- 收紧模式
- 安全模式

### 本期结果

系统的“调料包特色”会被真正看见：

> 单前台教练，多后台治理。

---

## 第 4 期：接实“自进化与治理闭环”

### 目标

把后端已经存在的 review / proposal / governance / persistence 结果前台化。

### 接入项

#### 1. Review 面板

展示：

- 回复是否过长
- 是否缺少下一步
- 是否路由不合适
- 是否该修订策略

#### 2. Proposal 面板

展示：

- 提案标题
- 提案原因
- 命中的 layer
- 当前状态
  - blocked
  - allowed
  - needs system review

#### 3. Layer Governance 面板

接入来源：

- `layer-governance.json`
- `guardrail`
- `systemReview`

展示：

- 哪些层完全不能动
- 哪些层允许 proposal
- 哪些层需要系统审核

#### 4. 状态工件浏览页

接入来源：

- `events`
- `timeline`
- `reviews`
- `memory-cache`
- `proposals`
- `tool-lists`
- `followups`

前端展示建议：

- 最近几次会话工件
- 一次会话是怎样被分析的
- 为什么会形成提案

### 本期结果

系统将从“有教练前端”升级成：

> 一个可解释、可追踪、可治理的长期教练工作台。

---

## 五、推荐页面结构

建议未来前端逐步收敛成以下核心页面：

### 1. Chat

- 主要对话
- 当前画像摘要
- 当前 To-Do
- 当前主线摘要

### 2. Profile

- 长期用户画像
- 稳定偏好
- 边界
- 重复模式

### 3. Timeline

- 主线列表
- 当前阶段
- 关键节点
- 跟进状态

### 4. Coach Actions

- To-Do
- toolList
- followup

### 5. System Review

- routeQuality
- review
- flavorOptimization
- proposal
- governance

### 6. Keys

- 钥匙
- 接入
- 模型能力

---

## 六、优先级排序

如果按投入产出比排序，建议优先做：

1. 结构化用户画像
2. 时间线展示
3. To-Do 与 toolList 打通
4. 多 agent 治理可视化
5. Proposal / Governance / State artifacts 面板

---

## 七、最小开发计划

### Sprint A

- 用户画像页
- 时间线页
- Chat 侧栏升级为真实画像摘要

### Sprint B

- To-Do / toolList / followup 联通
- 动作完成与进度更新

### Sprint C

- 多 agent 治理可视化
- 风险模式与前台模式展示

### Sprint D

- Review / Proposal / Governance / State artifacts 面板

---

## 八、核心建议

接下来的重点不是增加更多新页面，而是先把：

- 用户理解层
- 行动推进层

接实。

因为它们决定用户是否觉得：

> 这个教练真的越来越懂我，且真的在推动我前进。

之后再逐步把：

- 多 agent 治理层
- 自进化与治理可视化层

接出来，形成调料包真正的系统级壁垒。
