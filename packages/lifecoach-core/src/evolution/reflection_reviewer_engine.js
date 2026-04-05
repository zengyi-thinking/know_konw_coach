function buildReviewReport(session) {
  const issues = [];
  const event = session.event || {};
  const timeline = session.timeline || {};
  const adaptivePolicy = session.adaptivePolicy || {};

  if ((session.output?.reply || '').length > 280) {
    issues.push('reply_too_long');
  }

  if (!session.output?.nextAction) {
    issues.push('missing_next_action');
  }

  if (session.safety?.riskLevel === 'high' && session.output?.coachMode === true) {
    issues.push('unsafe_coaching_continuation');
  }

  if (event.turnType === 'feedback' && !event.feedbackSignal) {
    issues.push('missing_feedback_capture');
  }

  if ((event.feedbackSignal === 'negative_execution' || event.outcomeSignal === 'failed') && timeline.phase !== 'revision') {
    issues.push('no_revision_after_failed_attempt');
  }

  if (timeline.phase === 'attempt' && !timeline.activeTimeline?.entries.some((entry) => entry.turnType === 'checkpoint')) {
    issues.push('missing_checkpoint');
  }

  if (timeline.canClose && timeline.phase !== 'closed') {
    issues.push('missing_closure_when_goal_resolved');
  }

  if (Math.abs((adaptivePolicy.rationalWeight || 0.5) - (adaptivePolicy.emotionalWeight || 0.5)) > 0.35) {
    issues.push('imbalance_rational_emotional');
  }

  return {
    issues,
    suggestions: issues.map((issue) => ({
      issue,
      suggestion: issue === 'reply_too_long'
        ? '缩短回复，优先保留承接、聚焦、下一步。'
        : issue === 'missing_next_action'
          ? '补充一个明确的最小下一步。'
          : issue === 'missing_feedback_capture'
            ? '把用户的主观体验转成结构化 feedback signal。'
            : issue === 'no_revision_after_failed_attempt'
              ? '失败尝试后补一轮修订策略，而不是重复原建议。'
              : issue === 'missing_checkpoint'
                ? '在长期推进中加入一个明确的 checkpoint。'
                : issue === 'missing_closure_when_goal_resolved'
                  ? '目标已有进展时，补上收束或关闭当前时间线。'
                  : issue === 'imbalance_rational_emotional'
                    ? '调整理性与感性的占比，避免单边过强。'
                    : '高风险场景切换到安全响应，不继续普通教练流程。',
    })),
  };
}

module.exports = {
  buildReviewReport,
};
