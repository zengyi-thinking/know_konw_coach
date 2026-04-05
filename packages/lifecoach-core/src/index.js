const { evaluateSafety } = require('./router/safety_router');
const { routeSkill } = require('./router/skill_router');
const { retrieveKnowledge } = require('./retrieval/knowledge_retriever');
const { processMemory } = require('./memory/memory_manager');
const { logSessionEvent } = require('./logging/session_event_logger');
const { analyzeRouteQuality } = require('./evolution/route_quality_analyzer');
const { buildReviewReport } = require('./evolution/reflection_reviewer_engine');
const { generatePatchProposal } = require('./evolution/patch_proposal_generator');
const { buildTimeline } = require('./evolution/timeline_manager');
const { computeAdaptivePolicy } = require('./evolution/adaptive_policy_engine');
const { buildGatewayRequest } = require('./gateway/multimodal_adapter');
const { detectCapabilities } = require('./gateway/capability_detector');
const { executeChat } = require('./gateway/chat_executor');
const { executeAudioTranscription } = require('./gateway/audio_executor');
const {
  resolveRuntimeRoot,
  resolveWorkspaceRoot,
  resolveConfigRoot,
  resolveSchemaRoot,
  resolveStateDirectories,
} = require('./paths');
const { loadWorkspaceBundle } = require('./workspace_bundle');
const { persistSessionArtifacts } = require('./state/persistence');

function buildRuntimePaths(env, workspaceOverride) {
  const workspaceRoot = resolveWorkspaceRoot(env, workspaceOverride);
  const state = resolveStateDirectories(env);
  return {
    runtimeRoot: resolveRuntimeRoot(env),
    workspaceRoot,
    configRoot: resolveConfigRoot(env),
    schemaRoot: resolveSchemaRoot(env),
    stateRoot: state.root,
    state,
  };
}

function buildTimelineSummary(timeline) {
  if (!timeline || !timeline.activeTimeline) {
    return '';
  }

  return `${timeline.activeTimeline.needKey}:${timeline.phase}`;
}

function buildProposalChanges(routeQuality, review) {
  return [...routeQuality.signals, ...review.issues.map((issue) => ({ type: issue, severity: 'medium' }))];
}

function runSession(session, options = {}) {
  const env = options.env || process.env;
  const runtimePaths = buildRuntimePaths(env, options.workspaceRoot);
  const workspaceRoot = runtimePaths.workspaceRoot;
  const workspaceBundle = loadWorkspaceBundle(env, options.workspaceRoot);
  const safety = evaluateSafety(session.input, workspaceRoot);
  const route = safety.needsSafetyMode
    ? { primarySkill: 'safety', fallback: 'coach-intake', rankedSkills: [] }
    : routeSkill(session.input, workspaceRoot);
  const knowledgeHits = retrieveKnowledge({
    ...session.input,
    primarySkill: route.primarySkill,
  }, workspaceRoot, 2);
  const gateway = buildGatewayRequest(session.input || {}, env);
  const capabilities = detectCapabilities(env);
  const upstream = (session.input?.modality || 'text') === 'audio'
    ? executeAudioTranscription(session.input || {}, env, options.gatewayOptions || {})
    : executeChat(session.input || {}, env, options.gatewayOptions || {});
  const memory = processMemory(session, options.existingMemories || []);
  const event = logSessionEvent({
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    input: session.input,
    output: session.output,
    route,
    safety,
  });
  const timeline = buildTimeline(session, options.existingTimelines || [], event, memory);
  const adaptivePolicy = computeAdaptivePolicy({
    session,
    event,
    timeline,
    memory,
    safety,
  });
  const eventWithPolicy = logSessionEvent({
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    input: session.input,
    output: session.output,
    route,
    safety,
    timeline,
    adaptivePolicy,
  });
  const memoryWithTimeline = processMemory(session, options.existingMemories || [], {
    timelineSummary: buildTimelineSummary(timeline),
  });
  const routeQuality = analyzeRouteQuality({
    route,
    safety,
    knowledgeHits,
    event: eventWithPolicy,
    timeline,
    adaptivePolicy,
  });
  const review = buildReviewReport({
    safety,
    output: session.output || {},
    event: eventWithPolicy,
    timeline,
    adaptivePolicy,
  });
  const proposal = generatePatchProposal({
    title: 'routing refinement suggestion',
    reason: routeQuality.signals.length ? 'route quality signal detected' : 'routine review',
    targets: ['workspace/skills/' + route.primarySkill + '/route.json'],
    changes: buildProposalChanges(routeQuality, review),
  });

  const result = {
    safety,
    route,
    knowledgeHits,
    memory: memoryWithTimeline,
    event: eventWithPolicy,
    timeline,
    adaptivePolicy,
    routeQuality,
    review,
    proposal,
    gateway,
    capabilities,
    upstream,
    runtimePaths,
    workspaceBundle,
  };

  if (options.persistArtifacts) {
    result.persistence = persistSessionArtifacts(session, result, runtimePaths, workspaceBundle.manifest);
  }

  return result;
}

module.exports = {
  runSession,
};
