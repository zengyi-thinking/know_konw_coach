const fs = require('fs');
const path = require('path');
const { runSession } = require('../index');
const { processMemory } = require('../memory/memory_manager');
const { generatePatchProposal } = require('../evolution/patch_proposal_generator');
const { readGatewayConfig } = require('../gateway/config');
const { buildGatewayRequest } = require('../gateway/multimodal_adapter');

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

function run() {
  const tests = [];

  const goal = runSession(loadJson('goal-clarify.json'), { workspaceRoot });
  assert(goal.route.primarySkill === 'goal-clarify', 'goal-clarify 路由失败');
  tests.push('goal-clarify route ok');

  const emotional = runSession(loadJson('emotional-debrief.json'), { workspaceRoot });
  assert(emotional.route.primarySkill === 'emotional-debrief', 'emotional-debrief 路由失败');
  tests.push('emotional-debrief route ok');

  const weekly = runSession(loadJson('weekly-review.json'), { workspaceRoot });
  assert(weekly.route.primarySkill === 'weekly-review', 'weekly-review 路由失败');
  tests.push('weekly-review route ok');

  const habit = runSession(loadJson('habit-reset.json'), { workspaceRoot });
  assert(habit.route.primarySkill === 'habit-reset', 'habit-reset 路由失败');
  tests.push('habit-reset route ok');

  const safety = runSession(loadJson('safety-high-risk.json'), { workspaceRoot });
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
  tests.push('gateway env routing ok');

  const summary = {
    success: true,
    passed: tests,
    checkedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));
}

run();
