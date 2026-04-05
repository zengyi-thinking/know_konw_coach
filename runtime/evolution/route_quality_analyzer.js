function analyzeRouteQuality(session) {
  const signals = [];
  const event = session.event || {};
  const timeline = session.timeline || {};
  const adaptivePolicy = session.adaptivePolicy || {};

  if (session.safety?.needsSafetyMode && session.route?.primarySkill !== 'safety') {
    signals.push({ type: 'safety_override_needed', severity: 'high' });
  }

  if ((session.knowledgeHits || []).length > 2) {
    signals.push({ type: 'knowledge_overload', severity: 'medium' });
  }

  if (!session.route?.primarySkill) {
    signals.push({ type: 'missing_route', severity: 'medium' });
  }

  if ((event.feedbackSignal === 'negative_execution' || event.outcomeSignal === 'failed') && timeline.phase !== 'revision') {
    signals.push({ type: 'unresolved_attempt_loop', severity: 'high' });
  }

  if ((event.feedbackSignal || event.outcomeSignal) && !event.timelineId) {
    signals.push({ type: 'missing_long_term_link', severity: 'medium' });
  }

  if (event.feedbackSignal === 'negative_relevance' && (adaptivePolicy.rationalWeight || 0) < 0.5) {
    signals.push({ type: 'feedback_misalignment', severity: 'medium' });
  }

  if (Math.abs((adaptivePolicy.rationalWeight || 0.5) - (adaptivePolicy.emotionalWeight || 0.5)) > 0.35) {
    signals.push({ type: 'rational_emotional_imbalance', severity: 'medium' });
  }

  if (timeline.canClose && timeline.phase !== 'closed' && timeline.activeTimeline?.status !== 'closed') {
    signals.push({ type: 'closure_overdue', severity: 'medium' });
  }

  return {
    signals,
    score: Math.max(0, 100 - signals.length * 14),
  };
}

module.exports = {
  analyzeRouteQuality,
};
