const { readGatewayConfig } = require('./config');

function resolveModelForModality(modality, env = process.env) {
  const gateway = readGatewayConfig(env);

  if (modality === 'image') {
    return gateway.models.vision || gateway.models.image || gateway.models.chat;
  }

  if (modality === 'audio') {
    return gateway.models.asr || gateway.models.tts || gateway.models.chat;
  }

  if (modality === 'video') {
    return gateway.models.video || gateway.models.vision || gateway.models.chat;
  }

  return gateway.models.chat;
}

function buildGatewayRequest(input, env = process.env) {
  const gateway = readGatewayConfig(env);
  return {
    configured: gateway.isConfigured,
    baseUrl: gateway.baseUrl,
    apiKeyPresent: Boolean(gateway.apiKey),
    modality: input.modality || 'text',
    selectedModel: resolveModelForModality(input.modality || 'text', env),
  };
}

module.exports = {
  resolveModelForModality,
  buildGatewayRequest,
};
