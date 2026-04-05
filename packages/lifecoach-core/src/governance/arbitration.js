function isAgentActive(agentId, context = {}) {
  const safety = context.safety || {};
  const review = context.review || {};
  const routeQuality = context.routeQuality || {};
  const memory = context.memory || {};

  if (agentId === 'safety-guardian') {
    return safety.needsSafetyMode || safety.riskLevel === 'medium' || safety.riskLevel === 'high';
  }

  if (agentId === 'persona-guardian') {
    return true;
  }

  if (agentId === 'memory-curator') {
    return (memory.accepted || []).length > 0 || (memory.records || []).length > 0;
  }

  if (agentId === 'reflection-reviewer') {
    return (review.issues || []).length > 0 || (routeQuality.signals || []).length > 0;
  }

  if (agentId === 'life-coach') {
    return true;
  }

  return false;
}

function buildDirective(agentId, context = {}) {
  const safety = context.safety || {};
  const route = context.route || {};

  if (agentId === 'safety-guardian') {
    return {
      agentId,
      effect: safety.needsSafetyMode ? 'constrain_frontstage_output' : 'tighten_boundaries',
      note: safety.needsSafetyMode
        ? '高风险时由 safety-guardian 收紧路径，但前台仍由 life-coach 表达。'
        : '风险升高时先收紧表达强度和推进力度。',
    };
  }

  if (agentId === 'persona-guardian') {
    return {
      agentId,
      effect: 'preserve_single_frontstage_identity',
      note: '后台多 agent 只做治理，前台始终保持单一 life-coach 身份。',
    };
  }

  if (agentId === 'memory-curator') {
    return {
      agentId,
      effect: 'inject_structured_memory',
      note: '只引入干净、结构化、与当前问题相关的长期记忆。',
    };
  }

  if (agentId === 'reflection-reviewer') {
    return {
      agentId,
      effect: 'record_review_and_proposal_signals',
      note: '将效果信号沉淀为 review 与 proposal，而不是前台改人格。',
    };
  }

  return {
    agentId: 'life-coach',
    effect: 'compose_frontstage_response',
    note: `由 life-coach 统一组织最终输出，当前主 skill 为 ${route.primarySkill || 'coach-intake'}。`,
  };
}

function buildBackstageArbitration(governance, context = {}, workspaceManifest = {}) {
  const agentOrder = governance?.arbitration?.agentOrder || ['safety-guardian', 'persona-guardian', 'memory-curator', 'reflection-reviewer', 'life-coach'];
  const activeAgents = agentOrder.filter((agentId) => isAgentActive(agentId, context));
  const directives = activeAgents.map((agentId) => buildDirective(agentId, context));
  const safetyDirective = directives.find((item) => item.agentId === 'safety-guardian') || null;

  return {
    frontstageAgentId: workspaceManifest.frontstageAgentId || 'life-coach',
    singleFrontstageIdentity: true,
    activeBackstageAgents: activeAgents.filter((agentId) => agentId !== (workspaceManifest.frontstageAgentId || 'life-coach')),
    directives,
    gatingAgent: safetyDirective ? 'safety-guardian' : null,
    frontstageMode: safetyDirective ? 'constrained_lifecoach' : 'standard_lifecoach',
  };
}

module.exports = {
  buildBackstageArbitration,
};
