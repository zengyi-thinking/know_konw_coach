const { readGatewayConfig } = require('./config');
const { resolveModelForModality } = require('./multimodal_adapter');
const { postJson } = require('./http_client');

async function executeChat(input, env = process.env, options = {}) {
  const gateway = readGatewayConfig(env);
  const model = resolveModelForModality(input.modality || 'text', env);
  const payload = {
    model,
    messages: input.messages || [
      {
        role: 'user',
        content: input.text || '',
      },
    ],
  };

  if (input.modality === 'image' && input.imageUrl) {
    payload.messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: input.text || '请理解这张图片并回答。' },
          { type: 'image_url', image_url: { url: input.imageUrl } },
        ],
      },
    ];
  }

  return postJson(`${gateway.baseUrl.replace(/\/$/, '')}/chat/completions`, payload, {
    apiKey: gateway.apiKey,
    mockResponse: options.mockResponse,
    timeoutMs: options.timeoutMs,
  });
}

module.exports = {
  executeChat,
};
