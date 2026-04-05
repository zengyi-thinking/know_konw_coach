# OpenClaw Life Coach Knowledge 调用策略

## 1. 文档目标

这份文档定义 OpenClaw Life Coach 如何使用知识库。

核心目标不是“让模型知道更多”，而是：

- 在需要的时候调用知识
- 只调用和当前场景高度相关的知识块
- 让知识服务于 coaching，而不是压过 coaching
- 让后续外部语料可以稳定沉淀为可调用资产

---

## 2. 知识调用的核心原则

### 2.1 不整库灌输
知识库存在的目的不是把大量文档直接拼进上下文。
必须控制召回数量、注入长度和相关性。

### 2.2 让知识服务于当前 skill
知识调用应优先围绕当前主 skill 进行。
如果当前主任务是 `weekly-review`，应优先召回复盘框架，而不是泛化情绪材料。

### 2.3 优先摘要，不优先原文
大多数场景下，knowledge 应以：
- 结构化摘要
- 核心结论
- 提问框架
- 注意事项

的形式注入，而不是整篇原文直接注入。

### 2.4 知识是支撑，不是讲课素材
即使检索到了高质量知识，也不能把回复写成一段方法论宣讲。
知识的作用是帮助 agent：
- 更稳地提问
- 更稳地结构化
- 更稳地收束

而不是向用户炫耀框架。

### 2.5 safety 知识具有更高优先级
一旦场景涉及边界、安全、依赖风险、危机语言，优先召回 safety 类知识块。

---

## 3. 知识库推荐结构

建议知识库分为四类：

- `frameworks/`：方法框架
- `prompts/`：提问模板与引导结构
- `cases/`：匿名案例与模式示例
- `safety/`：边界、安全、风险处理规则

推荐目录：
- `workspace/knowledge/frameworks/`
- `workspace/knowledge/prompts/`
- `workspace/knowledge/cases/`
- `workspace/knowledge/safety/`

---

## 4. 知识块最小元数据规范

每个知识块建议具备以下元数据：

- `id`
- `title`
- `type`
- `topics`
- `scenes`
- `riskLevel`
- `recommendedSkills`
- `recommendedAgents`
- `keywords`
- `summary`

推荐结构示例：

```yaml
id: framework-goal-clarity-001
title: 目标澄清最小框架
type: framework
topics:
  - 目标澄清
  - 优先级
  - 行动设计
scenes:
  - 目标模糊
  - 方向太多
  - 无法聚焦
riskLevel: low
recommendedSkills:
  - goal-clarify
recommendedAgents:
  - life-coach
keywords:
  - 想做很多事
  - 不知道从哪开始
  - 没有重点
summary: 帮助用户从愿望走向目标定义、关键阻碍识别和下一步最小行动。
```

---

## 5. 知识调用输入与输出

## 5.1 输入
knowledge retriever 至少应接收：
- 当前用户输入
- 当前主 skill
- 当前会话状态
- memory 中的长期主题
- safety 风险等级
- 输入模态摘要（如有）

## 5.2 输出
应输出：
- 命中的知识块列表
- 每个知识块的相关性分
- 推荐注入方式
- 是否建议省略某些低价值知识块

推荐结构：

```json
{
  "hits": [
    {
      "id": "framework-weekly-review-001",
      "score": 0.91,
      "injectMode": "summary",
      "reason": "当前主 skill 为 weekly-review，且用户在总结一周执行与情绪波动"
    }
  ]
}
```

---

## 6. 应触发知识调用的场景

### 6.1 当前主 skill 明确，且需要稳定方法支持
例如：
- `goal-clarify` 需要目标澄清框架
- `weekly-review` 需要复盘框架
- `emotional-debrief` 需要事件-感受-想法拆解框架

### 6.2 用户问题反复出现，适合匹配结构化知识
例如：
- 反复拖延
- 目标分散
- 周期性自责
- 关系冲突后反复内耗

### 6.3 当前需要更稳定的提问顺序
当 agent 需要保持提问质量一致性时，可召回 prompts / frameworks 类知识块。

### 6.4 当前是 safety 或边界相关场景
一旦进入 safety 模式，应优先调 safety 类知识块，而不是普通方法框架。

### 6.5 用户提供了需要分析的外部材料
例如图片、语音、文件经过结构化后，若要进一步解释或收束，可根据材料主题调相关知识块。

---

## 7. 不应触发知识调用的场景

### 7.1 只需要简短承接即可
如果当前用户只是刚开口表达，还没有形成明确任务，先承接和澄清，不要立刻上知识。

### 7.2 当前最缺的是信息，不是框架
如果用户说得很模糊，问题在于信息不足，此时应先问问题，而不是先调用知识。

### 7.3 调用知识会让回应明显变硬
如果加入知识只会让回答像说教、上课、分析报告，就不该调。

### 7.4 用户当前情绪过满，承载不了复杂框架
强情绪场景下，知识调用应非常克制，优先稳定和收束。

---

## 8. 与 skill 的绑定策略

### 8.1 `coach-intake`
优先知识类型：
- prompts
- frameworks

适合调用：
- 首次访谈模板
- 用户画像采集框架
- 边界确认清单

### 8.2 `goal-clarify`
优先知识类型：
- frameworks
- prompts

适合调用：
- 目标澄清框架
- 优先级梳理模板
- 最小行动设计模板

### 8.3 `weekly-review`
优先知识类型：
- frameworks
- prompts
- cases

适合调用：
- 周复盘结构
- 有效策略识别模板
- 常见复盘误区案例

### 8.4 `emotional-debrief`
优先知识类型：
- frameworks
- prompts
- safety（必要时）

适合调用：
- 情绪事件拆解框架
- 自动化想法识别模板
- 高风险情绪边界规则

### 8.5 `habit-reset`
优先知识类型：
- frameworks
- prompts
- cases

适合调用：
- 习惯重启最小动作框架
- 降低门槛模板
- 中断后恢复案例

### 8.6 `voice-checkin`
优先知识类型：
- prompts
- frameworks

通常在语音结构化完成后，再按真实主任务匹配知识。

### 8.7 `vision-reflection`
优先知识类型：
- prompts
- cases
- frameworks

通常先根据图片摘要识别真实任务，再决定知识调用。

---

## 9. 与 memory 的联动策略

knowledge 不应只看当前输入，也应参考长期主题。

例如：
- 用户长期主题是“目标过多导致分散”，当前又说“最近又乱了”，则 `goal-clarify` 相关知识块权重上升
- 用户长期模式是“周期性自责”，当前在做周复盘，则自责识别与复盘框架权重上升

联动原则：
- memory 提供长期主题标签
- knowledge retriever 用这些标签做加权
- 但不能让旧记忆压过当前输入本身

即：

> 当前问题优先，长期模式辅助。

---

## 10. 注入方式策略

### 10.1 `summary`
默认首选。
适用于大多数场景。

注入内容：
- 1 段摘要
- 3-5 个关键点
- 1 个提醒事项

### 10.2 `conclusion-only`
适用于：
- 用户情绪较满
- 上下文空间紧张
- 只需要一个结论提醒

### 10.3 `full`
仅在以下情况考虑：
- 知识块本身很短
- 当前场景强依赖完整结构
- 没有更高效的摘要版本

默认不应使用 `full`。

---

## 11. 召回数量控制

建议首版限制：
- 普通场景：最多 1-2 个知识块
- 复杂场景：最多 3 个知识块
- safety 场景：优先 1 个 safety + 1 个辅助块

原则：
- 宁少勿杂
- 宁准勿全
- 宁摘要勿堆叠

---

## 12. 首版召回策略建议

### 阶段 1：标签 + 关键词召回
根据：
- 当前 skill
- 用户输入关键词
- 会话状态标签
- 风险等级

做规则检索。

### 阶段 2：标签 + 摘要语义召回
在规则召回基础上，补充向量检索或语义相似检索。

### 阶段 3：召回 + rerank
在多个候选中，按以下因素 rerank：
- skill 匹配度
- topic 匹配度
- 当前情绪承载度
- safety 优先级
- memory 长期主题匹配度

---

## 13. 首版可落地的结果结构

```json
{
  "needsKnowledge": true,
  "strategy": "skill-first",
  "maxItems": 2,
  "hits": [
    {
      "id": "framework-emotion-debrief-001",
      "type": "framework",
      "score": 0.88,
      "injectMode": "summary"
    }
  ]
}
```

这能直接作为执行层模块接口的雏形。

---

## 14. 后续外部语料沉淀流程

当你后续提供专业语料时，建议按下面流程进入知识库：

1. 识别语料类型
2. 提炼核心观点
3. 拆成结构化知识块
4. 打上 topics / scenes / riskLevel / recommendedSkills
5. 补 summary
6. 写入 `workspace/knowledge/`
7. 加入 retriever 可检索索引

这样知识库沉淀的对象不是“原始资料”，而是“可调用知识块”。

---

## 15. 最终结论

Knowledge 调用机制的核心不是“多”，而是“准”。

对 OpenClaw Life Coach 来说，知识库应该承担的是：

> 为当前 coaching 任务提供稳定框架、提问结构与边界支持。

它不应该把对话变成知识灌输，也不应该替代用户自己的澄清过程。

所以最重要的调用原则是：

> skill 优先决定知识，当前场景优先决定召回，摘要优先于原文，少量高相关优先于整库堆叠。
