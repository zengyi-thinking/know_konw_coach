function collectMemoryCandidates(session) {
  const candidates = [];
  const profile = session.userProfile || {};
  const input = session.input || {};

  if (profile.longTermGoal) {
    candidates.push({
      type: 'goal',
      content: profile.longTermGoal,
      evidence: 'user_profile.longTermGoal',
      confidence: 0.85,
      sourceSessionId: session.sessionId,
    });
  }

  if (profile.preference) {
    candidates.push({
      type: 'preference',
      content: profile.preference,
      evidence: 'user_profile.preference',
      confidence: 0.8,
      sourceSessionId: session.sessionId,
    });
  }

  if (profile.boundary) {
    candidates.push({
      type: 'boundary',
      content: profile.boundary,
      evidence: 'user_profile.boundary',
      confidence: 0.92,
      sourceSessionId: session.sessionId,
    });
  }

  if (profile.pattern) {
    candidates.push({
      type: 'pattern',
      content: profile.pattern,
      evidence: 'user_profile.pattern',
      confidence: 0.72,
      sourceSessionId: session.sessionId,
    });
  }

  if (input.feedback === '希望多一点共情' || input.feedbackSignal === 'negative_execution') {
    candidates.push({
      type: 'support_style',
      content: '在受阻阶段需要更强情绪承接和更小步推进',
      evidence: 'session.input.feedback',
      confidence: 0.82,
      sourceSessionId: session.sessionId,
    });
  }

  if (input.feedbackSignal === 'positive' && session.output?.nextAction) {
    candidates.push({
      type: 'effective_support',
      content: `行动收束有效:${session.output.nextAction}`,
      evidence: 'session.output.nextAction',
      confidence: 0.8,
      sourceSessionId: session.sessionId,
    });
  }

  return candidates;
}

module.exports = {
  collectMemoryCandidates,
};
