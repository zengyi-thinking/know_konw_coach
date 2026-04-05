# 对味指标架构

## 1. 目标

“越用越对味”不能只靠主观感觉，而要变成可观测、可记录、可比较的信号。

本文件定义第一版对味指标：

- `emotional_attunement`
- `clarity_gain`
- `actionability`
- `boundary_correctness`
- `skill_fit`
- `continuity_strength`

以及一个时间线结果判断：

- `timelineOutcome`

## 2. 静态配置

配置文件：
- `packages/lifecoach-workspace/content/.lifecoach/flavor-metrics.json`

其中定义：
- 维度
- 权重
- band
- 时间线结果映射
- 优化目标阈值

## 3. Runtime 计算

核心文件：
- `packages/lifecoach-core/src/learning/flavor_scorer.js`
- `packages/lifecoach-core/src/learning/timeline_outcome_evaluator.js`

输出：
- `result.flavorScores`
- `result.timelineOutcome`

## 4. 当前第一版用途

第一版先做三件事：

1. 让每轮会话有一个结构化对味分
2. 让 timeline 有一个结构化实践结果判断
3. 让优化目标可被 review / proposal / 后续学习模块读取

## 5. 第一版闭环

当前已经形成一条最小闭环：

1. `runSession()` 生成 `flavorScores`
2. `timeline_outcome_evaluator` 生成 `timelineOutcome`
3. `flavor_optimizer` 从低分维度里挑出优化重点
4. `review.flavorOptimization` 输出：
   - 哪个维度需要调
   - 为什么低
   - 应该改什么
   - 应该作用于哪一层

这意味着系统已经能从“只是打分”进入“打分后给出下一步优化方向”。

## 6. 设计原则

- 不直接把低分等同于“要改 prompt”
- 不自动改 `life-coach` 身份与边界
- 优先优化低风险层：
  - route
  - knowledge 注入
  - memory 权重
  - follow-up 节奏

## 7. 下一步

在这套指标基础上，后续可以继续做：

1. 用户显式反馈接入
2. timeline 结果回写
3. preference learning
4. route optimizer
