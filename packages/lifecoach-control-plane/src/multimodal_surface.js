const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeSpeechSynthesis } = require('../../lifecoach-core/src/gateway/tts_executor');
const { executeAudioTranscription } = require('../../lifecoach-core/src/gateway/audio_executor');
const { executeImageGeneration } = require('../../lifecoach-core/src/gateway/image_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');

function buildPlaceholderImage(prompt) {
  const safePrompt = String(prompt || 'Lifecoach').slice(0, 80);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff6f1"/>
        <stop offset="55%" stop-color="#f7d8e7"/>
        <stop offset="100%" stop-color="#d4f1f5"/>
      </linearGradient>
      <radialGradient id="orb" cx="50%" cy="40%" r="42%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="45%" stop-color="#ff9fd4" stop-opacity="0.85"/>
        <stop offset="75%" stop-color="#8be8ef" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#c67be6" stop-opacity="0.82"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <circle cx="512" cy="472" r="232" fill="url(#orb)" opacity="0.92"/>
    <circle cx="432" cy="392" r="54" fill="#ffffff" opacity="0.42"/>
    <text x="512" y="840" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#6b4f45">${safePrompt.replace(/[<>&"]/g, '')}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function generateImageAsset(input, env = process.env) {
  if (!isProxyEnabled(env)) {
    return {
      ok: true,
      source: 'local-placeholder',
      imageUrl: buildPlaceholderImage(input.prompt),
    };
  }

  const response = await executeImageGeneration({
    prompt: input.prompt,
    size: input.size,
    n: 1,
  }, buildUpstreamEnv(env), { timeoutMs: 60000 });

  const imageUrl = response.data?.data?.[0]?.url
    || (response.data?.data?.[0]?.b64_json ? `data:image/png;base64,${response.data.data[0].b64_json}` : null);

  return {
    ok: Boolean(response.ok && imageUrl),
    source: response.ok ? 'upstream-image-model' : 'upstream-error',
    imageUrl,
    raw: response.data,
    error: response.error || response.details || null,
  };
}

async function synthesizeSpeechAsset(input, env = process.env, options = {}) {
  if (!isProxyEnabled(env)) {
    const text = String(input.text || 'lifecoach');
    const wav = createPlaceholderWav();
    return {
      ok: true,
      source: 'local-placeholder',
      audio: wav,
      contentType: 'audio/wav',
      error: null,
    };
  }

  const response = await executeSpeechSynthesis({
    text: input.text,
    voice: input.voice || 'alloy',
    format: input.format || 'wav',
  }, buildUpstreamEnv(env), { timeoutMs: 60000 });

  return {
    ok: Boolean(response.ok && Buffer.isBuffer(response.data)),
    source: response.ok ? 'upstream-tts-model' : 'upstream-error',
    audio: response.data,
    contentType: response.meta?.contentType || 'audio/wav',
    error: response.error || response.details || null,
  };
}

function decodeDataUrlToBuffer(dataUrl = '') {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

async function transcribeAudioAsset(input, env = process.env) {
  if (!isProxyEnabled(env)) {
    return {
      ok: true,
      source: 'local-placeholder',
      text: input.transcriptHint || '这是一个本地占位转写结果。',
      error: null,
    };
  }

  const decoded = decodeDataUrlToBuffer(input.audioDataUrl || '');
  if (!decoded) {
    return {
      ok: false,
      source: 'invalid-audio',
      text: null,
      error: 'invalid_audio_data',
    };
  }

  const tempExt = decoded.mimeType.includes('webm') ? 'webm' : decoded.mimeType.includes('mpeg') ? 'mp3' : 'wav';
  const tempFile = path.join(os.tmpdir(), `lifecoach-upload-${Date.now()}.${tempExt}`);
  fs.writeFileSync(tempFile, decoded.buffer);

  try {
    const response = await executeAudioTranscription({
      filePath: tempFile,
      language: input.language || 'zh',
    }, buildUpstreamEnv(env), { timeoutMs: 60000 });

    return {
      ok: Boolean(response.ok),
      source: response.ok ? 'upstream-asr-model' : 'upstream-error',
      text: typeof response.data === 'string' ? response.data : response.data?.text || response.data?.transcript || null,
      error: response.error || response.details || null,
    };
  } finally {
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

function createPlaceholderWav(durationMs = 420, sampleRate = 8000) {
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * 440 * t) * 0.12;
    buffer.writeInt16LE(Math.floor(value * 32767), 44 + i * 2);
  }
  return buffer;
}

module.exports = {
  generateImageAsset,
  synthesizeSpeechAsset,
  transcribeAudioAsset,
};
