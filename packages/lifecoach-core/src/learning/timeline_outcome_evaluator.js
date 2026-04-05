function evaluateTimelineOutcome(context, config) {
  const event = context.event || {};
  const timeline = context.timeline || {};
  const output = context.session?.output || {};
  const map = config.timelineOutcomes || {};
  let chosen = map.default || {
    status: 'active',
    practiceSignal: 'neutral',
    followupMode: 'clarify',
  };
  const evidence = [];

  if (timeline.phase === 'closed' || timeline.activeTimeline?.status === 'closed') {
    chosen = map.closed || chosen;
    evidence.push('timeline_closed');
  } else if (event.outcomeSignal === 'progress') {
    chosen = map.progress || chosen;
    evidence.push('outcome_progress');
  } else if (event.outcomeSignal === 'failed' || event.feedbackSignal === 'negative_execution') {
    chosen = map.failed || chosen;
    evidence.push('outcome_failed_or_negative_execution');
  } else {
    evidence.push('default_active_timeline');
  }

  if (output.nextAction) {
    evidence.push('next_action_available');
  }

  if (timeline.canClose) {
    evidence.push('timeline_can_close');
  }

  return {
    status: chosen.status,
    practiceSignal: chosen.practiceSignal,
    followupMode: timeline.canClose && chosen.followupMode === 'continue' ? 'close' : chosen.followupMode,
    continuityLinked: Boolean(event.timelineId || timeline.activeTimeline?.id),
    actionReady: Boolean(output.nextAction),
    evidence,
  };
}

module.exports = {
  evaluateTimelineOutcome,
};
