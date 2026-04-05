const fs = require('fs');
const path = require('path');
const { resolveConfigRoot } = require('../paths');

function mergeEnv(env = {}) {
  return { ...process.env, ...env };
}

function loadDefaults(env = process.env) {
  const mergedEnv = mergeEnv(env);
  const defaultsPath = path.join(resolveConfigRoot(mergedEnv), 'lifecoach.gateway.defaults.json');
  return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
}

function readGatewayConfig(env = process.env) {
  const mergedEnv = mergeEnv(env);
  const defaults = loadDefaults(mergedEnv);
  const apiKey = mergedEnv.LIFECOACH_GATEWAY_API_KEY || mergedEnv.CREATION_AI_API_KEY || '';
  const config = {
    baseUrl: mergedEnv.LIFECOACH_GATEWAY_BASE_URL || mergedEnv.CREATION_AI_BASE_URL || defaults.baseUrl || '',
    apiKey,
    models: {
      chat: mergedEnv.LIFECOACH_CHAT_MODEL || mergedEnv.CREATION_AI_CHAT_MODEL || defaults.models.chat || '',
      vision: mergedEnv.LIFECOACH_VISION_MODEL || mergedEnv.CREATION_AI_VISION_MODEL || defaults.models.vision || '',
      image: mergedEnv.LIFECOACH_IMAGE_MODEL || mergedEnv.CREATION_AI_IMAGE_MODEL || defaults.models.image || '',
      video: mergedEnv.LIFECOACH_VIDEO_MODEL || mergedEnv.CREATION_AI_VIDEO_MODEL || defaults.models.video || '',
      tts: mergedEnv.LIFECOACH_TTS_MODEL || mergedEnv.CREATION_AI_TTS_MODEL || defaults.models.tts || '',
      asr: mergedEnv.LIFECOACH_ASR_MODEL || mergedEnv.CREATION_AI_ASR_MODEL || defaults.models.asr || '',
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
