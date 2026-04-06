const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return filePath;
}

function safeSlug(value) {
  return String(value || 'session')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'session';
}

function buildBaseName(session = {}) {
  const sessionId = safeSlug(session.sessionId || 'session');
  const timestamp = safeSlug((session.timestamp || new Date().toISOString()).replace(/[:.]/g, '-'));
  return `${sessionId}-${timestamp}`;
}

function buildWorkspaceRefs(result, workspaceManifest) {
  const manifest = workspaceManifest || {};
  const selectedSkillPath = Array.isArray(manifest.skills)
    ? (manifest.skills.find((skill) => skill.id === result.route?.primarySkill)?.routePath || null)
    : null;

  return {
    manifestPath: '.lifecoach/workspace.manifest.json',
    governancePath: manifest.governance?.layerManifestPath || '.lifecoach/layer-governance.json',
    frontstageAgentId: manifest.frontstageAgentId || 'life-coach',
    selectedSkillPath,
    knowledgeIds: (result.knowledgeHits || []).map((item) => item.id),
    protectedTargets: manifest.protectedTargets || [],
    dynamicStateLinks: manifest.dynamicStateLinks || {},
  };
}

function persistSessionArtifacts(session, result, runtimePaths, workspaceManifest) {
  const state = runtimePaths.state || {};
  const workspaceRefs = buildWorkspaceRefs(result, workspaceManifest);
  const baseName = buildBaseName(session);
  const files = [];

  ensureDir(state.eventsDir);
  ensureDir(state.timelineDir);
  ensureDir(state.reviewsDir);
  ensureDir(state.memoryCacheDir);
  ensureDir(state.proposalsDir);
  ensureDir(state.systemReviewsDir);

  files.push(writeJson(path.join(state.eventsDir, `${baseName}.event.json`), {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    event: result.event,
    workflow: result.workflow || null,
    flavorSnapshot: result.flavorScores ? {
      overall: result.flavorScores.overall,
      band: result.flavorScores.band,
    } : null,
    workspaceRefs,
  }));

  files.push(writeJson(path.join(state.timelineDir, `${safeSlug(result.timeline?.activeTimeline?.id || baseName)}.timeline.json`), {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    timeline: result.timeline,
    workflow: result.workflow || null,
    timelineOutcome: result.timelineOutcome || null,
    workspaceRefs,
  }));

  files.push(writeJson(path.join(state.reviewsDir, `${baseName}.review.json`), {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    review: result.review,
    routeQuality: result.routeQuality,
    arbitration: result.arbitration || null,
    workflow: result.workflow || null,
    flavorScores: result.flavorScores || null,
    timelineOutcome: result.timelineOutcome || null,
    workspaceRefs,
  }));

  if (result.proposal) {
    files.push(writeJson(path.join(state.proposalsDir, `${baseName}.proposal.json`), {
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      proposal: result.proposal,
      workspaceRefs,
    }));
  }

  if (result.proposal && result.proposal.systemReview) {
    files.push(writeJson(path.join(state.systemReviewsDir, `${result.proposal.systemReview.id}.system-review.json`), {
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      systemReview: result.proposal.systemReview,
      workspaceRefs,
    }));
  }

  files.push(writeJson(path.join(state.memoryCacheDir, `${baseName}.memory.json`), {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    memory: result.memory,
    workspaceRefs,
  }));

  return {
    persisted: true,
    files,
  };
}

module.exports = {
  persistSessionArtifacts,
};
