const crypto = require('crypto');

function normalizeText(value) {
  return String(value || '').trim();
}

function inferReadinessSignal(session = {}, timelineOutcome = {}) {
  const input = session.input || {};
  if (input.readyForAction === true) return 'ready_for_action';
  if (input.readyForAction === false) return 'not_ready';
  if (input.readinessSignal) return input.readinessSignal;
  if (timelineOutcome.readinessSignal) return timelineOutcome.readinessSignal;

  const text = normalizeText(input.text).toLowerCase();
  if (!text) {
    return 'unclear';
  }

  if (text.includes('可以了') || text.includes('明白了') || text.includes('我去试试') || text.includes('先这样') || text.includes('知道下一步')) {
    return 'ready_for_action';
  }

  if (text.includes('还不行') || text.includes('还是不懂') || text.includes('不知道怎么做') || text.includes('我还没准备好')) {
    return 'not_ready';
  }

  return 'unclear';
}

function shouldCreateToolList(session = {}, result = {}) {
  const readinessSignal = inferReadinessSignal(session, result.timelineOutcome || {});
  const nextAction = normalizeText(session.output?.nextAction);
  const phase = result.timeline?.phase || '';
  const actionPhase = ['suggestion', 'attempt', 'outcome', 'closed'].includes(phase);
  return Boolean(nextAction) && actionPhase && readinessSignal === 'ready_for_action';
}

function buildGoalSummary(session = {}, result = {}) {
  return normalizeText(
    session.userProfile?.longTermGoal
    || result.timeline?.activeTimeline?.needKey
    || session.input?.text
    || '当前阶段行动计划'
  ).slice(0, 120);
}

function buildExpectedEvidence(nextAction, result = {}) {
  if (result.timelineOutcome?.followupMode === 'close') {
    return '用户能够确认这一阶段已完成，并留下一次后续复盘点。';
  }

  if (result.route?.primarySkill === 'weekly-review') {
    return '用户能给出本周复盘结果或下周计划更新。';
  }

  if (result.route?.primarySkill === 'habit-reset') {
    return '用户能说明最小动作是否执行，以及执行阻力是否下降。';
  }

  return `用户能够反馈“${nextAction}”是否已执行、推进或遇到阻力。`;
}

function inferDifficulty(result = {}) {
  const policy = result.adaptivePolicy || {};
  if ((policy.emotionalWeight || 0) > (policy.rationalWeight || 0.5)) {
    return 'low_barrier';
  }
  return 'standard';
}

function inferReviewAfterHours(result = {}) {
  const followupMode = result.timelineOutcome?.followupMode;
  if (followupMode === 'revise') return 18;
  if (followupMode === 'close') return 48;
  return 24;
}

function inferCooldownHours(result = {}) {
  const policy = result.adaptivePolicy || {};
  return (policy.emotionalWeight || 0.45) > 0.6 ? 30 : 18;
}

function inferFollowupStyle(result = {}) {
  const policy = result.adaptivePolicy || {};
  if ((result.timelineOutcome?.followupMode || '') === 'close') {
    return 'closure_prompt';
  }
  if ((result.timelineOutcome?.followupMode || '') === 'revise') {
    return 'revision_prompt';
  }
  return (policy.emotionalWeight || 0.45) >= (policy.rationalWeight || 0.55)
    ? 'gentle_checkin'
    : 'progress_checkin';
}

function buildToolList(session = {}, result = {}) {
  if (!shouldCreateToolList(session, result)) {
    return null;
  }

  const nextAction = normalizeText(session.output?.nextAction);
  const createdAt = session.timestamp || new Date().toISOString();
  const reviewAfterHours = inferReviewAfterHours(result);
  const cooldownHours = inferCooldownHours(result);
  const timelineId = result.timeline?.activeTimeline?.id || session.input?.timelineId || `timeline-${crypto.randomUUID()}`;

  return {
    id: `tool_list_${crypto.randomUUID()}`,
    timelineId,
    skillId: result.route?.primarySkill || 'coach-intake',
    goalSummary: buildGoalSummary(session, result),
    readinessSignal: inferReadinessSignal(session, result.timelineOutcome || {}),
    createdAt,
    reviewAfter: new Date(new Date(createdAt).getTime() + reviewAfterHours * 60 * 60 * 1000).toISOString(),
    cooldownHours,
    followupStyle: inferFollowupStyle(result),
    items: [
      {
        id: `tool_item_${crypto.randomUUID()}`,
        title: nextAction,
        why: result.timelineOutcome?.followupMode === 'revise'
          ? '先把失败后的动作缩小一档，优先恢复可执行性。'
          : '把这轮教练会话收束成一个可执行动作。',
        expectedEvidence: buildExpectedEvidence(nextAction, result),
        difficulty: inferDifficulty(result),
        dueHint: reviewAfterHours <= 18 ? '今天或明天先试一次' : '在下一次复盘前完成一次尝试',
        status: 'pending',
      },
    ],
  };
}

module.exports = {
  inferReadinessSignal,
  shouldCreateToolList,
  buildToolList,
};
