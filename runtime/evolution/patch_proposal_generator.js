const { checkProposalAllowed } = require('./guardrails');

function generatePatchProposal(context) {
  const proposal = {
    title: context.title,
    reason: context.reason,
    targets: context.targets || [],
    changes: context.changes || [],
    mode: 'proposal_only',
  };

  const guardrail = checkProposalAllowed(proposal);
  return {
    proposal,
    guardrail,
  };
}

module.exports = {
  generatePatchProposal,
};
