#!/usr/bin/env node
const http = require('http');
const { readJsonBody, sendJson } = require('../../packages/lifecoach-control-plane/src/http');
const { authenticateApiKey, touchApiKey } = require('../../packages/lifecoach-control-plane/src/api_keys');
const { runLifecoachConversation } = require('../../packages/lifecoach-control-plane/src/lifecoach_engine');
const { loadGatewayDefaults } = require('../../packages/lifecoach-control-plane/src/models');
const { logUsage } = require('../../packages/lifecoach-control-plane/src/usage');
const { executeChat } = require('../../packages/lifecoach-core/src/gateway/chat_executor');
const { executeAudioTranscription } = require('../../packages/lifecoach-core/src/gateway/audio_executor');
const { executeSpeechSynthesis } = require('../../packages/lifecoach-core/src/gateway/tts_executor');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function ensureFeature(entitlements, featureKey) {
  if (!entitlements || !entitlements[featureKey]) {
    throw new Error(`feature_not_enabled:${featureKey}`);
  }
}

function parseChatInput(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((item) => item.role === 'user') || { content: '' };
  const content = lastUser.content;

  if (Array.isArray(content)) {
    const textPart = content.find((item) => item.type === 'text');
    const imagePart = content.find((item) => item.type === 'image_url');
    return {
      modality: imagePart ? 'image' : 'text',
      messages,
      imageUrl: imagePart && imagePart.image_url ? imagePart.image_url.url : null,
      userText: textPart ? textPart.text : '',
    };
  }

  return {
    modality: body.modality || 'text',
    messages,
    imageUrl: body.imageUrl || null,
    userText: typeof content === 'string' ? content : '',
  };
}

function buildChatResponse(body, auth, env) {
  const parsed = parseChatInput(body);
  if (parsed.modality === 'image') {
    ensureFeature(auth.entitlements, 'featureVision');
  } else {
    ensureFeature(auth.entitlements, 'featureText');
  }

  const flow = runLifecoachConversation({
    messages: parsed.messages,
    modality: parsed.modality,
    imageUrl: parsed.imageUrl,
  }, env, {
    entitlements: auth.entitlements,
  });

  return {
    id: `chatcmpl_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: parsed.modality === 'image' ? loadGatewayDefaults().models.vision : loadGatewayDefaults().models.chat,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: flow.assistantMessage,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.max(12, parsed.userText.length),
      completion_tokens: Math.max(40, flow.assistantMessage.length),
      total_tokens: Math.max(52, parsed.userText.length + flow.assistantMessage.length),
    },
    lifecoach: {
      mode: 'enhanced',
      route: flow.result.route,
      safety: flow.result.safety,
      knowledgeHits: flow.result.knowledgeHits.map((item) => ({
        id: item.id,
        title: item.title,
        score: item.score,
      })),
      adaptivePolicy: flow.result.adaptivePolicy,
      cerebellum: flow.cerebellum,
      processing: {
        modality: parsed.modality,
        upstreamUsed: false,
        persistedArtifacts: flow.result.persistence ? flow.result.persistence.files : [],
      },
    },
  };
}

function isProxyEnabled(env = process.env) {
  return env.LIFECOACH_GATEWAY_PROXY_ENABLED === 'true' && Boolean(env.CREATION_AI_API_KEY || env.LIFECOACH_GATEWAY_UPSTREAM_API_KEY);
}

function buildProxyEnv(env = process.env) {
  return {
    ...env,
    LIFECOACH_GATEWAY_BASE_URL: env.LIFECOACH_GATEWAY_UPSTREAM_BASE_URL || env.CREATION_AI_BASE_URL || env.LIFECOACH_GATEWAY_BASE_URL,
    LIFECOACH_GATEWAY_API_KEY: env.LIFECOACH_GATEWAY_UPSTREAM_API_KEY || env.CREATION_AI_API_KEY || env.LIFECOACH_GATEWAY_API_KEY,
    LIFECOACH_CHAT_MODEL: env.CREATION_AI_CHAT_MODEL || env.LIFECOACH_CHAT_MODEL,
    LIFECOACH_VISION_MODEL: env.CREATION_AI_VISION_MODEL || env.LIFECOACH_VISION_MODEL,
    LIFECOACH_IMAGE_MODEL: env.CREATION_AI_IMAGE_MODEL || env.LIFECOACH_IMAGE_MODEL,
    LIFECOACH_VIDEO_MODEL: env.CREATION_AI_VIDEO_MODEL || env.LIFECOACH_VIDEO_MODEL,
    LIFECOACH_TTS_MODEL: env.CREATION_AI_TTS_MODEL || env.LIFECOACH_TTS_MODEL,
    LIFECOACH_ASR_MODEL: env.CREATION_AI_ASR_MODEL || env.LIFECOACH_ASR_MODEL,
  };
}

async function maybeProxyChat(body, env) {
  if (!isProxyEnabled(env)) {
    return { used: false, ok: false, data: null, error: null };
  }

  const proxyResult = await executeChat(body, buildProxyEnv(env), { timeoutMs: 45000 });
  return {
    used: true,
    ok: Boolean(proxyResult.ok),
    data: proxyResult.data,
    error: proxyResult.error || proxyResult.details || null,
  };
}

async function maybeProxyAsr(body, env) {
  if (!isProxyEnabled(env)) {
    return { used: false, ok: false, data: null, error: null };
  }

  const proxyResult = await executeAudioTranscription(body, buildProxyEnv(env), { timeoutMs: 45000 });
  return {
    used: true,
    ok: Boolean(proxyResult.ok),
    data: proxyResult.data,
    error: proxyResult.error || proxyResult.details || null,
  };
}

async function maybeProxyTts(body, env) {
  if (!isProxyEnabled(env)) {
    return { used: false, ok: false, data: null, error: null };
  }

  const proxyResult = await executeSpeechSynthesis(body, buildProxyEnv(env), { timeoutMs: 45000 });
  return {
    used: true,
    ok: Boolean(proxyResult.ok),
    data: proxyResult.data,
    error: proxyResult.error || proxyResult.details || null,
  };
}

async function buildAudioTranscriptionResponse(body, auth, env) {
  ensureFeature(auth.entitlements, 'featureAsr');
  const upstream = await maybeProxyAsr(body, env);
  const upstreamText = upstream.ok
    ? (typeof upstream.data === 'string' ? upstream.data : upstream.data?.text || upstream.data?.transcript || '')
    : '';
  const transcript = body.input || body.audio || body.transcriptHint || '这是一段默认的语音转写结果。';
  return {
    text: upstreamText || transcript,
    language: body.language || 'zh',
    lifecoach: {
      mode: 'enhanced',
      cerebellum: {
        enabled: Boolean(auth.entitlements.featureCerebellum),
        recommendation: '先将语音转写为文字，再进入主教练流程。',
      },
      processing: {
        modality: 'audio',
        upstreamUsed: upstream.used && upstream.ok,
        upstreamError: upstream.used && !upstream.ok ? upstream.error : null,
      },
    },
  };
}

async function buildSpeechBuffer(body, auth, env) {
  ensureFeature(auth.entitlements, 'featureTts');
  const upstream = await maybeProxyTts(body, env);
  if (upstream.ok && Buffer.isBuffer(upstream.data)) {
    return {
      buffer: upstream.data,
      upstreamUsed: true,
      upstreamError: null,
    };
  }

  const payload = JSON.stringify({
    voice: body.voice || 'alloy',
    text: body.input || body.text || '',
    cerebellum: Boolean(auth.entitlements.featureCerebellum),
  });
  return {
    buffer: Buffer.from(payload, 'utf8'),
    upstreamUsed: false,
    upstreamError: upstream.used && !upstream.ok ? upstream.error : null,
  };
}

function buildCerebellumResponse(body, auth, env) {
  ensureFeature(auth.entitlements, 'featureCerebellum');
  const flow = runLifecoachConversation({
    messages: [
      {
        role: 'user',
        content: body.text || '请帮我判断当前最合适的教练路径。',
      },
    ],
  }, env, {
    entitlements: auth.entitlements,
  });

  return {
    ok: true,
    focus: flow.cerebellum.focus,
    trace: flow.cerebellum.trace,
    recommendation: flow.cerebellum.recommendation,
    route: flow.result.route,
    safety: flow.result.safety,
  };
}

function createGatewayServer(options = {}) {
  const env = options.env || process.env;

  return http.createServer(async (req, res) => {
    const startedAt = Date.now();

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        });
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'lifecoach-gateway' }, {
          'Access-Control-Allow-Origin': '*',
        });
        return;
      }

      const rawKey = getBearerToken(req);
      const auth = authenticateApiKey(rawKey, env);
      if (!auth) {
        throw new Error('invalid_api_key');
      }

      let payload;
      let responseBody;
      let statusCode = 200;

      if (req.method === 'POST' && pathname === '/v1/chat/completions') {
        payload = await readJsonBody(req);
        responseBody = buildChatResponse(payload, auth, env);
        const upstream = await maybeProxyChat(payload, env);
        const upstreamContent = upstream.ok
          ? upstream.data?.choices?.[0]?.message?.content
          : null;
        if (upstreamContent) {
          responseBody.choices[0].message.content = upstreamContent;
        }
        responseBody.lifecoach.processing.upstreamUsed = upstream.used && upstream.ok;
        responseBody.lifecoach.processing.upstreamError = upstream.used && !upstream.ok ? upstream.error : null;
      } else if (req.method === 'POST' && pathname === '/v1/audio/transcriptions') {
        payload = await readJsonBody(req);
        responseBody = await buildAudioTranscriptionResponse(payload, auth, env);
      } else if (req.method === 'POST' && pathname === '/v1/audio/speech') {
        payload = await readJsonBody(req);
        const speech = await buildSpeechBuffer(payload, auth, env);
        const buffer = speech.buffer;
        logUsage({
          userId: auth.user.id,
          apiKeyId: auth.apiKey.id,
          endpoint: pathname,
          model: loadGatewayDefaults().models.tts,
          requestType: 'speech',
          inputUnits: String(payload.input || payload.text || '').length,
          outputUnits: buffer.length,
          latencyMs: Date.now() - startedAt,
          statusCode: 200,
        }, env);
        touchApiKey(rawKey, env);
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'X-Lifecoach-Upstream-Used': speech.upstreamUsed ? 'true' : 'false',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(buffer);
        return;
      } else if (req.method === 'POST' && pathname === '/v1/cerebellum/think') {
        payload = await readJsonBody(req);
        responseBody = buildCerebellumResponse(payload, auth, env);
      } else {
        statusCode = 404;
        responseBody = { error: 'not_found' };
      }

      logUsage({
        userId: auth.user.id,
        apiKeyId: auth.apiKey.id,
        endpoint: pathname,
        model: responseBody.model || null,
        requestType: pathname.includes('audio') ? 'audio' : 'chat',
        inputUnits: JSON.stringify(payload || {}).length,
        outputUnits: JSON.stringify(responseBody || {}).length,
        latencyMs: Date.now() - startedAt,
        statusCode,
      }, env);
      touchApiKey(rawKey, env);
      sendJson(res, statusCode, responseBody, {
        'Access-Control-Allow-Origin': '*',
      });
    } catch (error) {
      const statusCode = error.message === 'invalid_api_key'
        ? 401
        : error.message.startsWith('feature_not_enabled:')
          ? 403
          : 400;
      sendJson(res, statusCode, {
        error: error.message || 'unexpected_error',
      }, {
        'Access-Control-Allow-Origin': '*',
      });
    }
  });
}

function startGatewayServer(options = {}) {
  const port = options.port || Number(process.env.LIFECOACH_GATEWAY_PORT || 3201);
  const server = createGatewayServer(options);
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port: server.address().port }));
  });
}

if (require.main === module) {
  startGatewayServer().then(({ port }) => {
    console.log(`lifecoach-gateway listening on http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createGatewayServer,
  startGatewayServer,
};
