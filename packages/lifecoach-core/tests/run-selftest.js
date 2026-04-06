const fs = require('fs');
const path = require('path');
const { requireRuntimeModule } = require('./require_runtime');
const { runSession } = requireRuntimeModule('../src', '..');
const { routeSkill, loadSkillRoutes } = requireRuntimeModule('../src/router/skill_router', '../router/skill_router');
const { retrieveKnowledge } = requireRuntimeModule('../src/retrieval/knowledge_retriever', '../retrieval/knowledge_retriever');
const { processMemory } = requireRuntimeModule('../src/memory/memory_manager', '../memory/memory_manager');
const { generatePatchProposal } = requireRuntimeModule('../src/evolution/patch_proposal_generator', '../evolution/patch_proposal_generator');
const { readGatewayConfig } = requireRuntimeModule('../src/gateway/config', '../gateway/config');
const { buildGatewayRequest } = requireRuntimeModule('../src/gateway/multimodal_adapter', '../gateway/multimodal_adapter');
const { detectCapabilities } = requireRuntimeModule('../src/gateway/capability_detector', '../gateway/capability_detector');
const { executeChat } = requireRuntimeModule('../src/gateway/chat_executor', '../gateway/chat_executor');
const { executeAudioTranscription } = requireRuntimeModule('../src/gateway/audio_executor', '../gateway/audio_executor');
const { checkFollowups } = requireRuntimeModule('../src/followup/followup_checker', '../followup/followup_checker');
const {
  resolveWorkspacePackageRoot,
  resolveWorkspaceRoot,
  resolveWorkspaceUserRoot,
  resolveWorkspaceManifestPath,
  resolveSelftestFixtureRoot,
  resolveStateRoot,
  resolveOpenClawRoot,
  resolveStateDirectories,
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

function persistedFilesBySuffix(files, suffix) {
  return files.filter((file) => file.endsWith(suffix));
}

function writeFixtureState(name, payload) {
  const filePath = path.join(expectedStateRoot, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

function resetTimelineFollowupState(timelineId) {
  const safeTimelineId = String(timelineId || '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const toolListPath = path.join(expectedStateRoot, 'tool-lists', `${safeTimelineId}.tool-list.json`);
  const followupPath = path.join(expectedStateRoot, 'followups', `${safeTimelineId}.followup.json`);
  if (fs.existsSync(toolListPath)) fs.unlinkSync(toolListPath);
  if (fs.existsSync(followupPath)) fs.unlinkSync(followupPath);
}

function writeTimelineFollowupState(fixture) {
  const safeTimelineId = String(fixture.toolList.timelineId || '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  writeFixtureState(path.join('tool-lists', `${safeTimelineId}.tool-list.json`), { toolList: fixture.toolList });
  writeFixtureState(path.join('followups', `${safeTimelineId}.followup.json`), { followup: fixture.followup });
}

async function run() {
  const governance = readLayerGovernance(process.env, workspaceRoot);
  const userWorkspaceRoot = resolveWorkspaceUserRoot(process.env, workspaceRoot);
  const runtimeState = resolveStateDirectories(process.env);
  ensureDir(workspaceRoot, 'workspaceRoot 不存在，OpenClaw 安装结构不完整');
  ensureDir(userWorkspaceRoot, 'workspace/.lifecoach-user 不存在');
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
  ensureDir(path.join(expectedStateRoot, 'tool-lists'), 'state/lifecoach/tool-lists 缺失');
  ensureDir(path.join(expectedStateRoot, 'followups'), 'state/lifecoach/followups 缺失');
  ensureDir(runtimeState.toolListsDir, 'runtime tool-lists 路径解析失败');
  ensureDir(runtimeState.followupsDir, 'runtime followups 路径解析失败');
  ensureDir(path.join(userWorkspaceRoot, 'memories'), 'workspace/.lifecoach-user/memories 缺失');
  ensureDir(path.join(userWorkspaceRoot, 'knowledge'), 'workspace/.lifecoach-user/knowledge 缺失');
  ensureDir(path.join(userWorkspaceRoot, 'skills'), 'workspace/.lifecoach-user/skills 缺失');
  ensureDir(path.join(userWorkspaceRoot, 'prompts'), 'workspace/.lifecoach-user/prompts 缺失');
  ensureDir(path.join(userWorkspaceRoot, 'notes'), 'workspace/.lifecoach-user/notes 缺失');

  const tests = [];
  const customManifest = JSON.parse(fs.readFileSync(workspaceManifestPath, 'utf8'));
  assert(customManifest.dynamicStateLinks.toolLists === 'state/lifecoach/tool-lists', 'workspace manifest 缺少 toolLists 动态状态映射');
  assert(customManifest.dynamicStateLinks.followups === 'state/lifecoach/followups', 'workspace manifest 缺少 followups 动态状态映射');
  tests.push('enhanced install structure ok');
  tests.push('followup state directories ok');
  tests.push('workspace manifest dynamic followup links ok');

  const customSkillDir = path.join(userWorkspaceRoot, 'skills', 'custom-clarify');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.writeFileSync(path.join(customSkillDir, 'route.json'), JSON.stringify({
    priority: 0,
    keywords: ['自定义澄清信号'],
    sceneTags: ['custom_overlay_scene'],
  }, null, 2));
  fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '# custom clarify\n', 'utf8');
  fs.writeFileSync(path.join(customSkillDir, 'response_schema.json'), JSON.stringify({ type: 'object' }, null, 2));

  const customKnowledgeDir = path.join(userWorkspaceRoot, 'knowledge', 'frameworks');
  fs.mkdirSync(customKnowledgeDir, { recursive: true });
  fs.writeFileSync(path.join(customKnowledgeDir, 'custom-clarity-001.json'), JSON.stringify({
    id: 'custom-clarity-001',
    title: '自定义澄清知识',
    summary: '用户自定义覆盖层知识',
    scenes: ['custom_overlay_scene'],
    keywords: ['自定义澄清信号'],
    recommendedSkills: ['custom-clarify'],
  }, null, 2));
  fs.writeFileSync(path.join(customKnowledgeDir, 'custom-clarity-001.md'), '这是用户自定义知识块。\n', 'utf8');

  const customRoutes = loadSkillRoutes(workspaceRoot, process.env);
  assert(customRoutes.some((item) => item.skill === 'custom-clarify'), 'workspace/.lifecoach-user 自定义 skill 未被加载');

  const customRoute = routeSkill({
    modality: 'text',
    text: '我现在遇到了自定义澄清信号，想收束一下。',
    sceneTags: ['custom_overlay_scene'],
  }, workspaceRoot, process.env);
  assert(customRoute.rankedSkills.some((item) => item.skill === 'custom-clarify'), 'workspace/.lifecoach-user 自定义 skill 未进入路由候选');

  const customKnowledge = retrieveKnowledge({
    modality: 'text',
    text: '我现在遇到了自定义澄清信号，想收束一下。',
    sceneTags: ['custom_overlay_scene'],
    primarySkill: 'custom-clarify',
  }, workspaceRoot, 3, { env: process.env });
  assert(customKnowledge.some((item) => item.id === 'custom-clarity-001'), 'workspace/.lifecoach-user 自定义 knowledge 未生效');
  tests.push('user custom overlay roots ok');

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
  assert(goal.flavorScores && goal.flavorScores.overall >= 70, 'flavor overall score 未生成或过低');
  assert(goal.flavorScores.dimensions.actionability.score >= 80, 'actionability score 计算异常');
  assert(goal.timelineOutcome && goal.timelineOutcome.status === 'active', 'timeline outcome default 状态异常');
  assert(goal.proposal === null, '普通会话不应默认生成治理 proposal');
  assert(goal.persistence && goal.persistence.files.length >= 4, 'dynamic state artifacts 持久化失败');
  assert(persistedFilesBySuffix(goal.persistence.files, '.event.json').length === 1, 'event artifact 持久化失败');
  assert(persistedFilesBySuffix(goal.persistence.files, '.timeline.json').length === 1, 'timeline artifact 持久化失败');
  assert(persistedFilesBySuffix(goal.persistence.files, '.review.json').length === 1, 'review artifact 持久化失败');
  assert(persistedFilesBySuffix(goal.persistence.files, '.memory.json').length === 1, 'memory artifact 持久化失败');
  const persistedEvent = JSON.parse(fs.readFileSync(persistedFilesBySuffix(goal.persistence.files, '.event.json')[0], 'utf8'));
  const goalToolListFiles = persistedFilesBySuffix(goal.persistence.files, '.tool-list.json');
  const goalFollowupFiles = persistedFilesBySuffix(goal.persistence.files, '.followup.json');
  assert(goalToolListFiles.length === 0, '默认目标澄清场景不应过早生成 tool list');
  assert(goalFollowupFiles.length === 0, '默认目标澄清场景不应过早生成 followup record');
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

  const longHorizonConfusion = runSession(loadJson('long-horizon-confusion.json'), {
    workspaceRoot,
    gatewayOptions: { mockResponse: { message: 'ok' } }
  });
  assert(longHorizonConfusion.workflow && longHorizonConfusion.workflow.id === 'long-horizon-confusion', 'long-horizon confusion workflow 未激活');
  assert(['clarify', 'diagnose_pattern', 'action_bridge', 'stabilize', 'timeline_review'].includes(longHorizonConfusion.workflow.stageId), 'workflow stage 异常');
  assert(longHorizonConfusion.knowledgeHits.some((item) => item.id === 'framework-goal-clarity-001'), 'goal-clarity knowledge 未召回');
  assert(longHorizonConfusion.knowledgeHits.some((item) => item.id === 'framework-diagnostic-onion-001' || item.id === 'case-family-seeking-parental-approval-001'), '长期迷茫相关知识未被优先召回');
  tests.push('long horizon confusion workflow ok');

  const lowActionability = runSession(loadJson('flavor-low-actionability.json'), {
    workspaceRoot,
    gatewayOptions: { mockResponse: { message: 'ok' } }
  });
  assert(lowActionability.flavorScores.dimensions.actionability.score < 70, '低 actionability 场景未被识别');
  assert(lowActionability.review.flavorOptimization.status === 'needs_tuning', 'flavor optimization 状态错误');
  assert(lowActionability.review.flavorOptimization.focus.some((item) => item.dimension === 'actionability'), 'flavor optimization 未聚焦 actionability');
  assert(lowActionability.review.flavorOptimization.focus.every((item) => ['decision_engine', 'skill_surface', 'user_model_memory'].includes(item.recommendation.targetLayer)), 'optimization target layer 越界');
  tests.push('flavor optimization loop ok');

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
  assert(feedbackSession.timelineOutcome.status === 'stalled', 'timeline feedback outcome 应为 stalled');
  assert(feedbackSession.timelineOutcome.followupMode === 'revise', 'timeline feedback followupMode 应为 revise');
  tests.push('timeline feedback loop ok');

  const timelineClosure = loadJson('timeline-closure.json');
  const closureSession = runSession(timelineClosure, {
    workspaceRoot,
    existingTimelines: timelineClosure.existingTimelines,
    gatewayOptions: { mockResponse: { message: 'ok' } }
  });
  assert(closureSession.timeline.activeTimeline.status === 'closed', 'timeline closure 失败');
  assert(closureSession.timeline.phase === 'closed', 'timeline closed phase 失败');
  assert(closureSession.timelineOutcome.status === 'closed', 'timeline closure outcome 应为 closed');
  tests.push('timeline closure ok');

  resetTimelineFollowupState('timeline-followup-1');
  const readyForAction = runSession(loadJson('followup-ready-for-action.json'), {
    workspaceRoot,
    gatewayOptions: { mockResponse: { message: 'ok' } },
    persistArtifacts: true,
  });
  assert(readyForAction.event.readinessSignal === 'ready_for_action', 'readiness signal 未捕获');
  assert(readyForAction.toolList && readyForAction.toolList.items.length === 1, 'ready-for-action 未生成 tool list');
  const readyToolListFiles = persistedFilesBySuffix(readyForAction.persistence.files, '.tool-list.json');
  const readyFollowupFiles = persistedFilesBySuffix(readyForAction.persistence.files, '.followup.json');
  assert(readyToolListFiles.length === 1, 'tool list 未持久化');
  assert(readyFollowupFiles.length === 1, 'followup record 未持久化');
  const readyToolList = JSON.parse(fs.readFileSync(readyToolListFiles[0], 'utf8'));
  assert(readyToolList.toolList.readinessSignal === 'ready_for_action', 'tool list readinessSignal 异常');
  tests.push('tool list generation ok');
  tests.push('tool list persistence ok');

  const stalledFixture = loadJson('followup-stalled.json');
  resetTimelineFollowupState(stalledFixture.toolList.timelineId);
  writeTimelineFollowupState(stalledFixture);
  const stalledCheck = checkFollowups({
    env: process.env,
    timelineId: stalledFixture.toolList.timelineId,
    now: stalledFixture.now,
    result: stalledFixture.result,
  });
  assert(stalledCheck.shouldPrompt === true, 'stalled followup 应触发主动询问');
  assert(stalledCheck.status === 'revision_prompt', 'stalled followup 状态应为 revision_prompt');
  assert(stalledCheck.prompt.includes('门槛再降一点'), 'revision followup 话术不符合预期');
  const stalledFollowupRecord = JSON.parse(fs.readFileSync(path.join(expectedStateRoot, 'followups', 'timeline-followup-stalled.followup.json'), 'utf8'));
  assert((stalledFollowupRecord.followup || stalledFollowupRecord).promptCount === 1, 'followup promptCount 未更新');
  tests.push('stalled followup trigger ok');

  const silentFixture = loadJson('followup-progress-silent.json');
  resetTimelineFollowupState(silentFixture.toolList.timelineId);
  writeTimelineFollowupState(silentFixture);
  const silentCheck = checkFollowups({
    env: process.env,
    timelineId: silentFixture.toolList.timelineId,
    now: silentFixture.now,
    result: { timelineOutcome: { status: 'active', followupMode: 'continue' } },
  });
  assert(silentCheck.shouldPrompt === false, 'progress 场景不应主动打扰');
  tests.push('progress followup silence ok');

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
  tests.push('flavor metrics scoring ok');

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
