function normalizeFeedbackSignal(input = {}) {
  if (input.feedbackSignal) {
    return input.feedbackSignal;
  }

  const text = `${input.feedback || ''} ${input.text || ''}`.toLowerCase();
  if (!text) return null;
  if (text.includes('执行不了') || text.includes('做不到') || text.includes('压力') || text.includes('太难')) {
    return 'negative_execution';
  }
  if (text.includes('没帮助') || text.includes('没用') || text.includes('太空') || text.includes('空泛')) {
    return 'negative_relevance';
  }
  if (text.includes('有帮助') || text.includes('有效') || text.includes('清晰') || text.includes('好多了')) {
    return 'positive';
  }
  return null;
}

function normalizeOutcomeSignal(input = {}) {
  if (input.outcomeSignal) {
    return input.outcomeSignal;
  }

  const text = `${input.outcome || ''} ${input.result || ''} ${input.text || ''}`.toLowerCase();
  if (!text) return null;
  if (text.includes('失败') || text.includes('没做到') || text.includes('卡住') || text.includes('放弃')) {
    return 'failed';
  }
  if (text.includes('完成') || text.includes('做到了') || text.includes('推进') || text.includes('成功')) {
    return 'progress';
  }
  return null;
}

function normalizeReadinessSignal(input = {}) {
  if (input.readyForAction === true) return 'ready_for_action';
  if (input.readyForAction === false) return 'not_ready';
  if (input.readinessSignal) return input.readinessSignal;

  const text = `${input.text || ''}`.toLowerCase();
  if (!text) return null;
  if (text.includes('可以了') || text.includes('明白了') || text.includes('我去试试') || text.includes('先这样') || text.includes('知道下一步')) {
    return 'ready_for_action';
  }
  if (text.includes('还不行') || text.includes('还是不懂') || text.includes('不知道怎么做') || text.includes('没准备好')) {
    return 'not_ready';
  }
  return null;
}

function inferTurnType(session = {}) {
  const input = session.input || {};
  const output = session.output || {};
  if (input.turnType) return input.turnType;
  if (input.closeTimeline || output.isClosure) return 'closure';
  if (input.checkpoint) return 'checkpoint';
  if (input.feedback || normalizeFeedbackSignal(input)) return 'feedback';
  if (input.outcome || input.result || normalizeOutcomeSignal(input)) return 'outcome';
  if (input.attempt || input.attemptStatus) return 'attempt';
  if (input.revisionOf) return 'revision';
  if (output.nextAction) return 'suggestion';
  return 'need';
}

function logSessionEvent(session) {
  const input = session.input || {};
  const predictionSnapshot = input.prediction || null;
  const feedbackSignal = normalizeFeedbackSignal(input);
  const outcomeSignal = normalizeOutcomeSignal(input);
  const readinessSignal = normalizeReadinessSignal(input);
  const turnType = inferTurnType(session);

  return {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    modality: input.modality || 'text',
    textPreview: (input.text || '').slice(0, 120),
    selectedSkill: session.route?.primarySkill || null,
    safety: session.safety || null,
    turnType,
    attemptId: input.attemptId || null,
    timelineId: session.timeline?.activeTimeline?.id || input.timelineId || null,
    feedbackSignal,
    outcomeSignal,
    readinessSignal,
    predictionSnapshot,
    policySnapshot: session.adaptivePolicy || null,
  };
}

module.exports = {
  logSessionEvent,
  normalizeReadinessSignal,
};
