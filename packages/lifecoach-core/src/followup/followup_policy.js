function addHours(isoString, hours) {
  const base = isoString ? new Date(isoString) : new Date();
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildInitialFollowupRecord(toolList, result = {}, timestamp) {
  return {
    timelineId: toolList.timelineId,
    status: 'active',
    lastCheckedAt: null,
    lastPromptAt: null,
    promptCount: 0,
    cooldownUntil: null,
    silenceIfProgressWithinDays: 3,
    maxPromptsPerTimeline: 3,
    followupStyle: toolList.followupStyle,
    reviewAfter: toolList.reviewAfter,
    timelineOutcome: result.timelineOutcome || null,
    updatedAt: timestamp || new Date().toISOString(),
  };
}

function isCoolingDown(record = {}, now) {
  if (!record.cooldownUntil) return false;
  return new Date(record.cooldownUntil).getTime() > new Date(now).getTime();
}

function nextCooldown(now, toolList, adaptivePolicy = {}) {
  const extra = (adaptivePolicy.emotionalWeight || 0.45) > 0.6 ? 6 : 0;
  return addHours(now, (toolList.cooldownHours || 18) + extra);
}

module.exports = {
  buildInitialFollowupRecord,
  isCoolingDown,
  nextCooldown,
};
