function mergeMemoryRecords(existingRecords, candidates) {
  const merged = [...existingRecords];
  const updates = [];
  const archives = [];

  for (const candidate of candidates) {
    const existingIndex = merged.findIndex((item) => item.type === candidate.type && item.content === candidate.content);
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        confidence: Math.max(merged[existingIndex].confidence || 0, candidate.confidence || 0),
        evidenceCount: (merged[existingIndex].evidenceCount || 1) + 1,
        lastSourceSessionId: candidate.sourceSessionId || merged[existingIndex].lastSourceSessionId || null,
        updatedAt: candidate.timestamp || merged[existingIndex].updatedAt || null,
      };
      updates.push({ action: 'update', record: merged[existingIndex] });
      continue;
    }

    const conflictingIndex = merged.findIndex((item) => item.type === candidate.type && item.content !== candidate.content && item.status !== 'archived');
    if (conflictingIndex >= 0) {
      const archived = {
        ...merged[conflictingIndex],
        status: 'archived',
        supersededBy: `memory-${candidate.type}-${merged.length + 1}`,
      };
      merged[conflictingIndex] = archived;
      archives.push(archived);
    }

    const record = {
      id: `memory-${candidate.type}-${merged.length + 1}`,
      type: candidate.type,
      content: candidate.content,
      confidence: candidate.confidence,
      status: 'active',
      evidenceCount: 1,
      sourceSessionId: candidate.sourceSessionId || null,
      lastSourceSessionId: candidate.sourceSessionId || null,
      updatedAt: candidate.timestamp || null,
      tags: candidate.tags || [],
    };
    merged.push(record);
    updates.push({ action: 'insert', record });
  }

  return { merged, updates, archives };
}

module.exports = {
  mergeMemoryRecords,
};
