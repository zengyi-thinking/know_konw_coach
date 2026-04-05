function checkProposalAllowed(proposal) {
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

module.exports = {
  checkProposalAllowed,
};
