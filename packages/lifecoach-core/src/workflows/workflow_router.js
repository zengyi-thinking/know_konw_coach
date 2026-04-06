const fs = require('fs');
const path = require('path');
const { resolveWorkspaceRoot } = require('../paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadWorkflowDefinitions(env = process.env, workspaceOverride) {
  const workspaceRoot = resolveWorkspaceRoot(env, workspaceOverride);
  const workflowsDir = path.join(workspaceRoot, '.lifecoach', 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    return [];
  }

  return fs.readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(workflowsDir, name)));
}

function detectLongHorizonConfusion(input = {}, route = {}, userProfile = {}) {
  const text = `${input.text || ''} ${(input.sceneTags || []).join(' ')} ${userProfile.pattern || ''} ${userProfile.longTermGoal || ''}`.toLowerCase();
  const routeSkill = route.primarySkill || '';
  const confusionKeywords = [
    '一直很迷茫',
    '长期很迷茫',
    '不知道自己到底想要什么',
    '总觉得没有方向',
    '这些年一直很乱',
    '方向很多',
    '不知道从哪开始',
    '反复卡住',
    '为什么总是这样',
    '父母认可',
    '怎么做都不够好'
  ].map((item) => item.toLowerCase());

  const sceneTags = Array.isArray(input.sceneTags) ? input.sceneTags : [];
  const sceneMatch = sceneTags.includes('goal_clarity') || sceneTags.includes('long_term_confusion');
  const keywordMatch = confusionKeywords.some((item) => text.includes(item));
  const routeMatch = ['goal-clarify', 'coach-intake', 'emotional-debrief'].includes(routeSkill);

  return keywordMatch || (sceneMatch && routeMatch);
}

function resolveLongHorizonConfusionStage(input = {}, route = {}, userProfile = {}) {
  const text = `${input.text || ''} ${userProfile.pattern || ''}`.toLowerCase();

  if (['emotion', 'trigger'].some((tag) => (input.sceneTags || []).includes(tag)) || ['难受', '焦虑', '压力', '缓不过来'].some((item) => text.includes(item))) {
    return 'stabilize';
  }

  if (['为什么总是这样', '一直重复', '反复', '父母', '不够好'].some((item) => text.includes(item)) || userProfile.pattern) {
    return 'diagnose_pattern';
  }

  if (['怎么落地', '下一步是什么', '动不了', '知道问题了'].some((item) => text.includes(item))) {
    return 'action_bridge';
  }

  if ((input.sceneTags || []).includes('review')) {
    return 'timeline_review';
  }

  return 'clarify';
}

function buildWorkflowState(session, route, env = process.env, workspaceOverride) {
  const definitions = loadWorkflowDefinitions(env, workspaceOverride);
  const active = detectLongHorizonConfusion(session.input || {}, route || {}, session.userProfile || {});
  if (!active) {
    return null;
  }

  const workflow = definitions.find((item) => item.id === 'long-horizon-confusion');
  if (!workflow) {
    return null;
  }

  const stageId = resolveLongHorizonConfusionStage(session.input || {}, route || {}, session.userProfile || {});
  const stage = (workflow.stages || []).find((item) => item.id === stageId) || workflow.stages[0] || null;

  return {
    id: workflow.id,
    title: workflow.title,
    stageId,
    stageDescription: stage ? stage.description : '',
    priorityKnowledgeIds: Array.from(new Set([
      ...(workflow.sharedKnowledgeIds || []),
      ...(stage ? stage.priorityKnowledgeIds || [] : []),
    ])),
    externalInspirations: workflow.externalInspirations || [],
  };
}

module.exports = {
  loadWorkflowDefinitions,
  buildWorkflowState,
};
