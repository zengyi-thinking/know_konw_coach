const fs = require('fs');
const path = require('path');
const { resolveWorkspaceOverlayRoots } = require('../paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listSkillNames(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function loadSkillRoutes(workspaceRoot, env = process.env) {
  const { skillsRoots } = resolveWorkspaceOverlayRoots(env, workspaceRoot);
  const routesBySkill = new Map();

  for (const skillsDir of skillsRoots) {
    for (const skillName of listSkillNames(skillsDir)) {
      const routePath = path.join(skillsDir, skillName, 'route.json');
      if (!fs.existsSync(routePath)) continue;
      routesBySkill.set(skillName, {
        skill: skillName,
        route: readJson(routePath),
      });
    }
  }

  return Array.from(routesBySkill.values());
}

function countKeywordHits(text, keywords) {
  if (!text || !Array.isArray(keywords)) return 0;
  return keywords.filter((keyword) => keyword && text.includes(keyword)).length;
}

function matchesModality(inputModality, routeModalities) {
  if (!Array.isArray(routeModalities) || routeModalities.length === 0) return true;
  return routeModalities.includes(inputModality);
}

function routeSkill(input, workspaceRoot, env = process.env) {
  const normalizedText = [input.text || '', ...(input.sceneTags || [])].join(' ').toLowerCase();
  const routes = loadSkillRoutes(workspaceRoot, env);

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
