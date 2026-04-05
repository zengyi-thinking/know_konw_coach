const fs = require('fs');
const path = require('path');
const { resolveWorkspaceRoot } = require('../paths');

function governancePath(env = process.env, workspaceOverride) {
  return path.join(resolveWorkspaceRoot(env, workspaceOverride), '.lifecoach', 'layer-governance.json');
}

function readLayerGovernance(env = process.env, workspaceOverride) {
  const filePath = governancePath(env, workspaceOverride);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeRepoTarget(target) {
  return String(target || '').replace(/\\/g, '/').replace(/^workspace\//, 'packages/lifecoach-workspace/content/');
}

function matchLayerByTarget(governance, target) {
  if (!governance || !Array.isArray(governance.layers)) return null;
  const normalizedTarget = normalizeRepoTarget(target);

  return governance.layers.find((layer) =>
    Array.isArray(layer.paths) && layer.paths.some((layerPath) => {
      const normalizedLayerPath = String(layerPath).replace(/\\/g, '/');
      return normalizedTarget === normalizedLayerPath || normalizedTarget.startsWith(`${normalizedLayerPath}/`);
    })
  ) || null;
}

function classifyProposal(governance, proposal) {
  const targets = Array.isArray(proposal.targets) ? proposal.targets : [];
  return targets.map((target) => ({
    target,
    layer: matchLayerByTarget(governance, target),
  }));
}

function checkGovernanceMutation(governance, proposal) {
  const classified = classifyProposal(governance, proposal);
  const blocked = classified.find((item) => item.layer && item.layer.allowedMutation === 'manual_only');
  if (blocked) {
    return {
      allowed: false,
      reason: 'blocked_by_layer_governance',
      blockedTarget: blocked.target,
      blockedLayer: blocked.layer.id,
      classifiedTargets: classified.map((item) => ({
        target: item.target,
        layerId: item.layer ? item.layer.id : null,
      })),
    };
  }

  const runtimeManaged = classified.find((item) => item.layer && item.layer.allowedMutation === 'runtime_managed');
  if (runtimeManaged) {
    return {
      allowed: false,
      systemReviewRequired: false,
      reason: 'runtime_managed_layer',
      blockedTarget: runtimeManaged.target,
      blockedLayer: runtimeManaged.layer.id,
      classifiedTargets: classified.map((item) => ({
        target: item.target,
        layerId: item.layer ? item.layer.id : null,
      })),
    };
  }

  const systemReviewTargets = classified.filter((item) => item.layer && item.layer.allowedMutation === 'proposal_with_system_review');
  if (systemReviewTargets.length > 0) {
    return {
      allowed: false,
      systemReviewRequired: true,
      reason: 'requires_system_review',
      systemReviewLayers: Array.from(new Set(systemReviewTargets.map((item) => item.layer.id))),
      classifiedTargets: classified.map((item) => ({
        target: item.target,
        layerId: item.layer ? item.layer.id : null,
      })),
    };
  }

  return {
    allowed: true,
    reason: 'allowed_by_layer_governance',
    classifiedTargets: classified.map((item) => ({
      target: item.target,
      layerId: item.layer ? item.layer.id : null,
    })),
  };
}

module.exports = {
  governancePath,
  readLayerGovernance,
  normalizeRepoTarget,
  matchLayerByTarget,
  classifyProposal,
  checkGovernanceMutation,
};
