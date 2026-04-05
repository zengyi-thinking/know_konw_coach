const { readLayerGovernance, checkGovernanceMutation } = require('../governance/layer_governance');

function fallbackBlocklist(proposal) {
  const blockedTargets = [
    'workspace/prompts/core_identity.md',
    'workspace/prompts/core_values.md',
    'workspace/prompts/core_tone.md',
    'workspace/prompts/core_boundaries.md',
    'workspace/.agents/safety-guardian.md',
  ];

  const touchesBlockedTarget = (proposal.targets || []).some((target) => blockedTargets.includes(target) || target.startsWith('workspace/knowledge/safety/'));
  return {
    allowed: !touchesBlockedTarget,
    reason: touchesBlockedTarget ? 'blocked_by_anti_drift_rules' : 'allowed',
  };
}

function checkProposalAllowed(proposal, options = {}) {
  const governance = readLayerGovernance(options.env || process.env, options.workspaceRoot);
  if (!governance) {
    return fallbackBlocklist(proposal);
  }

  const decision = checkGovernanceMutation(governance, proposal);
  if (!decision.allowed) {
    return decision;
  }

  return {
    allowed: true,
    reason: decision.reason,
    classifiedTargets: decision.classifiedTargets,
  };
}

module.exports = {
  checkProposalAllowed,
};
