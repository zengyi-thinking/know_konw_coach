#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  readJsonBody,
  sendJson,
  sendFile,
  matchPath,
  resolveStaticFile,
} = require('../../packages/lifecoach-control-plane/src/http');
const {
  registerUser,
  signInUser,
  getSessionFromToken,
  touchSession,
} = require('../../packages/lifecoach-control-plane/src/auth');
const {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} = require('../../packages/lifecoach-control-plane/src/api_keys');
const {
  buildModelCatalog,
  buildOpenClawSnippet,
} = require('../../packages/lifecoach-control-plane/src/models');
const { getUsageSummary } = require('../../packages/lifecoach-control-plane/src/usage');
const { finalizeChatCompletion } = require('../../packages/lifecoach-control-plane/src/chat_surface');
const { loadEnvFiles } = require('../../packages/lifecoach-control-plane/src/env_loader');
const { generateImageAsset, synthesizeSpeechAsset, transcribeAudioAsset } = require('../../packages/lifecoach-control-plane/src/multimodal_surface');
const { generatePlanQuestionnaire } = require('../../packages/lifecoach-control-plane/src/plan_questionnaire');
const { generateCoachTodoList, hasEnoughTodoContext } = require('../../packages/lifecoach-control-plane/src/todo_generator');

const publicRoot = path.join(__dirname, 'public');

function getGatewayPublicBaseUrl(env, port) {
  if (env.LIFECOACH_GATEWAY_PUBLIC_BASE_URL) {
    return env.LIFECOACH_GATEWAY_PUBLIC_BASE_URL;
  }

  const gatewayPort = env.LIFECOACH_GATEWAY_PORT || port || 3201;
  return `http://127.0.0.1:${gatewayPort}`;
}

function getAuthToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireSession(req, env) {
  const sessionToken = getAuthToken(req);
  const session = getSessionFromToken(sessionToken, env);
  if (!session) {
    throw new Error('unauthorized');
  }
  touchSession(sessionToken, env);
  return session;
}

function staticContentType(filePath) {
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'text/html; charset=utf-8';
}

function resolvePagePath(pathname) {
  const routeMap = {
    '/': '/index.html',
    '/auth': '/auth.html',
    '/register': '/register.html',
    '/dashboard': '/dashboard.html',
    '/keys': '/keys.html',
    '/integration': '/integration.html',
    '/models': '/models.html',
    '/chat': '/chat.html',
  };

  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  if (pathname.startsWith('/api/') || pathname === '/health') {
    return null;
  }

  if (/\.(css|js|svg|html)$/.test(pathname)) {
    return pathname;
  }

  return null;
}

function createConsoleServer(options = {}) {
  return http.createServer(createConsoleHandler(options));
}

function createConsoleHandler(options = {}) {
  const env = options.env || process.env;
  const gatewayPort = options.gatewayPort;

  return async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = url.pathname;
      const pagePath = resolvePagePath(pathname);

      if (req.method === 'GET' && pagePath) {
        const filePath = resolveStaticFile(publicRoot, pagePath);
        if (!fs.existsSync(filePath)) {
          sendJson(res, 404, { error: 'not_found' });
          return;
        }
        sendFile(res, filePath, staticContentType(filePath));
        return;
      }

      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'lifecoach-console' });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/sign-up') {
        const body = await readJsonBody(req);
        const result = registerUser(body, env);
        sendJson(res, 201, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/sign-in') {
        const body = await readJsonBody(req);
        const result = signInUser(body, env);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/me') {
        const session = requireSession(req, env);
        sendJson(res, 200, {
          user: session.user,
          entitlements: session.entitlements,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/me/usage') {
        const session = requireSession(req, env);
        sendJson(res, 200, getUsageSummary(session.user.id, env));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/keys') {
        const session = requireSession(req, env);
        sendJson(res, 200, {
          items: listApiKeys(session.user.id, env),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/keys') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const result = createApiKey(session.user.id, body, env);
        sendJson(res, 201, result);
        return;
      }

      const revokeParams = matchPath(pathname, '/api/keys/:id/revoke');
      if (req.method === 'POST' && revokeParams) {
        const session = requireSession(req, env);
        const result = revokeApiKey(session.user.id, revokeParams.id, env);
        sendJson(res, 200, { apiKey: result });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/models') {
        const session = requireSession(req, env);
        sendJson(res, 200, {
          items: buildModelCatalog(session.entitlements),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/integration/openclaw') {
        const session = requireSession(req, env);
        const keys = listApiKeys(session.user.id, env);
        const latestKey = keys.find((item) => item.status === 'active') || null;
        const gatewayBaseUrl = getGatewayPublicBaseUrl(env, gatewayPort);
        sendJson(res, 200, {
          gatewayBaseUrl,
          hasActiveKey: Boolean(latestKey),
          snippet: buildOpenClawSnippet(latestKey ? `${latestKey.prefix}...` : null, gatewayBaseUrl),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/chat/completions') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const result = await finalizeChatCompletion(body, {
          user: session.user,
          entitlements: session.entitlements,
        }, env);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/chat/plan/start') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const questionnaire = await generatePlanQuestionnaire(body.seedText || '', env);
        sendJson(res, 200, {
          questionnaire,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/chat/todo/generate') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!hasEnoughTodoContext(messages)) {
          sendJson(res, 400, { error: 'todo_context_insufficient' });
          return;
        }
        const todoList = await generateCoachTodoList(messages, {
          user: session.user,
          entitlements: session.entitlements,
        }, {
          sidebarSummary: body.sidebarSummary || '',
          lastAssistantText: body.lastAssistantText || '',
        }, env);
        sendJson(res, 200, { todoList });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/images/generations') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const result = await generateImageAsset({
          prompt: body.prompt,
          size: body.size,
        }, env);
        sendJson(res, result.ok ? 200 : 400, {
          ok: result.ok,
          imageUrl: result.imageUrl || null,
          source: result.source,
          error: result.error || null,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/audio/speech') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const result = await synthesizeSpeechAsset({
          text: body.text,
          voice: body.voice,
          format: body.format,
        }, env);
        if (!result.ok || !Buffer.isBuffer(result.audio)) {
          sendJson(res, 400, {
            ok: false,
            source: result.source,
            error: result.error || 'speech_failed',
          });
          return;
        }
        res.writeHead(200, {
          'Content-Type': result.contentType || 'audio/wav',
        });
        res.end(result.audio);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/audio/transcriptions') {
        const session = requireSession(req, env);
        const body = await readJsonBody(req);
        const result = await transcribeAudioAsset({
          audioDataUrl: body.audioDataUrl,
          language: body.language,
          transcriptHint: body.transcriptHint,
        }, env);
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      const statusCode = error && error.message === 'unauthorized' ? 401 : 400;
      sendJson(res, statusCode, {
        error: error && error.message ? error.message : 'unexpected_error',
      });
    }
  };
}

function startConsoleServer(options = {}) {
  const port = options.port ?? Number(process.env.LIFECOACH_CONSOLE_PORT || 3200);
  const server = createConsoleServer(options);
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port: server.address().port }));
  });
}

if (require.main === module) {
  loadEnvFiles([
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', 'gateway', '.env'),
  ]);
  startConsoleServer().then(({ port }) => {
    console.log(`lifecoach-console listening on http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createConsoleHandler,
  createConsoleServer,
  startConsoleServer,
};
