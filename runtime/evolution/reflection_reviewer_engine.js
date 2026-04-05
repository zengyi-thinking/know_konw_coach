function buildReviewReport(session) {
  const issues = [];

  if ((session.output?.reply || '').length > 280) {
    issues.push('reply_too_long');
  }

  if (!session.output?.nextAction) {
    issues.push('missing_next_action');
  }

  if (session.safety?.riskLevel === 'high' && session.output?.coachMode === true) {
    issues.push('unsafe_coaching_continuation');
  }

  return {
    issues,
    suggestions: issues.map((issue) => ({
      issue,
      suggestion: issue === 'reply_too_long'
        ? '缩短回复，优先保留承接、聚焦、下一步。'
        : issue === 'missing_next_action'
          ? '补充一个明确的最小下一步。'
          : '高风险场景切换到安全响应，不继续普通教练流程。',
    })),
  };
}

module.exports = {
  buildReviewReport,
};
