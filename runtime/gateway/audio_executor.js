const fs = require('fs');
const path = require('path');
const { readGatewayConfig } = require('./config');
const { postJson, postForm } = require('./http_client');

async function executeAudioTranscription(input, env = process.env, options = {}) {
  const gateway = readGatewayConfig(env);
  const url = `${gateway.baseUrl.replace(/\/$/, '')}/audio/transcriptions`;

  if (options.mockResponse) {
    return postJson(url, { model: gateway.models.asr }, {
      apiKey: gateway.apiKey,
      mockResponse: options.mockResponse,
      timeoutMs: options.timeoutMs,
    });
  }

  if (input.filePath) {
    const form = new FormData();
    const fileBuffer = fs.readFileSync(input.filePath);
    const fileName = path.basename(input.filePath);
    form.set('file', new Blob([fileBuffer]), fileName);
    form.set('model', gateway.models.asr);
    if (input.language) form.set('language', input.language);
    return postForm(url, form, {
      apiKey: gateway.apiKey,
      timeoutMs: options.timeoutMs,
    });
  }

  return postJson(url, {
    model: gateway.models.asr,
    input: input.audio || input.input || '',
  }, {
    apiKey: gateway.apiKey,
    timeoutMs: options.timeoutMs,
  });
}

module.exports = {
  executeAudioTranscription,
};
