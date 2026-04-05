function readGatewayConfig(env = process.env) {
  const config = {
    baseUrl: env.CREATION_AI_BASE_URL || '',
    apiKey: env.CREATION_AI_API_KEY || '',
    models: {
      chat: env.CREATION_AI_CHAT_MODEL || '',
      vision: env.CREATION_AI_VISION_MODEL || '',
      image: env.CREATION_AI_IMAGE_MODEL || '',
      video: env.CREATION_AI_VIDEO_MODEL || '',
      tts: env.CREATION_AI_TTS_MODEL || '',
      asr: env.CREATION_AI_ASR_MODEL || '',
    },
  };

  return {
    ...config,
    isConfigured: Boolean(config.baseUrl && config.apiKey && config.models.chat),
  };
}

module.exports = {
  readGatewayConfig,
};
