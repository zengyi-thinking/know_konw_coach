const fs = require('fs');
const path = require('path');
const { requireRuntimeModule } = require('./require_runtime');
const { runSession } = requireRuntimeModule('../src', '..');
const { processMemory } = requireRuntimeModule('../src/memory/memory_manager', '../memory/memory_manager');
const { generatePatchProposal } = requireRuntimeModule('../src/evolution/patch_proposal_generator', '../evolution/patch_proposal_generator');
const { readGatewayConfig } = requireRuntimeModule('../src/gateway/config', '../gateway/config');
const { buildGatewayRequest } = requireRuntimeModule('../src/gateway/multimodal_adapter', '../gateway/multimodal_adapter');
const { detectCapabilities } = requireRuntimeModule('../src/gateway/capability_detector', '../gateway/capability_detector');
const { executeChat } = requireRuntimeModule('../src/gateway/chat_executor', '../gateway/chat_executor');
const { executeAudioTranscription } = requireRuntimeModule('../src/gateway/audio_executor', '../gateway/audio_executor');
const {
  resolveWorkspacePackageRoot,
  resolveWorkspaceRoot,
  resolveWorkspaceManifestPath,
  resolveSelftestFixtureRoot,
  resolveStateRoot,
  resolveOpenClawRoot,
} = requireRuntimeModule('../src/paths', '../paths');
const { readLayerGovernance, matchLayerByTarget } = requireRuntimeModule('../src/governance/layer_governance', '../governance/layer_governance');

const localWorkspaceRootCandidate = path.join(resolveWorkspacePackageRoot(process.env), 'content');
const workspaceRoot = fs.existsSync(localWorkspaceRootCandidate)
  ? localWorkspaceRootCandidate
  : resolveWorkspaceRoot(process.env);
const workspaceManifestPath = resolveWorkspaceManifestPath(process.env, workspaceRoot);
const fixturesDir = resolveSelftestFixtureRoot(process.env);
const expectedStateRoot = resolveStateRoot(process.env);
const appRoot = path.join(resolveOpenClawRoot(process.env), 'app', 'lifecoach');

function ensureFile(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message || `missing file: ${filePath}`);
  }
}

function ensureDir(dirPath, message) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(message || `missing directory: ${dirPath}`);
  }
}

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const governance = readLayerGovernance(process.env, workspaceRoot);
  ensureDir(workspaceRoot, 'workspaceRoot 不存在，OpenClaw 安装结构不完整');
  ensureDir(fixturesDir, 'selftest fixtures 不存在');
  ensureFile(workspaceManifestPath, 'workspace/.lifecoach/workspace.manifest.json 缺失');
  assert(governance && Array.isArray(governance.layers) && governance.layers.length > 0, 'layer governance 清单缺失');
  ensureFile(path.join(workspaceRoot, '.agents', 'life-coach.md'), 'workspace/.agents/life-coach.md 缺失');
  ensureDir(path.join(workspaceRoot, 'skills'), 'workspace/skills 缺失');
  ensureDir(path.join(workspaceRoot, 'knowledge', 'safety'), 'workspace/knowledge/safety 缺失');
  ensureFile(path.join(appRoot, 'config', 'lifecoach.gateway.defaults.json'), 'app/lifecoach/config/lifecoach.gateway.defaults.json 缺失');
  ensureFile(path.join(appRoot, 'config', 'evolution.policy.json'), 'app/lifecoach/config/evolution.policy.json 缺失');
  ensureDir(path.join(expectedStateRoot, 'events'), 'state/lifecoach/events 缺失');
  ensureDir(path.join(expectedStateRoot, 'timeline'), 'state/lifecoach/timeline 缺失');
  ensureDir(path.join(expectedStateRoot, 'reviews'), 'state/lifecoach/reviews 缺失');
  ensureDir(path.join(expectedStateRoot, 'memory-cache'), 'state/lifecoach/memory-cache 缺失');
  ensureDir(path.join(expectedStateRoot, 'proposals'), 'state/lifecoach/proposals 缺失');
  ensureDir(path.join(expectedStateRoot, 'system-reviews'), 'state/lifecoach/system-reviews 缺失');

  const tests = [];
  tests.push('enhanced install structure ok');

  const goalFixture = loadJson('goal-clarify.json');
  const goal = runSession(goalFixture, {
    workspaceRoot,
    env: { ...process.env, ...goalFixture.env },
    gatewayOptions: { mockResponse: { message: 'ok' } },
    persistArtifacts: true,
  });
  assert(goal.runtimePaths.workspaceRoot === workspaceRoot, 'runtime workspace path 解析失败');
  assert(goal.runtimePaths.state.root === expectedStateRoot, 'runtime state path 解析失败');
  assert(goal.workspaceBundle.manifest.skills.some((skill) => skill.id === 'goal-clarify'), 'workspace manifest 技能索引失败');
  assert(goal.arbitration.frontstageAgentId === 'life-coach', 'frontstage identity 漂移');
  assert(goal.arbitration.singleFrontstageIdentity === true, 'single frontstage identity 失效');
  assert(goal.route.primarySkill === 'goal-clarify', 'goal-clarify 路由失败');
  assert(goal.timeline.activeTimeline.id === 'timeline-1', '默认 timeline 创建失败');
  assert(typeof goal.adaptivePolicy.rationalWeight === 'number', 'adaptive policy 默认生成失败');
  assert(goal.proposal === null, '普通会话不应默认生成治理 proposal');
  assert(goal.persistence && goal.persistence.files.length === 4, 'dynamic state artifacts 持久化失败');
  const persistedEvent = JSON.parse(fs.readFileSync(goal.persistence.files[0], 'utf8'));
  assert(persistedEvent.workspaceRefs.selectedSkillPath === 'skills/goal-clarify/route.json', 'static/dynamic 链接失败');
  tests.push('goal-clarify route ok');
  tests.push('default timeline policy ok');
  tests.push('runtime path resolution ok');
  tests.push('workspace manifest and state persistence ok');
  tests.push('governance proposal remains backstage-only ok');

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

  const timelineFeedback = loadJson('timeline-feedback-loop.json');
  const feedbackSession = runSession(timelineFeedback, {
    workspaceRoot,
    existingTimelines: timelineFeedback.existingTimelines,
    gatewayOptions: { mockResponse: { message: 'ok' } }
  });
  assert(feedbackSession.timeline.activeTimeline.id === 'timeline-growth-1', 'timeline feedback 续接失败');
  assert(feedbackSession.timeline.phase === 'feedback', 'timeline feedback phase 失败');
  assert(feedbackSession.adaptivePolicy.emotionalWeight > feedbackSession.adaptivePolicy.rationalWeight, '负反馈后情感权重未提高');
  assert(feedbackSession.review.issues.includes('no_revision_after_failed_attempt'), '失败尝试后 review 信号缺失');
  tests.push('timeline feedback loop ok');

  const timelineClosure = loadJson('timeline-closure.json');
  const closureSession = runSession(timelineClosure, {
    workspaceRoot,
    existingTimelines: timelineClosure.existingTimelines,
    gatewayOptions: { mockResponse: { message: 'ok' } }
  });
  assert(closureSession.timeline.activeTimeline.status === 'closed', 'timeline closure 失败');
  assert(closureSession.timeline.phase === 'closed', 'timeline closed phase 失败');
  tests.push('timeline closure ok');

  const blockedProposal = generatePatchProposal({
    title: 'unsafe patch',
    reason: 'test guardrails',
    targets: ['workspace/knowledge/safety/coaching-boundary-001.md'],
    changes: [],
    env: process.env,
    workspaceRoot,
    requestedBy: 'reflection-reviewer',
    frontstageAgentId: 'life-coach',
  });
  assert(blockedProposal.guardrail.allowed === false, 'guardrail block 失败');
  const skillLayer = matchLayerByTarget(governance, 'workspace/skills/goal-clarify/route.json');
  assert(skillLayer && skillLayer.id === 'skill_surface', 'layer governance skill mapping 失败');
  tests.push('guardrail block ok');
  tests.push('layer governance mapping ok');

  const systemReviewProposal = generatePatchProposal({
    title: 'surface adapter tweak',
    reason: 'test system review workflow',
    targets: ['apps/gateway/server.js'],
    changes: [],
    env: process.env,
    workspaceRoot,
    requestedBy: 'reflection-reviewer',
    frontstageAgentId: 'life-coach',
  });
  assert(systemReviewProposal.guardrail.systemReviewRequired === true, 'system-review governance 未触发');
  assert(systemReviewProposal.systemReview && systemReviewProposal.systemReview.status === 'queued', 'system review request 未创建');
  tests.push('system review workflow skeleton ok');

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
