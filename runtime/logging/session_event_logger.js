function logSessionEvent(session) {
  return {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    modality: session.input?.modality || 'text',
    textPreview: (session.input?.text || '').slice(0, 120),
    selectedSkill: session.route?.primarySkill || null,
    safety: session.safety || null,
  };
}

module.exports = {
  logSessionEvent,
};
