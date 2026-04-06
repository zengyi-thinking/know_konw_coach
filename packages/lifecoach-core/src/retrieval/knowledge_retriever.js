const fs = require('fs');
const path = require('path');
const { resolveWorkspaceOverlayRoots } = require('../paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function collectKnowledgeFiles(workspaceRoot, env = process.env) {
  const { knowledgeRoots } = resolveWorkspaceOverlayRoots(env, workspaceRoot);
  const resultsById = new Map();

  for (const baseDir of knowledgeRoots) {
    if (!fs.existsSync(baseDir)) continue;
    const buckets = fs.readdirSync(baseDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

    for (const bucket of buckets) {
      const bucketDir = path.join(baseDir, bucket.name);
      const jsonFiles = fs.readdirSync(bucketDir).filter((name) => name.endsWith('.json'));
      for (const jsonFile of jsonFiles) {
        const metaPath = path.join(bucketDir, jsonFile);
        const mdPath = metaPath.replace(/\.json$/, '.md');
        const metadata = readJson(metaPath);
        resultsById.set(metadata.id, {
          metadata,
          content: fs.existsSync(mdPath) ? readText(mdPath) : '',
        });
      }
    }
  }

  return Array.from(resultsById.values());
}

function scoreKnowledgeHit(item, input, options = {}) {
  const text = `${input.text || ''} ${(input.sceneTags || []).join(' ')}`.toLowerCase();
  const scenes = Array.isArray(item.metadata.scenes) ? item.metadata.scenes : [];
  const keywords = Array.isArray(item.metadata.keywords) ? item.metadata.keywords : [];
  const topics = Array.isArray(item.metadata.topics) ? item.metadata.topics : [];
  const sceneHits = scenes.filter((scene) => text.includes(String(scene).toLowerCase())).length;
  const keywordHits = keywords.filter((keyword) => text.includes(String(keyword).toLowerCase())).length;
  const hasSemanticMatch = sceneHits > 0 || keywordHits > 0;
  const supportsEmotionAnalysis = topics.some((topic) => String(topic).includes('情绪'));
  const turnType = String(input.turnType || '').toLowerCase();
  const isEarlyEmotionTurn = [
    '说不清',
    '我也不知道',
    '很难受',
    '委屈',
    '憋屈',
    '麻了',
    '没底',
    '窒息感',
    '羞耻',
    '自责',
    '寒心',
    '意难平'
  ].some((signal) => text.includes(signal)) || ['need', 'suggestion'].includes(turnType);
  let score = sceneHits * 8 + keywordHits * 10;

  if (hasSemanticMatch && item.metadata.type === 'prompt') {
    score += 4;
  }

  if (
    hasSemanticMatch &&
    supportsEmotionAnalysis &&
    (input.primarySkill === 'emotional-debrief' || input.primarySkill === 'coach-intake')
  ) {
    score += 6;
  }

  if (
    hasSemanticMatch &&
    Array.isArray(item.metadata.recommendedSkills) &&
    item.metadata.recommendedSkills.includes(input.primarySkill)
  ) {
    score += 12;
  }

  if (hasSemanticMatch && keywordHits > 0 && sceneHits === 0) {
    score += 2;
  }

  if (hasSemanticMatch && keywordHits > 1) {
    score += 2 * (keywordHits - 1);
  }

  if (hasSemanticMatch && sceneHits > 1) {
    score += sceneHits - 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-taxonomy-and-signals-001') {
    score += 4;
    if (isEarlyEmotionTurn) {
      score += 6;
    }
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-keyword-workflow-001') {
    score += 2;
    if (isEarlyEmotionTurn) {
      score += 3;
    }
  }

  if (hasSemanticMatch && item.metadata.id === 'framework-response-pyramid-001' && keywordHits === 0) {
    score -= 2;
  }

  if (hasSemanticMatch && item.metadata.type === 'framework' && isEarlyEmotionTurn && supportsEmotionAnalysis) {
    score -= 2;
  }

  if (hasSemanticMatch && item.metadata.type === 'case' && isEarlyEmotionTurn && keywordHits === 0) {
    score -= 2;
  }

  if (hasSemanticMatch && item.metadata.type === 'prompt' && turnType === 'need') {
    score += 1;
  }

  if (hasSemanticMatch && item.metadata.type !== 'prompt' && turnType === 'need' && keywordHits === 0) {
    score -= 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-keyword-workflow-001' && keywordHits === 0) {
    score -= 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-taxonomy-and-signals-001' && keywordHits === 0) {
    score -= 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-keyword-workflow-001' && keywordHits > 0) {
    score += 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-taxonomy-and-signals-001' && keywordHits > 1) {
    score += 2;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-taxonomy-and-signals-001' && sceneHits > 0 && keywordHits > 0) {
    score += 1;
  }

  if (hasSemanticMatch && item.metadata.id === 'prompt-emotion-keyword-workflow-001' && sceneHits > 0 && keywordHits > 0) {
    score += 1;
  }

  if (hasSemanticMatch && item.metadata.type === 'prompt' && isEarlyEmotionTurn && keywordHits > 0) {
    score += 1;
  }

  if (score < 0) {
    score = 0;
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
  const env = options.env || process.env;
  return collectKnowledgeFiles(workspaceRoot, env)
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
