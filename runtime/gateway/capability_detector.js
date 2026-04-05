const { readGatewayConfig } = require('./config');

function detectCapabilities(env = process.env) {
  const gateway = readGatewayConfig(env);
  const enabled = gateway.isConfigured;

  return {
    mode: enabled ? 'enhanced' : 'basic',
    gatewayEnabled: enabled,
    supports: {
      text: true,
      image: enabled && Boolean(gateway.models.vision || gateway.models.image),
      audio: enabled && Boolean(gateway.models.asr || gateway.models.tts),
      video: enabled && Boolean(gateway.models.video),
    },
  };
}

module.exports = {
  detectCapabilities,
};
