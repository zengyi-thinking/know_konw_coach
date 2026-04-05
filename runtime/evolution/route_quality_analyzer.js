function analyzeRouteQuality(session) {
  const signals = [];

  if (session.safety?.needsSafetyMode && session.route?.primarySkill !== 'safety') {
    signals.push({ type: 'safety_override_needed', severity: 'high' });
  }

  if ((session.knowledgeHits || []).length > 2) {
    signals.push({ type: 'knowledge_overload', severity: 'medium' });
  }

  if (!session.route?.primarySkill) {
    signals.push({ type: 'missing_route', severity: 'medium' });
  }

  return {
    signals,
    score: Math.max(0, 100 - signals.length * 20),
  };
}

module.exports = {
  analyzeRouteQuality,
};
