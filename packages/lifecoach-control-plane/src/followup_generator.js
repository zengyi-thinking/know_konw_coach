function buildOption(key, title, subtitle) {
  return { key, title, subtitle };
}

function fromWorkflow(flow) {
  const workflow = flow.result.workflow;
  if (!workflow) return null;

  if (workflow.id === 'long-horizon-confusion' && workflow.stageId === 'diagnose_pattern') {
    return [
      buildOption('A', '最近最纠结的决定', '先抓一个真实场景'),
      buildOption('B', '最怕失去谁的认可', '看清评价压力来源'),
      buildOption('C', '这是你的目标吗', '区分自己和外部期待'),
      buildOption('D', '先保留一个小动作', '不急着一次想清全部'),
    ];
  }

  if (workflow.id === 'long-horizon-confusion' && workflow.stageId === 'clarify') {
    return [
      buildOption('A', '我真正想推进什么', '先说结果'),
      buildOption('B', '我最卡的是什么', '先看阻碍'),
      buildOption('C', '我已经有什么资源', '先看可用条件'),
      buildOption('D', '你帮我先收束', '先缩小问题'),
    ];
  }

  if (workflow.stageId === 'action_bridge') {
    return [
      buildOption('A', '今天能做的最小动作', '先落一个动作'),
      buildOption('B', '我最担心做不到什么', '先看阻力'),
      buildOption('C', '把动作再缩小', '降低门槛'),
      buildOption('D', '先设一个观察点', '让后续能复盘'),
    ];
  }

  return null;
}

function fromRoute(flow) {
  const route = flow.result.route.primarySkill;
  const optimization = flow.result.flavorOptimization?.focus || [];
  const needsAction = optimization.some((item) => item.dimension === 'actionability');
  const needsAttunement = optimization.some((item) => item.dimension === 'emotional_attunement');

  if (route === 'emotional-debrief') {
    return [
      buildOption('A', '具体发生了什么', '先把事件说清楚'),
      buildOption('B', '最刺到我的那句话', '先抓触发点'),
      buildOption('C', needsAttunement ? '先接住我的感受' : '我为什么反应这么大', needsAttunement ? '先不分析' : '再看模式'),
      buildOption('D', needsAction ? '先落一个今天的小动作' : '先看看接下来怎么收束', needsAction ? '别太大' : '慢慢推进'),
    ];
  }

  if (route === 'goal-clarify') {
    return [
      buildOption('A', '我真正想要的结果', '先说结果'),
      buildOption('B', '为什么总是卡住', '先看阻碍'),
      buildOption('C', '我手上已经有什么', '先看资源'),
      buildOption('D', needsAction ? '你帮我收束成一个最小行动' : '你帮我先归纳重点', needsAction ? '别给太多步' : '先不要展开太多'),
    ];
  }

  if (route === 'weekly-review') {
    return [
      buildOption('A', '这周最重要的推进', '先看做成了什么'),
      buildOption('B', '这周最卡的阻碍', '先看为什么掉速'),
      buildOption('C', '下周只保留一个重点', '先减法'),
      buildOption('D', '你帮我做个收束', '把复盘落成下一步'),
    ];
  }

  if (route === 'habit-reset') {
    return [
      buildOption('A', '先恢复一个最小动作', '从低门槛开始'),
      buildOption('B', '我为什么又断掉了', '先看断点'),
      buildOption('C', '把标准降一点', '先回到可执行'),
      buildOption('D', '给我一个重启版本', '不要太复杂'),
    ];
  }

  return [
    buildOption('A', '先把问题说清楚', '先聚焦'),
    buildOption('B', '先看我卡在哪里', '先诊断'),
    buildOption('C', '先收束成一步', '先行动'),
    buildOption('D', '先从时间线上看', '先找连续性'),
  ];
}

function buildFollowupOptions(flow) {
  return fromWorkflow(flow) || fromRoute(flow);
}

module.exports = {
  buildFollowupOptions,
};
