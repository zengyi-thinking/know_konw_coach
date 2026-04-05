const { collectMemoryCandidates } = require('./collector');
const { scoreMemoryCandidates } = require('./scorer');
const { mergeMemoryRecords } = require('./merger');
const { buildArchiveSuggestions } = require('./archive');

function processMemory(session, existingRecords = []) {
  const candidates = collectMemoryCandidates(session);
  const scored = scoreMemoryCandidates(candidates);
  const accepted = scored.filter((item) => item.shouldKeep);
  const mergeResult = mergeMemoryRecords(existingRecords, accepted);
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
