const { readGatewayConfig } = require('./config');
const { postJson } = require('./http_client');

async function executeImageGeneration(input, env = process.env, options = {}) {
  const gateway = readGatewayConfig(env);
  const payload = {
    model: gateway.models.image,
    prompt: input.prompt || input.text || '',
    size: input.size || '1024x1024',
    n: input.n || 1,
  };

  return postJson(`${gateway.baseUrl.replace(/\/$/, '')}/images/generations`, payload, {
    apiKey: gateway.apiKey,
    timeoutMs: options.timeoutMs,
    mockResponse: options.mockResponse,
  });
}

module.exports = {
  executeImageGeneration,
};
