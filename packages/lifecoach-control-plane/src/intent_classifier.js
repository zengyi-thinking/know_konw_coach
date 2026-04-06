const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');
const { inferRuleIntent, extractLastUserText } = require('./multimodal_intent');

function hasGeneratedImageContext(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  return messages.some((message) => message.role === 'assistant' && Boolean(message.generatedImageUrl));
}

function hasCurrentImageInput(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = [...messages].reverse().find((message) => message.role === 'user');
  return Array.isArray(last?.content)
    && last.content.some((item) => item.type === 'image_url' && item.image_url?.url);
}

function buildIntentPrompt(userText, hasImage, hasGeneratedImage) {
  return [
    '你是一个多模态意图分类器。',
    '请根据用户最后一条输入，把意图分类成以下三类之一：',
    '- chat',
    '- image_generation',
    '- image_understanding',
    '只输出 JSON，格式为：{"intent":"chat","reason":"..."}',
    `用户是否已上传图片: ${hasImage ? 'yes' : 'no'}`,
    `会话中是否已有已生成图片: ${hasGeneratedImage ? 'yes' : 'no'}`,
    `用户输入: ${userText}`,
    '如果用户在延续上一张图片并要求调色、改风格、再来一版，应判为 image_generation。',
  ].join('\n');
}

async function inferSemanticIntent(body = {}, env = process.env) {
  const fallback = inferRuleIntent(body);
  if (!fallback.needsSemanticCheck || !isProxyEnabled(env)) {
    return fallback;
  }

  const userText = extractLastUserText(body.messages || []);
  const hasImage = hasCurrentImageInput(body);
  const hasGeneratedImage = hasGeneratedImageContext(body);

  const response = await executeChat({
    modality: 'text',
    messages: [
      { role: 'system', content: buildIntentPrompt(userText, hasImage, hasGeneratedImage) },
      { role: 'user', content: '开始分类。' },
    ],
  }, buildUpstreamEnv(env), { timeoutMs: 20000 });

  if (!response.ok) {
    return fallback;
  }

  const content = response.data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (parsed.intent) {
      return {
        type: parsed.intent,
        userText,
        reason: parsed.reason || 'semantic_classifier',
        needsSemanticCheck: false,
      };
    }
  } catch {}

  return fallback;
}

module.exports = {
  inferSemanticIntent,
};
