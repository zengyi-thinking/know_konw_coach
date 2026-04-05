const crypto = require('crypto');

function createSystemReviewRequest(proposalResult, context = {}) {
  const guardrail = proposalResult.guardrail || {};
  if (!guardrail.systemReviewRequired) {
    return null;
  }

  return {
    id: `system_review_${crypto.randomBytes(8).toString('hex')}`,
    status: 'queued',
    requestedAt: new Date().toISOString(),
    requestedBy: context.requestedBy || 'reflection-reviewer',
    frontstageAgentId: context.frontstageAgentId || 'life-coach',
    reason: guardrail.reason || 'requires_system_review',
    layers: guardrail.systemReviewLayers || [],
    targets: proposalResult.proposal?.targets || [],
    proposalTitle: proposalResult.proposal?.title || '',
  };
}

module.exports = {
  createSystemReviewRequest,
};
