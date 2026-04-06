# 长期迷茫用户工作流

## 1. 目标

当用户不是一次性“想不清”，而是长期处于：

- 没有方向
- 反复卡住
- 总在外部评价中寻找答案
- 想了很多但很难落地

时，Lifecoach 不应只做一轮普通 `goal-clarify`，而应走一条长期工作流。

## 2. 外部方法借鉴

这条工作流主要借鉴了四类方法：

- ICF Core Competencies  
  重点：建立关系、主动倾听、唤起觉察、促进成长
- Motivational Interviewing  
  重点：处理 ambivalence，不急着说服
- ACT Values Clarification  
  重点：在混乱中重新找回价值导向
- Solution-Focused Coaching  
  重点：把问题收束成一个更小的下一步

## 3. 工作流阶段

### 3.1 stabilize
- 先让用户从混乱回到可思考状态
- 主要知识：
  - `framework-rebuild-pyramid-001`
  - `framework-emotional-debrief-001`

### 3.2 clarify
- 先澄清“真正想推进的是什么”
- 主要知识：
  - `framework-goal-clarity-001`
  - `framework-rebuild-pyramid-001`

### 3.3 diagnose_pattern
- 识别长期迷茫背后的模式
- 主要知识：
  - `framework-diagnostic-onion-001`
  - `case-family-seeking-parental-approval-001`
  - `case-family-love-as-debt-001`

### 3.4 action_bridge
- 把已经看清的问题转成一个低阻力动作
- 主要知识：
  - `framework-diagnosis-to-action-transition-001`
  - `framework-goal-clarity-001`

### 3.5 timeline_review
- 看实践后有没有掉回迷茫循环
- 主要知识：
  - `framework-weekly-review-001`
  - `framework-habit-reset-001`

## 4. 当前代码落点

静态 workflow：
- `packages/lifecoach-workspace/content/.lifecoach/workflows/long-horizon-confusion-workflow.json`

runtime 路由：
- `packages/lifecoach-core/src/workflows/workflow_router.js`

knowledge 提权：
- `packages/lifecoach-core/src/retrieval/knowledge_retriever.js`

## 5. 当前效果

当用户出现明显“长期迷茫”信号时：

1. runtime 会激活 `long-horizon-confusion` workflow
2. 判断当前阶段
3. 优先召回你自己的 knowledge 中对应阶段的框架和案例
4. 让 Lifecoach 更像一条连续工作流，而不是一次性回答器
