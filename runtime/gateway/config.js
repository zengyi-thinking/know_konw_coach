const fs = require('fs');
const path = require('path');

function loadDefaults() {
  const defaultsPath = path.join(__dirname, '..', '..', 'config', 'lifecoach.gateway.defaults.json');
  return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
}

function readGatewayConfig(env = process.env) {
  const defaults = loadDefaults();
  const apiKey = env.LIFECOACH_GATEWAY_API_KEY || env.CREATION_AI_API_KEY || '';
  const config = {
    baseUrl: env.LIFECOACH_GATEWAY_BASE_URL || env.CREATION_AI_BASE_URL || defaults.baseUrl || '',
    apiKey,
    models: {
      chat: env.LIFECOACH_CHAT_MODEL || env.CREATION_AI_CHAT_MODEL || defaults.models.chat || '',
      vision: env.LIFECOACH_VISION_MODEL || env.CREATION_AI_VISION_MODEL || defaults.models.vision || '',
      image: env.LIFECOACH_IMAGE_MODEL || env.CREATION_AI_IMAGE_MODEL || defaults.models.image || '',
      video: env.LIFECOACH_VIDEO_MODEL || env.CREATION_AI_VIDEO_MODEL || defaults.models.video || '',
      tts: env.LIFECOACH_TTS_MODEL || env.CREATION_AI_TTS_MODEL || defaults.models.tts || '',
      asr: env.LIFECOACH_ASR_MODEL || env.CREATION_AI_ASR_MODEL || defaults.models.asr || '',
    },
  };

  return {
    ...config,
    source: {
      defaults: true,
      userKey: Boolean(apiKey),
    },
    isConfigured: Boolean(config.baseUrl && config.apiKey && config.models.chat),
  };
}

module.exports = {
  readGatewayConfig,
};
