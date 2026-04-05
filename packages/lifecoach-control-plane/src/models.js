const fs = require('fs');
const path = require('path');

function resolveDefaultsPath() {
  return path.resolve(__dirname, '..', '..', 'lifecoach-installer', 'config', 'lifecoach.gateway.defaults.json');
}

function loadGatewayDefaults() {
  return JSON.parse(fs.readFileSync(resolveDefaultsPath(), 'utf8'));
}

function buildModelCatalog(entitlements = {}) {
  const defaults = loadGatewayDefaults();
  return [
    {
      id: defaults.models.chat,
      type: 'chat',
      recommended: true,
      available: Boolean(entitlements.featureText),
    },
    {
      id: defaults.models.vision,
      type: 'vision',
      recommended: true,
      available: Boolean(entitlements.featureVision),
    },
    {
      id: defaults.models.image,
      type: 'image',
      recommended: true,
      available: Boolean(entitlements.featureImage),
    },
    {
      id: defaults.models.video,
      type: 'video',
      recommended: true,
      available: Boolean(entitlements.featureVideo),
    },
    {
      id: defaults.models.tts,
      type: 'tts',
      recommended: true,
      available: Boolean(entitlements.featureTts),
    },
    {
      id: defaults.models.asr,
      type: 'asr',
      recommended: true,
      available: Boolean(entitlements.featureAsr),
    },
  ];
}

function buildOpenClawSnippet(apiKey, gatewayBaseUrl) {
  const defaults = loadGatewayDefaults();
  return [
    `LIFECOACH_GATEWAY_BASE_URL=${gatewayBaseUrl.replace(/\/$/, '')}/v1`,
    `LIFECOACH_GATEWAY_API_KEY=${apiKey || 'replace-with-your-api-key'}`,
    `LIFECOACH_CHAT_MODEL=${defaults.models.chat}`,
    `LIFECOACH_VISION_MODEL=${defaults.models.vision}`,
    `LIFECOACH_IMAGE_MODEL=${defaults.models.image}`,
    `LIFECOACH_VIDEO_MODEL=${defaults.models.video}`,
    `LIFECOACH_TTS_MODEL=${defaults.models.tts}`,
    `LIFECOACH_ASR_MODEL=${defaults.models.asr}`,
  ].join('\n');
}

module.exports = {
  loadGatewayDefaults,
  buildModelCatalog,
  buildOpenClawSnippet,
};
