const path = require('path');
const { evaluateSafety } = require('./router/safety_router');
const { routeSkill } = require('./router/skill_router');
const { retrieveKnowledge } = require('./retrieval/knowledge_retriever');
const { processMemory } = require('./memory/memory_manager');
const { logSessionEvent } = require('./logging/session_event_logger');
const { analyzeRouteQuality } = require('./evolution/route_quality_analyzer');
const { buildReviewReport } = require('./evolution/reflection_reviewer_engine');
const { generatePatchProposal } = require('./evolution/patch_proposal_generator');
const { buildGatewayRequest } = require('./gateway/multimodal_adapter');
const { detectCapabilities } = require('./gateway/capability_detector');
const { executeChat } = require('./gateway/chat_executor');
const { executeAudioTranscription } = require('./gateway/audio_executor');

function runSession(session, options = {}) {
  const workspaceRoot = options.workspaceRoot || path.join(__dirname, '..', 'workspace');
  const safety = evaluateSafety(session.input, workspaceRoot);
  const route = safety.needsSafetyMode
    ? { primarySkill: 'safety', fallback: 'coach-intake', rankedSkills: [] }
    : routeSkill(session.input, workspaceRoot);
  const knowledgeHits = retrieveKnowledge({
    ...session.input,
    primarySkill: route.primarySkill,
  }, workspaceRoot, 2);
  const env = options.env || process.env;
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
    route,
    safety,
  });
  const routeQuality = analyzeRouteQuality({ route, safety, knowledgeHits });
  const review = buildReviewReport({
    safety,
    output: session.output || {},
  });
  const proposal = generatePatchProposal({
    title: 'routing refinement suggestion',
    reason: routeQuality.signals.length ? 'route quality signal detected' : 'routine review',
    targets: ['workspace/skills/' + route.primarySkill + '/route.json'],
    changes: routeQuality.signals,
  });

  return {
    safety,
    route,
    knowledgeHits,
    memory,
    event,
    routeQuality,
    review,
    proposal,
    gateway,
    capabilities,
    upstream,
  };
}

module.exports = {
  runSession,
};
