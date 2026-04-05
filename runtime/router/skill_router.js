const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSkillRoutes(workspaceRoot) {
  const skillsDir = path.join(workspaceRoot, 'skills');
  const skillNames = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return skillNames.map((skillName) => ({
    skill: skillName,
    route: readJson(path.join(skillsDir, skillName, 'route.json')),
  }));
}

function countKeywordHits(text, keywords) {
  if (!text || !Array.isArray(keywords)) return 0;
  return keywords.filter((keyword) => keyword && text.includes(keyword)).length;
}

function matchesModality(inputModality, routeModalities) {
  if (!Array.isArray(routeModalities) || routeModalities.length === 0) return true;
  return routeModalities.includes(inputModality);
}

function routeSkill(input, workspaceRoot) {
  const normalizedText = [input.text || '', ...(input.sceneTags || [])].join(' ').toLowerCase();
  const routes = loadSkillRoutes(workspaceRoot);

  const scored = routes
    .filter(({ route }) => matchesModality(input.modality || 'text', route.modality))
    .map(({ skill, route }) => {
      const keywords = Array.isArray(route.keywords) ? route.keywords : [];
      const excludeKeywords = Array.isArray(route.excludeKeywords) ? route.excludeKeywords : [];
      const sceneTags = Array.isArray(route.sceneTags) ? route.sceneTags : [];
      const blocked = excludeKeywords.some((keyword) => keyword && normalizedText.includes(String(keyword).toLowerCase()));
      const keywordHits = countKeywordHits(normalizedText, keywords.map((item) => String(item).toLowerCase()));
      const sceneHits = countKeywordHits(normalizedText, sceneTags.map((item) => String(item).toLowerCase()));
      const score = blocked ? -1 : (route.priority || 0) + keywordHits * 10 + sceneHits * 8;
      return { skill, score, blocked, route, keywordHits, sceneHits };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0] || null;
  return {
    primarySkill: top ? top.skill : 'coach-intake',
    fallback: 'coach-intake',
    rankedSkills: scored.map(({ skill, score, keywordHits, sceneHits }) => ({
      skill,
      score,
      keywordHits,
      sceneHits,
    })),
  };
}

module.exports = {
  routeSkill,
  loadSkillRoutes,
};
