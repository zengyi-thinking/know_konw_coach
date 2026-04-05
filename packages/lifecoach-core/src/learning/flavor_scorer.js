const fs = require('fs');
const path = require('path');
const { resolveWorkspaceRoot } = require('../paths');

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readFlavorMetrics(env = process.env, workspaceOverride) {
  const workspaceRoot = resolveWorkspaceRoot(env, workspaceOverride);
  const filePath = path.join(workspaceRoot, '.lifecoach', 'flavor-metrics.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hasIssue(review, issue) {
  return Array.isArray(review?.issues) && review.issues.includes(issue);
}

function hasSignal(routeQuality, signalType) {
  return Array.isArray(routeQuality?.signals) && routeQuality.signals.some((item) => item.type === signalType);
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function scoreEmotionalAttunement(context) {
  const inputText = String(context.session?.input?.text || '').toLowerCase();
  const adaptivePolicy = context.adaptivePolicy || {};
  const safety = context.safety || {};
  const review = context.review || {};
  let score = 72;
  const reasons = [];

  if ((adaptivePolicy.emotionalWeight || 0) >= (adaptivePolicy.rationalWeight || 0)) {
    score += 8;
    reasons.push('emotional_weight_not_lower_than_rational');
  }

  if ((adaptivePolicy.prediction?.emotionalNeed || 0) > 0.7) {
    score += 6;
    reasons.push('predicted_high_emotional_need_recognized');
  }

  if (containsAny(inputText, ['难受', '焦虑', '压力', '很乱'])) {
    score += 4;
    reasons.push('emotionally_loaded_input_detected');
  }

  if (safety.riskLevel === 'medium') {
    score += 3;
    reasons.push('medium_risk_tightened');
  }

  if (hasIssue(review, 'reply_too_long')) {
    score -= 6;
    reasons.push('reply_too_long');
  }

  if (hasIssue(review, 'unsafe_coaching_continuation')) {
    score -= 50;
    reasons.push('unsafe_coaching_continuation');
  }

  return { score: clampScore(score), reasons };
}

function scoreClarityGain(context) {
  const inputText = String(context.session?.input?.text || '').toLowerCase();
  const route = context.route || {};
  const knowledgeHits = context.knowledgeHits || [];
  const review = context.review || {};
  const routeQuality = context.routeQuality || {};
  let score = 66;
  const reasons = [];

  if (['goal-clarify', 'weekly-review', 'coach-intake'].includes(route.primarySkill)) {
    score += 10;
    reasons.push('clarity_oriented_skill');
  }

  if (knowledgeHits.length > 0 && knowledgeHits.length <= 2) {
    score += 6;
    reasons.push('focused_knowledge_support');
  }

  if (containsAny(inputText, ['不知道', '很乱', '理清', '方向很多'])) {
    score += 8;
    reasons.push('high_clarity_need_detected');
  }

  if (hasIssue(review, 'missing_next_action')) {
    score -= 18;
    reasons.push('missing_next_action');
  }

  if (hasSignal(routeQuality, 'knowledge_overload')) {
    score -= 10;
    reasons.push('knowledge_overload');
  }

  return { score: clampScore(score), reasons };
}

function scoreActionability(context) {
  const output = context.session?.output || {};
  const route = context.route || {};
  const review = context.review || {};
  const event = context.event || {};
  let score = 58;
  const reasons = [];

  if (output.nextAction) {
    score += 28;
    reasons.push('next_action_present');
  }

  if (['goal-clarify', 'habit-reset', 'weekly-review'].includes(route.primarySkill)) {
    score += 6;
    reasons.push('action_oriented_skill');
  }

  if (event.outcomeSignal === 'progress') {
    score += 8;
    reasons.push('progress_signal_present');
  }

  if (hasIssue(review, 'missing_next_action')) {
    score -= 28;
    reasons.push('missing_next_action');
  }

  if (hasIssue(review, 'no_revision_after_failed_attempt')) {
    score -= 10;
    reasons.push('no_revision_after_failed_attempt');
  }

  return { score: clampScore(score), reasons };
}

function scoreBoundaryCorrectness(context) {
  const safety = context.safety || {};
  const route = context.route || {};
  const review = context.review || {};
  let score = 84;
  const reasons = [];

  if (safety.riskLevel === 'high' && route.primarySkill === 'safety') {
    score += 8;
    reasons.push('high_risk_correctly_diverted');
  }

  if (safety.riskLevel === 'low') {
    score += 4;
    reasons.push('normal_coaching_boundary_ok');
  }

  if (hasIssue(review, 'unsafe_coaching_continuation')) {
    score -= 60;
    reasons.push('unsafe_coaching_continuation');
  }

  return { score: clampScore(score), reasons };
}

function scoreSkillFit(context) {
  const route = context.route || {};
  const routeQuality = context.routeQuality || {};
  let score = Math.max(40, Math.round((routeQuality.score || 60) * 0.9));
  const reasons = [];

  if (route.primarySkill) {
    score += 5;
    reasons.push('skill_selected');
  }

  if (hasSignal(routeQuality, 'feedback_misalignment')) {
    score -= 15;
    reasons.push('feedback_misalignment');
  }

  if (hasSignal(routeQuality, 'missing_route')) {
    score -= 25;
    reasons.push('missing_route');
  }

  if (hasSignal(routeQuality, 'unresolved_attempt_loop')) {
    score -= 16;
    reasons.push('unresolved_attempt_loop');
  }

  return { score: clampScore(score), reasons };
}

function scoreContinuityStrength(context) {
  const timeline = context.timeline || {};
  const event = context.event || {};
  const memory = context.memory || {};
  const routeQuality = context.routeQuality || {};
  let score = 60;
  const reasons = [];

  if (timeline.activeTimeline?.id) {
    score += 12;
    reasons.push('timeline_active');
  }

  if (event.timelineId) {
    score += 8;
    reasons.push('event_linked_to_timeline');
  }

  if ((memory.records || []).length > 0) {
    score += 6;
    reasons.push('memory_context_present');
  }

  if (timeline.phase === 'feedback' || timeline.phase === 'revision' || timeline.phase === 'outcome' || timeline.phase === 'closed') {
    score += 10;
    reasons.push('timeline_progression_detected');
  }

  if (hasSignal(routeQuality, 'missing_long_term_link')) {
    score -= 20;
    reasons.push('missing_long_term_link');
  }

  return { score: clampScore(score), reasons };
}

function resolveBand(score, config) {
  return (config.bands || []).find((band) => score >= band.min && score <= band.max) || null;
}

function buildOptimizationTargets(dimensions, config) {
  const threshold = config.optimizationPolicy?.focusThreshold ?? 68;
  const maxTargets = config.optimizationPolicy?.maxOptimizationTargets ?? 3;
  return Object.values(dimensions)
    .filter((item) => item.score < threshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxTargets)
    .map((item) => ({
      dimension: item.id,
      score: item.score,
      reasons: item.reasons,
    }));
}

function computeFlavorScores(context, config) {
  const dimensionMap = {
    emotional_attunement: scoreEmotionalAttunement(context),
    clarity_gain: scoreClarityGain(context),
    actionability: scoreActionability(context),
    boundary_correctness: scoreBoundaryCorrectness(context),
    skill_fit: scoreSkillFit(context),
    continuity_strength: scoreContinuityStrength(context),
  };

  const dimensions = {};
  let overall = 0;
  for (const dimension of config.dimensions || []) {
    const measured = dimensionMap[dimension.id] || { score: 60, reasons: ['default_dimension_score'] };
    const entry = {
      id: dimension.id,
      description: dimension.description,
      weight: dimension.weight,
      score: measured.score,
      reasons: measured.reasons,
    };
    dimensions[dimension.id] = entry;
    overall += measured.score * dimension.weight;
  }

  const clampedOverall = clampScore(overall);
  const band = resolveBand(clampedOverall, config);
  return {
    overall: clampedOverall,
    band: band ? band.id : 'warming_up',
    bandDescription: band ? band.description : '',
    dimensions,
    optimizationTargets: buildOptimizationTargets(dimensions, config),
  };
}

module.exports = {
  readFlavorMetrics,
  computeFlavorScores,
};
