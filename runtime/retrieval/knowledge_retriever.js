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

function scoreKnowledgeHit(item, input) {
  const text = `${input.text || ''} ${(input.sceneTags || []).join(' ')}`.toLowerCase();
  let score = 0;

  if (Array.isArray(item.metadata.recommendedSkills) && item.metadata.recommendedSkills.includes(input.primarySkill)) {
    score += 30;
  }

  const scenes = Array.isArray(item.metadata.scenes) ? item.metadata.scenes : [];
  score += scenes.filter((scene) => text.includes(String(scene).toLowerCase())).length * 8;

  const keywords = Array.isArray(item.metadata.keywords) ? item.metadata.keywords : [];
  score += keywords.filter((keyword) => text.includes(String(keyword).toLowerCase())).length * 10;

  return score;
}

function retrieveKnowledge(input, workspaceRoot, limit = 2) {
  return collectKnowledgeFiles(workspaceRoot)
    .map((item) => ({ ...item, score: scoreKnowledgeHit(item, input) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
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
