const fs = require('fs');
const path = require('path');
const { resolveStateDirectories } = require('../paths');
const { buildFollowupPrompt } = require('./followup_prompt_builder');
const { isCoolingDown, nextCooldown } = require('./followup_policy');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveTimelineFollowupFiles(state, timelineId) {
  const safeTimelineId = String(timelineId || '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  return {
    toolListPath: path.join(state.toolListsDir, `${safeTimelineId}.tool-list.json`),
    followupPath: path.join(state.followupsDir, `${safeTimelineId}.followup.json`),
  };
}

function inferFollowupStatus(toolList, result = {}, record = {}, now) {
  const items = toolList.items || [];
  const doneCount = items.filter((item) => item.status === 'done').length;
  const pendingCount = items.filter((item) => item.status === 'pending' || item.status === 'in_progress').length;
  const latestOutcome = result.timelineOutcome || record.timelineOutcome || {};

  if (latestOutcome.status === 'closed' || result.timeline?.activeTimeline?.status === 'closed') {
    return 'none';
  }

  if (doneCount > 0 && pendingCount === 0) {
    return 'none';
  }

  if (isCoolingDown(record, now)) {
    return 'none';
  }

  if (record.promptCount >= (record.maxPromptsPerTimeline || 3)) {
    return 'none';
  }

  if (latestOutcome.followupMode === 'close') {
    return 'closure_prompt';
  }

  if (latestOutcome.followupMode === 'revise') {
    return 'revision_prompt';
  }

  if (toolList.reviewAfter && new Date(toolList.reviewAfter).getTime() <= new Date(now).getTime()) {
    return 'gentle_checkin';
  }

  return 'none';
}

function checkFollowups(options = {}) {
  const env = options.env || process.env;
  const now = options.now || new Date().toISOString();
  const state = resolveStateDirectories(env);
  const timelineId = options.timelineId;
  const files = resolveTimelineFollowupFiles(state, timelineId);
  const toolListPayload = readJsonIfExists(files.toolListPath);
  const recordPayload = readJsonIfExists(files.followupPath);

  if (!toolListPayload || !recordPayload) {
    return {
      status: 'none',
      shouldPrompt: false,
      reason: 'missing_followup_assets',
    };
  }

  const toolList = toolListPayload.toolList || toolListPayload;
  const record = recordPayload.followup || recordPayload;
  const status = inferFollowupStatus(toolList, options.result || {}, record, now);

  if (status === 'none') {
    return {
      status,
      shouldPrompt: false,
      reason: 'no_followup_needed',
      toolList,
      record,
    };
  }

  const updatedRecord = {
    ...record,
    status,
    lastCheckedAt: now,
    lastPromptAt: now,
    promptCount: (record.promptCount || 0) + 1,
    cooldownUntil: nextCooldown(now, toolList, options.result?.adaptivePolicy || {}),
  };

  fs.writeFileSync(files.followupPath, `${JSON.stringify(updatedRecord, null, 2)}\n`, 'utf8');

  return {
    status,
    shouldPrompt: true,
    prompt: buildFollowupPrompt({
      toolList,
      record: updatedRecord,
      adaptivePolicy: options.result?.adaptivePolicy || {},
    }),
    toolList,
    record: updatedRecord,
  };
}

module.exports = {
  checkFollowups,
};
