function buildArchiveSuggestions(records) {
  return records
    .filter((record) => record.status === 'archived')
    .map((record) => ({
      id: record.id,
      reason: 'conflicting_newer_memory',
    }));
}

module.exports = {
  buildArchiveSuggestions,
};
