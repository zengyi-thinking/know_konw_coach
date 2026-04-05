const fs = require('fs');
const path = require('path');
const { runSession } = require('../index');
const { processMemory } = require('../memory/memory_manager');
const { generatePatchProposal } = require('../evolution/patch_proposal_generator');
const { readGatewayConfig } = require('../gateway/config');
const { buildGatewayRequest } = require('../gateway/multimodal_adapter');
const { detectCapabilities } = require('../gateway/capability_detector');
const { executeChat } = require('../gateway/chat_executor');
const { executeAudioTranscription } = require('../gateway/audio_executor');

const workspaceRoot = path.join(__dirname, '..', '..', 'workspace');
const fixturesDir = path.join(__dirname, 'fixtures');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const tests = [];

  const goalFixture = loadJson('goal-clarify.json');
  const goal = runSession(goalFixture, { workspaceRoot, env: goalFixture.env, gatewayOptions: { mockResponse: { message: 'ok' } } });
  assert(goal.route.primarySkill === 'goal-clarify', 'goal-clarify 路由失败');
  tests.push('goal-clarify route ok');

  const emotional = runSession(loadJson('emotional-debrief.json'), { workspaceRoot, gatewayOptions: { mockResponse: { message: 'ok' } } });
  assert(emotional.route.primarySkill === 'emotional-debrief', 'emotional-debrief 路由失败');
  tests.push('emotional-debrief route ok');

  const weekly = runSession(loadJson('weekly-review.json'), { workspaceRoot, gatewayOptions: { mockResponse: { message: 'ok' } } });
  assert(weekly.route.primarySkill === 'weekly-review', 'weekly-review 路由失败');
  tests.push('weekly-review route ok');

  const habit = runSession(loadJson('habit-reset.json'), { workspaceRoot, gatewayOptions: { mockResponse: { message: 'ok' } } });
  assert(habit.route.primarySkill === 'habit-reset', 'habit-reset 路由失败');
  tests.push('habit-reset route ok');

  const safety = runSession(loadJson('safety-high-risk.json'), { workspaceRoot, gatewayOptions: { mockResponse: { message: 'ok' } } });
  assert(safety.safety.needsSafetyMode === true, 'safety 高风险识别失败');
  assert(safety.route.primarySkill === 'safety', 'safety override 失败');
  tests.push('safety override ok');

  const memoryConflict = loadJson('memory-conflict.json');
  const memoryResult = processMemory(memoryConflict.session, memoryConflict.existingMemories);
  assert(memoryResult.archives.length === 1, 'memory conflict archive 失败');
  assert(memoryResult.records.some((record) => record.content === '希望回应直接一点' && record.status === 'active'), 'memory new preference merge 失败');
  tests.push('memory conflict merge ok');

  const blockedProposal = generatePatchProposal({
    title: 'unsafe patch',
    reason: 'test guardrails',
    targets: ['workspace/knowledge/safety/coaching-boundary-001.md'],
    changes: []
  });
  assert(blockedProposal.guardrail.allowed === false, 'guardrail block 失败');
  tests.push('guardrail block ok');

  const gatewayFixture = loadJson('gateway-config.json');
  const gatewayConfig = readGatewayConfig(gatewayFixture.env);
  assert(gatewayConfig.isConfigured === true, 'gateway config 读取失败');
  assert(gatewayConfig.models.chat === 'gpt-4o', 'gateway chat model 读取失败');
  const imageGateway = buildGatewayRequest({ modality: 'image' }, gatewayFixture.env);
  assert(imageGateway.selectedModel === 'gemini-2.5-flash', 'gateway vision model 路由失败');
  const audioGateway = buildGatewayRequest({ modality: 'audio' }, gatewayFixture.env);
  assert(audioGateway.selectedModel === 'whisper-1', 'gateway audio model 路由失败');
  const disabledFixture = loadJson('gateway-disabled.json');
  const disabledCapabilities = detectCapabilities(disabledFixture.env);
  assert(disabledCapabilities.mode === 'basic', 'gateway disabled 模式识别失败');
  assert(disabledCapabilities.supports.image === false, 'gateway disabled image 能力识别失败');
  const enabledFixture = loadJson('gateway-enabled.json');
  const enabledCapabilities = detectCapabilities(enabledFixture.env);
  assert(enabledCapabilities.mode === 'enhanced', 'gateway enabled 模式识别失败');
  assert(enabledCapabilities.supports.audio === true, 'gateway enabled audio 能力识别失败');
  const keyOnlyFixture = loadJson('gateway-user-key-only.json');
  const keyOnlyConfig = readGatewayConfig(keyOnlyFixture.env);
  assert(keyOnlyConfig.isConfigured === true, 'key only 配置读取失败');
  assert(keyOnlyConfig.baseUrl === 'https://ai.t8star.cn/v1', '默认 baseUrl 读取失败');
  assert(keyOnlyConfig.models.chat === 'gpt-4o', '默认 chat model 读取失败');
  const chatResponse = await executeChat({ modality: 'text', text: 'hello' }, enabledFixture.env, { mockResponse: { id: 'chat-1' } });
  assert(chatResponse.ok === true && chatResponse.meta.apiKeyPresent === true, 'chat executor mock 调用失败');
  const asrResponse = await executeAudioTranscription({ modality: 'audio', audio: 'fake' }, enabledFixture.env, { mockResponse: { text: 'hi' } });
  assert(asrResponse.ok === true && asrResponse.meta.apiKeyPresent === true, 'audio executor mock 调用失败');
  tests.push('gateway env routing ok');
  tests.push('gateway capability detection ok');
  tests.push('gateway key-only config ok');
  tests.push('gateway executor mock ok');

  const summary = {
    success: true,
    passed: tests,
    checkedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));
}

run();
