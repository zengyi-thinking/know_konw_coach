function buildDimensionRecommendation(dimensionId, context = {}) {
  const timelineOutcome = context.timelineOutcome || {};
  const route = context.route || {};

  if (dimensionId === 'emotional_attunement') {
    return {
      dimension: dimensionId,
      action: 'increase_emotional_acknowledgement',
      recommendation: '先用一句更明确的情绪承接开头，再进入结构化分析。',
      targetLayer: 'decision_engine',
    };
  }

  if (dimensionId === 'clarity_gain') {
    return {
      dimension: dimensionId,
      action: 'tighten_clarity_questions',
      recommendation: '减少泛化解释，优先追问一个最关键的判断点。',
      targetLayer: 'skill_surface',
    };
  }

  if (dimensionId === 'actionability') {
    return {
      dimension: dimensionId,
      action: 'shrink_next_action',
      recommendation: timelineOutcome.followupMode === 'revise'
        ? '把失败后的修订动作再缩小一档，优先给出低阻力动作。'
        : '把建议收束成一个当下就能执行的最小动作。',
      targetLayer: 'decision_engine',
    };
  }

  if (dimensionId === 'boundary_correctness') {
    return {
      dimension: dimensionId,
      action: 'tighten_safety_boundary',
      recommendation: '风险升高时提前收缩到安全边界，不继续普通 coaching 推进。',
      targetLayer: 'decision_engine',
    };
  }

  if (dimensionId === 'skill_fit') {
    return {
      dimension: dimensionId,
      action: 'reroute_skill_selection',
      recommendation: `重新检查当前主 skill 是否应继续使用 ${route.primarySkill || 'coach-intake'}，必要时改走更贴近当前场景的路径。`,
      targetLayer: 'decision_engine',
    };
  }

  return {
    dimension: dimensionId,
    action: 'strengthen_timeline_link',
    recommendation: '把本轮帮助更明确地挂到长期时间线，补一个后续观察点。',
    targetLayer: 'user_model_memory',
  };
}

function buildFlavorOptimizationPlan(flavorScores, context = {}) {
  if (!flavorScores) {
    return {
      status: 'no_flavor_score',
      focus: [],
    };
  }

  const focus = (flavorScores.optimizationTargets || []).map((item) => ({
    ...item,
    recommendation: buildDimensionRecommendation(item.dimension, context),
  }));

  return {
    status: focus.length > 0 ? 'needs_tuning' : 'healthy',
    focus,
  };
}

module.exports = {
  buildFlavorOptimizationPlan,
};
