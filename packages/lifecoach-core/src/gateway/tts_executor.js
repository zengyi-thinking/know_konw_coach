const { readGatewayConfig } = require('./config');
const { postJson } = require('./http_client');

async function executeSpeechSynthesis(input, env = process.env, options = {}) {
  const gateway = readGatewayConfig(env);
  const payload = {
    model: gateway.models.tts,
    input: input.text,
    voice: input.voice || 'alloy',
    format: input.format || 'wav',
  };

  return postJson(`${gateway.baseUrl.replace(/\/$/, '')}/audio/speech`, payload, {
    apiKey: gateway.apiKey,
    timeoutMs: options.timeoutMs,
    expectBinary: true,
    mockResponse: options.mockResponse,
  });
}

module.exports = {
  executeSpeechSynthesis,
};
