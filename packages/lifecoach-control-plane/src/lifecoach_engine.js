const path = require('path');
const crypto = require('crypto');
const { runSession } = require('../../lifecoach-core/src');

function resolveWorkspaceRootForControlPlane() {
  return path.resolve(__dirname, '..', '..', 'lifecoach-workspace', 'content');
}

function resolveControlPlaneStateRoot(env = process.env) {
  if (env.LIFECOACH_CONTROL_PLANE_STATE_ROOT) {
    return path.resolve(env.LIFECOACH_CONTROL_PLANE_STATE_ROOT);
  }

  if (env.LIFECOACH_CONTROL_PLANE_DATA) {
    return path.join(path.dirname(path.resolve(env.LIFECOACH_CONTROL_PLANE_DATA)), 'state');
  }

  return path.join(path.resolve(__dirname, '..', '..', '..'), '.control-plane-state');
}

function buildUserTextFromMessages(messages = []) {
  const last = [...messages].reverse().find((item) => item.role === 'user');
  if (!last) {
    return { text: '', modality: 'text', imageUrl: null };
  }

  if (Array.isArray(last.content)) {
    const textPart = last.content.find((item) => item.type === 'text');
    const imagePart = last.content.find((item) => item.type === 'image_url');
    return {
      text: textPart ? textPart.text : '用户上传了一张图片，请先理解图片再进行教练回应。',
      modality: imagePart ? 'image' : 'text',
      imageUrl: imagePart && imagePart.image_url ? imagePart.image_url.url : null,
    };
  }

  return {
    text: String(last.content || ''),
    modality: 'text',
    imageUrl: null,
  };
}

function buildCerebellum(result, input, entitlements) {
  const enabled = Boolean(entitlements && entitlements.featureCerebellum);
  const focus = result.route.primarySkill;
  const trace = [
    `safety:${result.safety.riskLevel}`,
    `route:${focus}`,
    `knowledge:${(result.knowledgeHits || []).map((item) => item.id).join(',') || 'none'}`,
    `policy:r${result.adaptivePolicy.rationalWeight}-e${result.adaptivePolicy.emotionalWeight}`,
  ];

  if (input.modality === 'image') {
    trace.push('multimodal:image');
  }
  if (input.modality === 'audio') {
    trace.push('multimodal:audio');
  }

  return {
    enabled,
    focus,
    trace,
    recommendation: enabled
      ? `优先按 ${focus} 的流程回应，并保持 ${result.safety.riskLevel} 风险边界。`
      : '小脑未启用，使用标准教练流程。',
  };
}

function buildCoachMessage(result, input, cerebellum) {
  if (result.safety.needsSafetyMode) {
    return [
      '这件事我先不按普通 coaching 推进。',
      '我更建议先保证你眼前的现实安全，再考虑后续支持。',
      `当前识别到的风险级别是：${result.safety.riskLevel}。`,
    ].join('\n');
  }

  const lead = input.modality === 'image'
    ? '我先结合你给的图片线索和文字需求来抓重点。'
    : input.modality === 'audio'
      ? '我先把你的语音内容收束成一个清晰重点。'
      : '我先帮你把当前问题收束成一个可推进的重点。';

  const knowledgeLine = result.knowledgeHits.length
    ? `我会参考这些知识块：${result.knowledgeHits.map((item) => item.title).join('、')}。`
    : '这次我先尽量用最轻量的教练路径，不额外堆太多框架。';

  const action = result.route.primarySkill === 'goal-clarify'
    ? '下一步建议先把你真正想改变的结果说成一句可验证的话。'
    : result.route.primarySkill === 'emotional-debrief'
      ? '下一步建议先把这次触发你情绪的具体事件单独拎出来。'
      : result.route.primarySkill === 'weekly-review'
        ? '下一步建议先只总结这一周最重要的一个推进和一个阻碍。'
        : result.route.primarySkill === 'habit-reset'
          ? '下一步建议先恢复一个最小动作，而不是重建整套计划。'
          : '下一步建议先确认这次你最想解决的是哪一个具体点。';

  const cerebellumLine = cerebellum.enabled
    ? `小脑辅助判断：${cerebellum.recommendation}`
    : '当前未启用小脑增强，使用标准教练逻辑。';

  return [
    lead,
    `当前主 skill：${result.route.primarySkill}。`,
    knowledgeLine,
    action,
    cerebellumLine,
  ].join('\n');
}

function summarizeUserGoal(text = '') {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '当前这个问题';
  return compact.length > 28 ? `${compact.slice(0, 28)}...` : compact;
}

function buildPlanMessage(result, input, cerebellum) {
  const goal = summarizeUserGoal(input.text);
  const route = result.route.primarySkill;

  const routeSteps = route === 'goal-clarify'
    ? [
      `先把“${goal}”收束成一句你真正想达成的结果。`,
      '把会影响你判断的限制条件单独列出来，不跟目标混在一起。',
      '只保留一个本周内能验证方向的小动作。',
    ]
    : route === 'emotional-debrief'
      ? [
        `先把和“${goal}”最相关的触发事件单独拎出来。`,
        '把事件、情绪和你脑中冒出的解释分开写。',
        '只决定一个先稳住自己的动作，再谈后续推进。',
      ]
      : route === 'habit-reset'
        ? [
          `先把“${goal}”降成一个低门槛版本。`,
          '把触发时机固定下来，不靠临时意志。',
          '只追踪连续完成，而不是一次做很多。',
        ]
        : [
          `先定义“${goal}”里最需要先解决的一层。`,
          '把当前最大阻力说清楚，别同时处理所有问题。',
          '先做一个今天就能开始的最小动作，再根据结果迭代。',
        ];

  return [
    '我先按你的问题整理成一个可执行计划：',
    `目标聚焦：${goal}`,
    '建议步骤：',
    ...routeSteps.map((step, index) => `${index + 1}. ${step}`),
    `先做第一步：${routeSteps[0]}`,
    `辅助判断：${cerebellum.recommendation}`,
  ].join('\n');
}

function createSessionInput(body) {
  const extracted = buildUserTextFromMessages(body.messages || []);
  return {
    sessionId: `cp_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    input: {
      text: extracted.text,
      modality: body.modality || extracted.modality || 'text',
      imageUrl: body.imageUrl || extracted.imageUrl || null,
      sceneTags: Array.isArray(body.sceneTags) ? body.sceneTags : [],
    },
  };
}

function runLifecoachConversation(body, env, context = {}) {
  const session = createSessionInput(body);
  const stateRoot = context.stateRoot || resolveControlPlaneStateRoot(env);
  const workspaceRoot = context.workspaceRoot || resolveWorkspaceRootForControlPlane();
  const result = runSession(session, {
    env: {
      ...process.env,
      ...env,
      LIFECOACH_WORKSPACE_ROOT: workspaceRoot,
      LIFECOACH_STATE_ROOT: stateRoot,
    },
    workspaceRoot,
    disableUpstreamExecution: true,
    persistArtifacts: true,
  });

  const cerebellum = buildCerebellum(result, session.input, context.entitlements);
  const assistantMessage = context.uiMode === 'plan'
    ? buildPlanMessage(result, session.input, cerebellum)
    : buildCoachMessage(result, session.input, cerebellum);

  return {
    session,
    result,
    cerebellum,
    assistantMessage,
  };
}

module.exports = {
  runLifecoachConversation,
  resolveControlPlaneStateRoot,
  resolveWorkspaceRootForControlPlane,
};
