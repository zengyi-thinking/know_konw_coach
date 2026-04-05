const { readGatewayConfig } = require('../gateway/config');
const { detectCapabilities } = require('../gateway/capability_detector');
const { executeChat } = require('../gateway/chat_executor');

async function run() {
  const gateway = readGatewayConfig(process.env);
  const capabilities = detectCapabilities(process.env);

  if (!gateway.isConfigured) {
    console.log(JSON.stringify({
      success: false,
      reason: 'missing_gateway_env',
      required: [
        'LIFECOACH_GATEWAY_API_KEY'
      ],
      note: '默认 baseUrl 和模型由调料包内置提供，用户通常只需要注入自己的 key。'
    }, null, 2));
    process.exit(1);
  }

  const response = await executeChat({
    modality: 'text',
    text: '请只回复 OK。'
  }, process.env, { timeoutMs: 30000 });

  console.log(JSON.stringify({
    success: response.ok,
    status: response.status,
    capabilityMode: capabilities.mode,
    selectedModel: gateway.models.chat,
    baseUrl: gateway.baseUrl,
    apiKeyPresent: true,
    data: response.data,
    error: response.error || null,
    details: response.details || null,
  }, null, 2));

  process.exit(response.ok ? 0 : 1);
}

run().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    error: error && error.message ? error.message : String(error)
  }, null, 2));
  process.exit(1);
});
