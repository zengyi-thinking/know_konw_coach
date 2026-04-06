function buildFollowupPrompt(context = {}) {
  const toolList = context.toolList || {};
  const record = context.record || {};
  const adaptivePolicy = context.adaptivePolicy || {};
  const item = (toolList.items || [])[0] || {};
  const baseTitle = item.title || '上次那一步';

  if (record.status === 'closure_prompt') {
    return `上次你提到“${baseTitle}”已经有推进了。我想轻轻确认一下，这一阶段现在是否已经可以先收束？如果还差一点，我们也可以一起补最后一个复盘点。`;
  }

  if (record.status === 'revision_prompt') {
    return `上次你准备做“${baseTitle}”。如果这一步卡住了，我们先不硬推，可以一起把门槛再降一点。你最近是卡在开始、执行中，还是完成后的回顾上？`;
  }

  if ((adaptivePolicy.emotionalWeight || 0.45) >= (adaptivePolicy.rationalWeight || 0.55)) {
    return `我想轻轻跟进一下，上次你准备做“${baseTitle}”。最近这一步大概推进到哪儿了？如果还没动，也没关系，我们可以先找最小的一步。`;
  }

  return `上次你给自己的行动是“${baseTitle}”。我来确认一下：这一步最近已经开始、推进了一部分，还是暂时还没落下去？`;
}

module.exports = {
  buildFollowupPrompt,
};
