const fs = require('fs');
const os = require('os');
const path = require('path');
const { requireRuntimeModule } = require('./require_runtime');
const { readGatewayConfig } = requireRuntimeModule('../src/gateway/config', '../gateway/config');
const { detectCapabilities } = requireRuntimeModule('../src/gateway/capability_detector', '../gateway/capability_detector');
const { executeSpeechSynthesis } = requireRuntimeModule('../src/gateway/tts_executor', '../gateway/tts_executor');
const { executeAudioTranscription } = requireRuntimeModule('../src/gateway/audio_executor', '../gateway/audio_executor');

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

  const speech = await executeSpeechSynthesis({
    text: '你好，这是一段音频测试。',
    voice: 'alloy',
    format: 'mp3'
  }, process.env, { timeoutMs: 60000 });

  const contentType = speech.meta && speech.meta.contentType ? speech.meta.contentType : '';
  const fileExt = contentType.includes('mpeg') ? 'mp3' : 'wav';


  if (!speech.ok || !Buffer.isBuffer(speech.data)) {
    console.log(JSON.stringify({
      success: false,
      stage: 'tts',
      status: speech.status,
      error: speech.error || null,
      details: speech.details || null,
      data: Buffer.isBuffer(speech.data) ? `buffer:${speech.data.length}` : speech.data,
    }, null, 2));
    process.exit(1);
  }

  const tempFile = path.join(os.tmpdir(), `lifecoach-audio-test-${Date.now()}.${fileExt}`);
  fs.writeFileSync(tempFile, speech.data);

  const asr = await executeAudioTranscription({
    filePath: tempFile,
    language: 'zh'
  }, process.env, { timeoutMs: 60000 });

  try { fs.unlinkSync(tempFile); } catch {}

  console.log(JSON.stringify({
    success: asr.ok,
    stage: 'asr',
    status: asr.status,
    capabilityMode: capabilities.mode,
    selectedTtsModel: gateway.models.tts,
    selectedAsrModel: gateway.models.asr,
    baseUrl: gateway.baseUrl,
    audioContentType: contentType,
    apiKeyPresent: true,
    data: asr.data,
    error: asr.error || null,
    details: asr.details || null,
  }, null, 2));

  process.exit(asr.ok ? 0 : 1);
}

run().catch((error) => {
  console.log(JSON.stringify({ success: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
});
