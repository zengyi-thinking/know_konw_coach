#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startPlatformServer } = require('../apps/platform/server');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, data };
}

async function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecoach-platform-'));
  const env = {
    ...process.env,
    PORT: '0',
    LIFECOACH_PLATFORM_PORT: '0',
    LIFECOACH_CONTROL_PLANE_DATA: path.join(tempRoot, 'control-plane.json'),
    LIFECOACH_CONTROL_PLANE_STATE_ROOT: path.join(tempRoot, 'state'),
  };

  const platform = await startPlatformServer({ env, gatewayPort: 0 });
  const baseUrl = `http://127.0.0.1:${platform.port}`;

  try {
    const health = await request(`${baseUrl}/healthz`);
    assert(health.response.status === 200, 'platform health failed');

    const signUp = await request(`${baseUrl}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'platform@example.com',
        password: 'pass-123456',
        displayName: 'Platform User',
      }),
    });
    assert(signUp.response.status === 201, 'platform sign up failed');
    const token = signUp.data.sessionToken;

    const createKey = await request(`${baseUrl}/api/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Platform Key' }),
    });
    assert(createKey.response.status === 201, 'platform api key create failed');
    const rawKey = createKey.data.rawKey;

    const chat = await request(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '我最近很乱，先帮我抓一个重点。' }],
      }),
    });
    assert(chat.response.status === 200, 'platform chat failed');
    assert(chat.data.lifecoach.cerebellum.enabled === true, 'platform cerebellum missing');

    const integration = await request(`${baseUrl}/api/integration/openclaw`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(integration.response.status === 200, 'platform integration failed');
    assert(String(integration.data.snippet).includes('LIFECOACH_GATEWAY_BASE_URL'), 'platform snippet missing');

    console.log(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      assertions: [
        'platform health ok',
        'platform sign up ok',
        'platform api key ok',
        'platform enhanced chat ok',
        'platform integration snippet ok',
      ],
    }, null, 2));
  } finally {
    await new Promise((resolve) => platform.server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
