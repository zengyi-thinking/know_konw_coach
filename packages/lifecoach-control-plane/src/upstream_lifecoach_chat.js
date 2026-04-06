const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');

function isProxyEnabled(env = process.env) {
  return env.LIFECOACH_GATEWAY_PROXY_ENABLED === 'true'
    && Boolean(env.CREATION_AI_API_KEY || env.LIFECOACH_GATEWAY_UPSTREAM_API_KEY || env.LIFECOACH_GATEWAY_API_KEY);
}

function buildUpstreamEnv(env = process.env) {
  return {
    ...env,
    LIFECOACH_GATEWAY_BASE_URL: env.LIFECOACH_GATEWAY_UPSTREAM_BASE_URL || env.CREATION_AI_BASE_URL || env.LIFECOACH_GATEWAY_BASE_URL,
    LIFECOACH_GATEWAY_API_KEY: env.LIFECOACH_GATEWAY_UPSTREAM_API_KEY || env.CREATION_AI_API_KEY || env.LIFECOACH_GATEWAY_API_KEY,
    LIFECOACH_CHAT_MODEL: env.CREATION_AI_CHAT_MODEL || env.LIFECOACH_CHAT_MODEL,
    LIFECOACH_VISION_MODEL: env.CREATION_AI_VISION_MODEL || env.LIFECOACH_VISION_MODEL,
    LIFECOACH_IMAGE_MODEL: env.CREATION_AI_IMAGE_MODEL || env.LIFECOACH_IMAGE_MODEL,
    LIFECOACH_VIDEO_MODEL: env.CREATION_AI_VIDEO_MODEL || env.LIFECOACH_VIDEO_MODEL,
    LIFECOACH_TTS_MODEL: env.CREATION_AI_TTS_MODEL || env.LIFECOACH_TTS_MODEL,
    LIFECOACH_ASR_MODEL: env.CREATION_AI_ASR_MODEL || env.LIFECOACH_ASR_MODEL,
  };
}

function buildGuidedMessages(flow, originalMessages) {
  const knowledgeLines = (flow.result.knowledgeHits || [])
    .map((item) => `- ${item.title}: ${item.summary}`)
    .join('\n');
  const workflowLine = flow.result.workflow
    ? `当前长期工作流: ${flow.result.workflow.title} / 阶段: ${flow.result.workflow.stageId}`
    : '当前没有长期工作流阶段。';

  const systemPrompt = [
    '你现在扮演一个稳定、长期陪伴型的 Life Coach。',
    '不要像通用 AI 助手，不要像工具台，不要像心理诊断者。',
    '保持自然、平稳、克制的中文表达，先承接，再聚焦，再给一个合适下一步。',
    `当前主 skill: ${flow.result.route.primarySkill}`,
    workflowLine,
    `当前风险级别: ${flow.result.safety.riskLevel}`,
    `当前 flavor score: ${flow.result.flavorScores.overall} (${flow.result.flavorScores.band})`,
    knowledgeLines ? `优先参考这些知识块:\n${knowledgeLines}` : '当前不需要额外知识灌输，只要自然使用教练框架。',
    '回答不要像在汇报系统内部状态，不要暴露后台 agent 名称。',
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    ...originalMessages,
  ];
}

async function maybeProxyLifecoachChat(flow, body, env = process.env) {
  if (!isProxyEnabled(env)) {
    return { used: false, ok: false, data: null, error: null };
  }

  const proxyEnv = buildUpstreamEnv(env);
  const messages = buildGuidedMessages(flow, Array.isArray(body.messages) ? body.messages : []);
  const response = await executeChat({
    modality: body.modality || 'text',
    imageUrl: body.imageUrl || null,
    messages,
  }, proxyEnv, { timeoutMs: 45000 });

  return {
    used: true,
    ok: Boolean(response.ok),
    data: response.data,
    error: response.error || response.details || null,
  };
}

module.exports = {
  isProxyEnabled,
  buildUpstreamEnv,
  maybeProxyLifecoachChat,
};
