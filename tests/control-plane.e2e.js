#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startConsoleServer } = require('../apps/console/server');
const { startGatewayServer } = require('../apps/gateway/server');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, data };
}

async function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecoach-control-plane-'));
  const env = {
    ...process.env,
    LIFECOACH_CONTROL_PLANE_DATA: path.join(tempRoot, 'control-plane.json'),
  };

  const gateway = await startGatewayServer({ port: 0, env });
  const consoleApp = await startConsoleServer({
    port: 0,
    env: {
      ...env,
      LIFECOACH_GATEWAY_PUBLIC_BASE_URL: `http://127.0.0.1:${gateway.port}`,
    },
    gatewayPort: gateway.port,
  });

  try {
    const baseConsole = `http://127.0.0.1:${consoleApp.port}`;
    const baseGateway = `http://127.0.0.1:${gateway.port}`;

    const signUp = await requestJson(`${baseConsole}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'coach@example.com',
        password: 'pass-123456',
        displayName: 'Coach Tester',
      }),
    });
    assert(signUp.response.status === 201, 'sign up failed');
    assert(signUp.data.sessionToken, 'missing sign up session token');

    const signIn = await requestJson(`${baseConsole}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'coach@example.com',
        password: 'pass-123456',
      }),
    });
    assert(signIn.response.status === 200, 'sign in failed');
    const sessionToken = signIn.data.sessionToken;

    const me = await requestJson(`${baseConsole}/api/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(me.data.user.email === 'coach@example.com', 'me endpoint returned wrong user');

    const createKey = await requestJson(`${baseConsole}/api/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ name: 'Primary OpenClaw Key' }),
    });
    assert(createKey.response.status === 201, 'create api key failed');
    assert(createKey.data.rawKey.startsWith('lc_live_'), 'api key format invalid');
    const rawKey = createKey.data.rawKey;
    const keyId = createKey.data.apiKey.id;

    const models = await requestJson(`${baseConsole}/api/models`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(models.data.items.some((item) => item.type === 'vision' && item.available === true), 'vision model not available');

    const integration = await requestJson(`${baseConsole}/api/integration/openclaw`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(String(integration.data.snippet).includes('LIFECOACH_GATEWAY_BASE_URL'), 'integration snippet missing gateway base url');

    const consoleChat = await requestJson(`${baseConsole}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '我最近一直很迷茫，不知道自己到底想要什么。' },
        ],
      }),
    });
    assert(consoleChat.response.status === 200, 'console chat failed');
    assert(consoleChat.data.lifecoach.workflow?.id === 'long-horizon-confusion', 'console chat workflow missing');
    assert(consoleChat.data.lifecoach.flavorScores?.overall >= 0, 'console chat flavor score missing');
    assert(consoleChat.data.lifecoach.choiceCard === null, 'console chat should not auto-start cards');
    assert(consoleChat.data.lifecoach.choiceFlowState === null, 'console chat should not auto-start choiceFlow');

    const consoleFreeChat = await requestJson(`${baseConsole}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        uiMode: 'chat',
        messages: [
          { role: 'user', content: '我最近一直很迷茫，不知道自己到底想要什么。' },
        ],
      }),
    });
    assert(consoleFreeChat.response.status === 200, 'console free chat failed');
    assert(consoleFreeChat.data.lifecoach.choiceCard === null, 'console free chat should not return choiceCard');
    assert(consoleFreeChat.data.lifecoach.choiceFlowState === null, 'console free chat should not start choiceFlow');

    const consolePlan = await requestJson(`${baseConsole}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        uiMode: 'plan',
        messages: [
          { role: 'user', content: '我最近一直很迷茫，不知道自己到底想要什么。' },
        ],
      }),
    });
    assert(consolePlan.response.status === 200, 'console plan failed');
    assert(Array.isArray(consolePlan.data.lifecoach.planQuestionnaire?.questions) && consolePlan.data.lifecoach.planQuestionnaire.questions.length === 3, 'console plan should generate three questionnaire cards');
    assert(consolePlan.data.lifecoach.choiceCard === null, 'console plan should not use step-by-step choiceCard');

    const answers = Object.fromEntries(
      consolePlan.data.lifecoach.planQuestionnaire.questions.map((question) => [question.id, question.options?.[0]?.title || '默认回答']),
    );
    const finalizedPlan = await requestJson(`${baseConsole}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        uiMode: 'plan',
        messages: [
          { role: 'user', content: '我最近一直很迷茫，不知道自己到底想要什么。' },
          { role: 'assistant', content: consolePlan.data.choices[0].message.content },
        ],
        planResponseState: {
          mode: 'bulk_questionnaire',
          questionnaire: consolePlan.data.lifecoach.planQuestionnaire,
          answers,
        },
      }),
    });
    assert(finalizedPlan.response.status === 200, 'plan finalization failed');
    assert(finalizedPlan.data.lifecoach.planQuestionnaire === null, 'finalized plan should not return another questionnaire');
    assert(finalizedPlan.data.lifecoach.processing.capabilityIntent === 'plan', 'finalized plan should return plan intent');

    const consoleImageChat = await requestJson(`${baseConsole}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '请生成一张柔和粉橘色调、像玻璃球一样的情绪氛围图。' },
        ],
      }),
    });
    assert(consoleImageChat.response.status === 200, 'console image generation failed');
    assert(typeof consoleImageChat.data.lifecoach.processing.generatedImageUrl === 'string' && consoleImageChat.data.lifecoach.processing.generatedImageUrl.length > 20, 'console image generation missing generatedImageUrl');

    const speechResponse = await fetch(`${baseConsole}/api/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        text: '请把这段回复读出来。',
        voice: 'alloy',
        format: 'wav',
      }),
    });
    assert(speechResponse.status === 200, 'console speech endpoint failed');
    const speechBlobBuffer = Buffer.from(await speechResponse.arrayBuffer());
    assert(speechBlobBuffer.length > 0, 'console speech audio empty');

    const fakeAudioDataUrl = `data:audio/wav;base64,${Buffer.from('fake-audio').toString('base64')}`;
    const transcription = await requestJson(`${baseConsole}/api/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        audioDataUrl: fakeAudioDataUrl,
        language: 'zh',
        transcriptHint: '这是一条测试语音。',
      }),
    });
    assert(transcription.response.status === 200, 'console transcription endpoint failed');
    assert(typeof transcription.data.text === 'string' && transcription.data.text.length > 0, 'console transcription missing text');

    const chat = await requestJson(`${baseGateway}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a lifecoach assistant.' },
          { role: 'user', content: '我最近很乱，不知道从哪开始。' },
        ],
      }),
    });
    assert(chat.response.status === 200, 'enhanced chat failed');
    assert(chat.data.lifecoach.cerebellum.enabled === true, 'cerebellum not enabled');
    assert(chat.data.lifecoach.route.primarySkill === 'goal-clarify', 'route mismatch in enhanced chat');

    const imageChat = await requestJson(`${baseGateway}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '这张图让我很焦虑，帮我先看重点。' },
              { type: 'image_url', image_url: { url: 'https://example.com/demo.png' } },
            ],
          },
        ],
      }),
    });
    assert(imageChat.response.status === 200, 'image enhanced chat failed');
    assert(imageChat.data.lifecoach.processing.modality === 'image', 'image modality not processed');

    const asr = await requestJson(`${baseGateway}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        input: '我想用语音做一个快速 check-in。',
        language: 'zh',
      }),
    });
    assert(asr.response.status === 200, 'audio transcription failed');
    assert(asr.data.lifecoach.cerebellum.enabled === true, 'audio cerebellum missing');

    const gatewaySpeechResponse = await fetch(`${baseGateway}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        text: '请把这个建议读出来。',
        voice: 'alloy',
      }),
    });
    assert(gatewaySpeechResponse.status === 200, 'speech synthesis failed');
    const speechBuffer = Buffer.from(await gatewaySpeechResponse.arrayBuffer());
    assert(speechBuffer.length > 0, 'speech audio buffer empty');

    const cerebellum = await requestJson(`${baseGateway}/v1/cerebellum/think`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        text: '我一边想改变，一边又很拖延，你帮我先判断最合适的教练路径。',
      }),
    });
    assert(cerebellum.response.status === 200, 'cerebellum think failed');
    assert(Array.isArray(cerebellum.data.trace) && cerebellum.data.trace.length > 0, 'cerebellum trace missing');

    const usage = await requestJson(`${baseConsole}/api/me/usage`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(usage.data.totalRequests >= 5, 'usage summary did not record gateway calls');

    const revoke = await requestJson(`${baseConsole}/api/keys/${keyId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(revoke.response.status === 200, 'revoke api key failed');

    const revokedCall = await requestJson(`${baseGateway}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '这个 key 应该已经失效。' }],
      }),
    });
    assert(revokedCall.response.status === 401, 'revoked api key should fail');

    console.log(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      assertions: [
        'user registration ok',
        'user sign in ok',
        'api key create ok',
        'integration snippet ok',
        'console chat ok',
        'clarify multi-step ok',
        'console image generation ok',
        'console speech ok',
        'console transcription ok',
        'enhanced chat ok',
        'image enhanced chat ok',
        'audio transcription ok',
        'speech synthesis ok',
        'cerebellum think ok',
        'usage summary ok',
        'api key revoke ok',
      ],
    }, null, 2));
  } finally {
    await new Promise((resolve) => consoleApp.server.close(resolve));
    await new Promise((resolve) => gateway.server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
