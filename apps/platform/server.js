#!/usr/bin/env node
const http = require('http');
const path = require('path');
const { createConsoleHandler } = require('../console/server');
const { createGatewayHandler } = require('../gateway/server');
const { loadEnvFiles } = require('../../packages/lifecoach-control-plane/src/env_loader');

function createPlatformServer(options = {}) {
  const env = options.env || process.env;
  const port = options.gatewayPort ?? Number(env.PORT || env.LIFECOACH_PLATFORM_PORT || 8080);
  const consoleHandler = createConsoleHandler({
    ...options,
    env: {
      ...env,
      LIFECOACH_GATEWAY_PUBLIC_BASE_URL: env.LIFECOACH_GATEWAY_PUBLIC_BASE_URL || '',
    },
    gatewayPort: port,
  });
  const gatewayHandler = createGatewayHandler({
    ...options,
    env,
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        service: 'lifecoach-platform',
      }, null, 2));
      return;
    }

    if (url.pathname.startsWith('/v1/')) {
      await gatewayHandler(req, res);
      return;
    }

    await consoleHandler(req, res);
  });

  return { server, port };
}

function startPlatformServer(options = {}) {
  const platform = createPlatformServer(options);
  return new Promise((resolve) => {
    platform.server.listen(platform.port, () => {
      resolve({ server: platform.server, port: platform.server.address().port });
    });
  });
}

if (require.main === module) {
  loadEnvFiles([
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', 'gateway', '.env'),
  ]);
  startPlatformServer().then(({ port }) => {
    console.log(`lifecoach-platform listening on http://0.0.0.0:${port}`);
  });
}

module.exports = {
  createPlatformServer,
  startPlatformServer,
};
