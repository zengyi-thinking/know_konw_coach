#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-installer', 'manifest', 'lifecoach.bundle.json'), 'utf8'));
const workspaceManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', '.lifecoach', 'workspace.manifest.json'), 'utf8'));
const governanceManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', '.lifecoach', 'layer-governance.json'), 'utf8'));
const flavorMetrics = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages', 'lifecoach-workspace', 'content', '.lifecoach', 'flavor-metrics.json'), 'utf8'));

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

function validateAgents() {
  for (const agent of workspaceManifest.agents || []) {
    assertExists(path.join('packages', 'lifecoach-workspace', 'content', agent.path));
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
  assertExists(path.join('packages', 'lifecoach-workspace', 'content', '.lifecoach', 'layer-governance.json'));
  assertExists(path.join('packages', 'lifecoach-workspace', 'content', '.lifecoach', 'flavor-metrics.json'));
}

function validateLayerGovernance() {
  const layerIds = new Set((governanceManifest.layers || []).map((layer) => layer.id));
  assert(layerIds.size > 0, 'governance layers missing');

  for (const layer of governanceManifest.layers || []) {
    assert(Array.isArray(layer.paths) && layer.paths.length > 0, `governance layer has no paths: ${layer.id}`);
    for (const layerPath of layer.paths) {
      assertExists(layerPath);
    }
  }

  for (const layerId of governanceManifest.evolution?.autoMutableLayers || []) {
    assert(layerIds.has(layerId), `governance evolution references unknown layer: ${layerId}`);
  }
  for (const layerId of governanceManifest.evolution?.systemReviewLayers || []) {
    assert(layerIds.has(layerId), `governance system review references unknown layer: ${layerId}`);
  }
  for (const layerId of governanceManifest.evolution?.blockedLayers || []) {
    assert(layerIds.has(layerId), `governance blocked references unknown layer: ${layerId}`);
  }

  const protectedTargets = new Set(workspaceManifest.protectedTargets || []);
  assert(protectedTargets.has('prompts/core_identity.md'), 'workspace protected targets missing core_identity');
  assert(protectedTargets.has('knowledge/safety'), 'workspace protected targets missing knowledge/safety');
  assert(workspaceManifest.frontstageAgentId === 'life-coach', 'workspace frontstageAgentId must remain life-coach');
  assert((workspaceManifest.agents || []).some((agent) => agent.id === 'persona-guardian'), 'workspace manifest missing persona-guardian');
}

function validateFlavorMetrics() {
  const dimensions = flavorMetrics.dimensions || [];
  assert(dimensions.length >= 5, 'flavor metrics dimensions too few');
  const totalWeight = dimensions.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  assert(Math.abs(totalWeight - 1) < 0.001, `flavor metrics weights must sum to 1, got ${totalWeight}`);
  assert((workspaceManifest.learning || {}).flavorMetricsPath === '.lifecoach/flavor-metrics.json', 'workspace manifest learning.flavorMetricsPath mismatch');
}

try {
  validateManifestSources();
  validatePackageLayout();
  validateLayerGovernance();
  validateFlavorMetrics();
  validateAgents();
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
