const { checkProposalAllowed } = require('./guardrails');
const { createSystemReviewRequest } = require('../governance/system_review_flow');

function generatePatchProposal(context) {
  const proposal = {
    title: context.title,
    reason: context.reason,
    targets: context.targets || [],
    changes: context.changes || [],
    mode: 'proposal_only',
  };

  const guardrail = checkProposalAllowed(proposal, {
    env: context.env,
    workspaceRoot: context.workspaceRoot,
  });
  const systemReview = createSystemReviewRequest({ proposal, guardrail }, {
    requestedBy: context.requestedBy,
    frontstageAgentId: context.frontstageAgentId,
  });
  return {
    proposal,
    guardrail,
    systemReview,
  };
}

module.exports = {
  generatePatchProposal,
};
