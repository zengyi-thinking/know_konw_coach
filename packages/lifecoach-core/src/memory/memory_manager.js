const { collectMemoryCandidates } = require('./collector');
const { scoreMemoryCandidates } = require('./scorer');
const { mergeMemoryRecords } = require('./merger');
const { buildArchiveSuggestions } = require('./archive');

function processMemory(session, existingRecords = [], options = {}) {
  const candidates = collectMemoryCandidates(session);
  const scored = scoreMemoryCandidates(candidates);
  const accepted = scored.filter((item) => item.shouldKeep);
  const timelineSummary = options.timelineSummary
    ? [{
        type: 'timeline_summary',
        content: options.timelineSummary,
        evidence: 'timeline.activeTimeline',
        confidence: 0.78,
        sourceSessionId: session.sessionId,
        tags: ['timeline'],
      }]
    : [];
  const mergeResult = mergeMemoryRecords(existingRecords, [...accepted, ...timelineSummary]);
  const archiveSuggestions = buildArchiveSuggestions(mergeResult.merged);

  return {
    candidates: scored,
    accepted,
    updates: mergeResult.updates,
    archives: mergeResult.archives,
    archiveSuggestions,
    records: mergeResult.merged,
  };
}

module.exports = {
  processMemory,
};
