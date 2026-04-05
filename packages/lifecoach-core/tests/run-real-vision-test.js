const { requireRuntimeModule } = require('./require_runtime');
const { readGatewayConfig } = requireRuntimeModule('../src/gateway/config', '../gateway/config');
const { detectCapabilities } = requireRuntimeModule('../src/gateway/capability_detector', '../gateway/capability_detector');
const { executeChat } = requireRuntimeModule('../src/gateway/chat_executor', '../gateway/chat_executor');

const TEST_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/240px-Example.jpg';

async function run() {
  const gateway = readGatewayConfig(process.env);
  const capabilities = detectCapabilities(process.env);

  if (!gateway.isConfigured) {
    console.log(JSON.stringify({
      success: false,
      reason: 'missing_gateway_env',
      required: ['LIFECOACH_GATEWAY_API_KEY']
    }, null, 2));
    process.exit(1);
  }

  const response = await executeChat({
    modality: 'image',
    text: '请识别这张测试图片，并只回复 TEST-IMAGE-OK。',
    imageUrl: TEST_IMAGE_URL,
  }, process.env, { timeoutMs: 30000 });

  console.log(JSON.stringify({
    success: response.ok,
    status: response.status,
    capabilityMode: capabilities.mode,
    selectedModel: gateway.models.vision || gateway.models.image,
    baseUrl: gateway.baseUrl,
    apiKeyPresent: true,
    data: response.data,
    error: response.error || null,
    details: response.details || null,
  }, null, 2));

  process.exit(response.ok ? 0 : 1);
}

run().catch((error) => {
  console.log(JSON.stringify({ success: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
});
