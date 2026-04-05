const { readGatewayConfig } = require('./config');
const { postJson } = require('./http_client');

async function executeAudioTranscription(input, env = process.env, options = {}) {
  const gateway = readGatewayConfig(env);
  const payload = {
    model: gateway.models.asr,
    input: input.audio || input.input || '',
  };

  return postJson(`${gateway.baseUrl.replace(/\/$/, '')}/audio/transcriptions`, payload, {
    apiKey: gateway.apiKey,
    mockResponse: options.mockResponse,
    timeoutMs: options.timeoutMs,
  });
}

module.exports = {
  executeAudioTranscription,
};
