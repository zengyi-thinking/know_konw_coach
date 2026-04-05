#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-installer', 'manifest', 'lifecoach.bundle.json'), 'utf8'));
const workspaceManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', '.lifecoach', 'workspace.manifest.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert(fs.existsSync(fullPath), `missing path: ${relativePath}`);
}

function validateSkillTriples() {
  const skillsDir = path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', 'skills');
  const skillNames = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const skillName of skillNames) {
    assertExists(path.join('packages', 'lifecoach-workspace', 'content', 'skills', skillName, 'SKILL.md'));
    assertExists(path.join('packages', 'lifecoach-workspace', 'content', 'skills', skillName, 'route.json'));
    assertExists(path.join('packages', 'lifecoach-workspace', 'content', 'skills', skillName, 'response_schema.json'));
  }

  const manifestSkillIds = new Set((workspaceManifest.skills || []).map((skill) => skill.id));
  for (const skillName of skillNames) {
    assert(manifestSkillIds.has(skillName), `workspace manifest missing skill: ${skillName}`);
  }
}

function validateKnowledgePairs() {
  const knowledgeRoot = path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', 'knowledge');
  const buckets = fs.readdirSync(knowledgeRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  for (const bucket of buckets) {
    const bucketPath = path.join(knowledgeRoot, bucket.name);
    const jsonFiles = fs.readdirSync(bucketPath).filter((name) => name.endsWith('.json'));
    for (const fileName of jsonFiles) {
      assertExists(path.join('packages', 'lifecoach-workspace', 'content', 'knowledge', bucket.name, fileName.replace(/\.json$/, '.md')));
    }
  }
}

function validateManifestSources() {
  for (const entry of manifest.copy || []) {
    assertExists(entry.source);
  }
}

function validatePackageLayout() {
  assertExists(path.join('packages', 'lifecoach-core', 'src', 'index.js'));
  assertExists(path.join('packages', 'lifecoach-core', 'tests', 'run-selftest.js'));
  assertExists(path.join('packages', 'lifecoach-installer', 'install-openclaw.js'));
  assertExists(path.join('packages', 'lifecoach-workspace', 'content', '.lifecoach', 'workspace.manifest.json'));
}

try {
  validateManifestSources();
  validatePackageLayout();
  validateSkillTriples();
  validateKnowledgePairs();
  console.log(JSON.stringify({
    success: true,
    packageName: manifest.packageName,
    checkedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
}
