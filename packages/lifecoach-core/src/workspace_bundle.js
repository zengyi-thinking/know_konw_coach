const fs = require('fs');
const path = require('path');
const { resolveWorkspaceRoot, resolveWorkspaceManifestPath } = require('./paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

function inferWorkspaceManifest(workspaceRoot) {
  const agentsDir = path.join(workspaceRoot, '.agents');
  const skillsDir = path.join(workspaceRoot, 'skills');
  const knowledgeRoot = path.join(workspaceRoot, 'knowledge');

  return {
    bundleId: 'openclaw-lifecoach',
    version: 1,
    generated: true,
    agents: listMarkdownFiles(agentsDir).map((id) => ({
      id,
      path: `.agents/${id}.md`,
    })),
    skills: listDirectories(skillsDir).map((id) => ({
      id,
      path: `skills/${id}`,
      routePath: `skills/${id}/route.json`,
      schemaPath: `skills/${id}/response_schema.json`,
    })),
    knowledgeBuckets: listDirectories(knowledgeRoot).map((id) => ({
      id,
      path: `knowledge/${id}`,
    })),
    protectedTargets: [
      'prompts/core_identity.md',
      'prompts/core_values.md',
      'prompts/core_tone.md',
      'prompts/core_boundaries.md',
      '.agents/safety-guardian.md',
      'knowledge/safety',
    ],
    dynamicStateLinks: {
      events: 'state/lifecoach/events',
      timeline: 'state/lifecoach/timeline',
      reviews: 'state/lifecoach/reviews',
      memoryCache: 'state/lifecoach/memory-cache',
      proposals: 'state/lifecoach/proposals',
    },
  };
}

function loadWorkspaceBundle(env = process.env, workspaceOverride) {
  const workspaceRoot = resolveWorkspaceRoot(env, workspaceOverride);
  const manifestPath = resolveWorkspaceManifestPath(env, workspaceOverride);
  const manifest = fs.existsSync(manifestPath)
    ? readJson(manifestPath)
    : inferWorkspaceManifest(workspaceRoot);

  return {
    workspaceRoot,
    manifestPath,
    manifest,
  };
}

module.exports = {
  inferWorkspaceManifest,
  loadWorkspaceBundle,
};
