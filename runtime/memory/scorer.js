function scoreMemoryCandidates(candidates) {
  return candidates.map((candidate) => ({
    ...candidate,
    score: Math.round((candidate.confidence || 0) * 100),
    shouldKeep: (candidate.confidence || 0) >= 0.75,
  }));
}

module.exports = {
  scoreMemoryCandidates,
};
