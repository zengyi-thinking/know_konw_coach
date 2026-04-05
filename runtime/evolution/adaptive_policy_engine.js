function clamp(value) {
  return Math.max(0.2, Math.min(0.8, value));
}

function buildPrediction(session = {}, timeline = {}) {
  const input = session.input || {};
  if (input.prediction) {
    return input.prediction;
  }

  const text = (input.text || '').toLowerCase();
  const prediction = {
    expectedSuccessRate: text.includes('不知道') || text.includes('很乱') ? 0.42 : 0.62,
    emotionalNeed: text.includes('难受') || text.includes('焦虑') || text.includes('压力') ? 0.78 : 0.45,
    closureDifficulty: timeline.phase === 'revision' || timeline.phase === 'feedback' ? 0.72 : 0.4,
  };

  return prediction;
}

function computeAdaptivePolicy(context = {}) {
  const session = context.session || {};
  const timeline = context.timeline || {};
  const event = context.event || {};
  const prediction = buildPrediction(session, timeline);
  const reasonCodes = [];

  let rationalWeight = 0.55;
  let emotionalWeight = 0.45;
  let shortTermFocus = 0.5;
  let longTermFocus = 0.5;

  if (event.feedbackSignal === 'negative_execution') {
    emotionalWeight += 0.18;
    rationalWeight -= 0.12;
    shortTermFocus += 0.15;
    reasonCodes.push('feedback_negative_execution');
  }

  if (event.feedbackSignal === 'negative_relevance') {
    rationalWeight += 0.08;
    emotionalWeight -= 0.04;
    reasonCodes.push('feedback_negative_relevance');
  }

  if (event.feedbackSignal === 'positive') {
    rationalWeight += 0.06;
    longTermFocus += 0.08;
    reasonCodes.push('feedback_positive');
  }

  if (event.outcomeSignal === 'failed') {
    emotionalWeight += 0.12;
    shortTermFocus += 0.12;
    longTermFocus -= 0.08;
    reasonCodes.push('outcome_failed');
  }

  if (event.outcomeSignal === 'progress') {
    rationalWeight += 0.1;
    longTermFocus += 0.14;
    reasonCodes.push('outcome_progress');
  }

  if (timeline.phase === 'need') {
    emotionalWeight += 0.08;
    reasonCodes.push('phase_need');
  }

  if (timeline.phase === 'revision') {
    rationalWeight += 0.06;
    emotionalWeight += 0.04;
    reasonCodes.push('phase_revision');
  }

  if (timeline.canClose) {
    rationalWeight += 0.08;
    longTermFocus += 0.12;
    reasonCodes.push('timeline_ready_to_close');
  }

  if ((prediction.emotionalNeed || 0) > 0.7) {
    emotionalWeight += 0.1;
    reasonCodes.push('prediction_high_emotional_need');
  }

  if ((prediction.expectedSuccessRate || 0) > 0.65) {
    rationalWeight += 0.06;
    reasonCodes.push('prediction_high_success_rate');
  }

  if ((prediction.closureDifficulty || 0) > 0.65) {
    shortTermFocus += 0.08;
    reasonCodes.push('prediction_high_closure_difficulty');
  }

  rationalWeight = clamp(rationalWeight);
  emotionalWeight = clamp(emotionalWeight);
  shortTermFocus = clamp(shortTermFocus);
  longTermFocus = clamp(longTermFocus);

  return {
    rationalWeight,
    emotionalWeight,
    shortTermFocus,
    longTermFocus,
    prediction,
    reasonCodes,
  };
}

module.exports = {
  computeAdaptivePolicy,
};
