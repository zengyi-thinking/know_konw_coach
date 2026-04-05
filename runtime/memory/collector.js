function collectMemoryCandidates(session) {
  const candidates = [];
  const profile = session.userProfile || {};

  if (profile.longTermGoal) {
    candidates.push({
      type: 'goal',
      content: profile.longTermGoal,
      evidence: 'user_profile.longTermGoal',
      confidence: 0.85,
    });
  }

  if (profile.preference) {
    candidates.push({
      type: 'preference',
      content: profile.preference,
      evidence: 'user_profile.preference',
      confidence: 0.8,
    });
  }

  if (profile.boundary) {
    candidates.push({
      type: 'boundary',
      content: profile.boundary,
      evidence: 'user_profile.boundary',
      confidence: 0.92,
    });
  }

  if (profile.pattern) {
    candidates.push({
      type: 'pattern',
      content: profile.pattern,
      evidence: 'user_profile.pattern',
      confidence: 0.72,
    });
  }

  return candidates;
}

module.exports = {
  collectMemoryCandidates,
};
