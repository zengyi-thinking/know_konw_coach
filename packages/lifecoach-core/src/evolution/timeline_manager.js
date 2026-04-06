function buildEntry(event, session = {}) {
  return {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    turnType: event.turnType || 'need',
    textPreview: event.textPreview || '',
    selectedSkill: event.selectedSkill || null,
    feedbackSignal: event.feedbackSignal || null,
    outcomeSignal: event.outcomeSignal || null,
    readinessSignal: event.readinessSignal || null,
    nextAction: session.output?.nextAction || null,
    attemptStatus: session.input?.attemptStatus || null,
    checkpoint: session.input?.checkpoint || null,
    isClosure: Boolean(session.input?.closeTimeline || session.output?.isClosure),
  };
}

function inferPhase(entries = []) {
  const types = entries.map((entry) => entry.turnType);
  if (types.includes('closure')) return 'closed';
  if (types.includes('revision')) return 'revision';
  if (types.includes('feedback')) return 'feedback';
  if (types.includes('outcome')) return 'outcome';
  if (types.includes('attempt')) return 'attempt';
  if (types.includes('suggestion')) return 'suggestion';
  return 'need';
}

function inferNeedKey(session = {}) {
  const explicit = session.input?.timelineKey || session.input?.goalKey || session.userProfile?.longTermGoal;
  if (explicit) return String(explicit).trim();
  return (session.input?.text || '').slice(0, 40).trim();
}

function buildTimeline(session, existingTimelines = [], event, memory = {}) {
  const timelines = Array.isArray(existingTimelines)
    ? existingTimelines.map((item) => ({ ...item, entries: [...(item.entries || [])] }))
    : [];

  const needKey = inferNeedKey(session);
  const requestedTimelineId = session.input?.timelineId || event.timelineId;
  let activeIndex = timelines.findIndex((item) => item.id === requestedTimelineId);

  if (activeIndex < 0 && needKey) {
    activeIndex = timelines.findIndex((item) => item.needKey === needKey && item.status !== 'closed');
  }

  if (activeIndex < 0) {
    const timeline = {
      id: requestedTimelineId || `timeline-${timelines.length + 1}`,
      needKey,
      status: 'active',
      phase: 'need',
      entries: [],
      memoryRefs: (memory.records || []).map((record) => record.id),
      startedAt: session.timestamp,
      updatedAt: session.timestamp,
      canClose: false,
    };
    timelines.push(timeline);
    activeIndex = timelines.length - 1;
  }

  const activeTimeline = timelines[activeIndex];
  activeTimeline.entries.push(buildEntry(event, session));
  activeTimeline.phase = inferPhase(activeTimeline.entries);
  activeTimeline.updatedAt = session.timestamp;
  activeTimeline.memoryRefs = Array.from(new Set([...(activeTimeline.memoryRefs || []), ...((memory.records || []).map((record) => record.id))]));
  activeTimeline.canClose = activeTimeline.entries.some((entry) => entry.turnType === 'outcome' && entry.outcomeSignal === 'progress')
    || activeTimeline.entries.some((entry) => entry.turnType === 'closure');

  if (activeTimeline.entries.some((entry) => entry.turnType === 'closure' || entry.isClosure)) {
    activeTimeline.status = 'closed';
    activeTimeline.phase = 'closed';
    activeTimeline.closedAt = session.timestamp;
    activeTimeline.canClose = true;
  }

  return {
    activeTimeline,
    timelines,
    phase: activeTimeline.phase,
    canClose: activeTimeline.canClose,
  };
}

module.exports = {
  buildTimeline,
};
