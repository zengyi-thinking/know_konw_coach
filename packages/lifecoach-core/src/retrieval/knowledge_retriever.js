const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function collectKnowledgeFiles(workspaceRoot) {
  const baseDir = path.join(workspaceRoot, 'knowledge');
  const buckets = fs.readdirSync(baseDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const results = [];

  for (const bucket of buckets) {
    const bucketDir = path.join(baseDir, bucket.name);
    const jsonFiles = fs.readdirSync(bucketDir).filter((name) => name.endsWith('.json'));
    for (const jsonFile of jsonFiles) {
      const metaPath = path.join(bucketDir, jsonFile);
      const mdPath = metaPath.replace(/\.json$/, '.md');
      results.push({
        metadata: readJson(metaPath),
        content: fs.existsSync(mdPath) ? readText(mdPath) : '',
      });
    }
  }

  return results;
}

function scoreKnowledgeHit(item, input, options = {}) {
  const text = `${input.text || ''} ${(input.sceneTags || []).join(' ')}`.toLowerCase();
  const scenes = Array.isArray(item.metadata.scenes) ? item.metadata.scenes : [];
  const keywords = Array.isArray(item.metadata.keywords) ? item.metadata.keywords : [];
  const sceneHits = scenes.filter((scene) => text.includes(String(scene).toLowerCase())).length;
  const keywordHits = keywords.filter((keyword) => text.includes(String(keyword).toLowerCase())).length;
  const hasSemanticMatch = sceneHits > 0 || keywordHits > 0;
  let score = sceneHits * 8 + keywordHits * 10;

  if (
    hasSemanticMatch &&
    Array.isArray(item.metadata.recommendedSkills) &&
    item.metadata.recommendedSkills.includes(input.primarySkill)
  ) {
    score += 12;
  }

  const workflowState = options.workflowState || null;
  const workflowPriorityIds = Array.isArray(workflowState?.priorityKnowledgeIds) ? workflowState.priorityKnowledgeIds : [];
  const workflowPriorityIndex = workflowPriorityIds.indexOf(item.metadata.id);
  if (workflowState && Array.isArray(workflowState.priorityKnowledgeIds) && workflowState.priorityKnowledgeIds.includes(item.metadata.id)) {
    score += 28 + Math.max(0, workflowPriorityIds.length - workflowPriorityIndex);
  }

  if (workflowState && workflowState.id === 'long-horizon-confusion' && item.metadata.type === 'case' && hasSemanticMatch) {
    score += 10;
  }

  return {
    score,
    workflowPriorityIndex: workflowPriorityIndex >= 0 ? workflowPriorityIndex : 999,
  };
}

function retrieveKnowledge(input, workspaceRoot, limit = 2, options = {}) {
  return collectKnowledgeFiles(workspaceRoot)
    .map((item) => {
      const measured = scoreKnowledgeHit(item, input, options);
      return { ...item, score: measured.score, workflowPriorityIndex: measured.workflowPriorityIndex };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.workflowPriorityIndex !== b.workflowPriorityIndex) return a.workflowPriorityIndex - b.workflowPriorityIndex;
      return a.metadata.id.localeCompare(b.metadata.id);
    })
    .slice(0, limit)
    .map((item) => ({
      id: item.metadata.id,
      title: item.metadata.title,
      score: item.score,
      summary: item.metadata.summary,
      content: item.content,
    }));
}

module.exports = {
  retrieveKnowledge,
};
