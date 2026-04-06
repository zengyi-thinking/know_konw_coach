const crypto = require('crypto');
const { runLifecoachConversation } = require('./lifecoach_engine');
const { maybeProxyLifecoachChat } = require('./upstream_lifecoach_chat');

function extractLastUserInput(messages = []) {
  const last = [...messages].reverse().find((item) => item.role === 'user');
  if (!last) {
    return { modality: 'text', userText: '', imageUrl: null };
  }

  if (Array.isArray(last.content)) {
    const textPart = last.content.find((item) => item.type === 'text');
    const imagePart = last.content.find((item) => item.type === 'image_url');
    return {
      modality: imagePart ? 'image' : 'text',
      userText: textPart ? textPart.text : '',
      imageUrl: imagePart && imagePart.image_url ? imagePart.image_url.url : null,
    };
  }

  return {
    modality: 'text',
    userText: typeof last.content === 'string' ? last.content : '',
    imageUrl: null,
  };
}

function buildChatCompletion(body, authContext, env, options = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastInput = extractLastUserInput(messages);
  const flow = runLifecoachConversation({
    messages,
    modality: body.modality || lastInput.modality,
    imageUrl: body.imageUrl || lastInput.imageUrl,
  }, env, {
    entitlements: authContext.entitlements,
    workspaceRoot: options.workspaceRoot,
    stateRoot: options.stateRoot,
  });

  const response = {
    id: `chatcmpl_${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: body.model || 'lifecoach-core',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: flow.assistantMessage,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.max(12, lastInput.userText.length),
      completion_tokens: Math.max(40, flow.assistantMessage.length),
      total_tokens: Math.max(52, lastInput.userText.length + flow.assistantMessage.length),
    },
    lifecoach: {
      mode: 'enhanced',
      route: flow.result.route,
      workflow: flow.result.workflow || null,
      safety: flow.result.safety,
      knowledgeHits: flow.result.knowledgeHits.map((item) => ({
        id: item.id,
        title: item.title,
        score: item.score,
      })),
      adaptivePolicy: flow.result.adaptivePolicy,
      flavorScores: flow.result.flavorScores,
      timelineOutcome: flow.result.timelineOutcome,
      flavorOptimization: flow.result.flavorOptimization,
      cerebellum: flow.cerebellum,
      followups: buildFollowupOptions(flow),
      processing: {
        modality: body.modality || lastInput.modality,
        upstreamUsed: false,
        upstreamError: null,
        persistedArtifacts: flow.result.persistence ? flow.result.persistence.files : [],
      },
    },
  };

  return { flow, response };
}

function buildFollowupOptions(flow) {
  const workflow = flow.result.workflow;
  const route = flow.result.route.primarySkill;

  if (workflow?.id === 'long-horizon-confusion' && workflow.stageId === 'diagnose_pattern') {
    return [
      'A. 先聊最近一个让你最纠结的决定',
      'B. 先说说你最怕失去谁的认可',
      'C. 先区分这是你的目标，还是你替别人活出来的目标',
      'D. 先只找一个最小可行动作，不急着谈人生总方向',
    ];
  }

  if (route === 'goal-clarify') {
    return [
      'A. 我想先说清楚我真正想要的结果',
      'B. 我想先说说为什么总是卡住',
      'C. 我想先列一下我现有的资源',
      'D. 你直接帮我收束成一个最小行动',
    ];
  }

  if (route === 'emotional-debrief') {
    return [
      'A. 我想先说具体发生了什么',
      'B. 我想先说最刺到我的那句话',
      'C. 我想先理清我为什么会反应这么大',
      'D. 先帮我落到一个今天能做的小动作',
    ];
  }

  return [
    'A. 先帮我把问题说清楚',
    'B. 先帮我看我卡在哪里',
    'C. 先帮我收束成一个下一步',
    'D. 先帮我从时间线上看这件事',
  ];
}

async function finalizeChatCompletion(body, authContext, env, options = {}) {
  const built = buildChatCompletion(body, authContext, env, options);
  const upstream = await maybeProxyLifecoachChat(built.flow, body, env);
  const upstreamContent = upstream.ok
    ? upstream.data?.choices?.[0]?.message?.content
    : null;
  if (upstreamContent) {
    built.response.choices[0].message.content = upstreamContent;
  }
  built.response.lifecoach.processing.upstreamUsed = upstream.used && upstream.ok;
  built.response.lifecoach.processing.upstreamError = upstream.used && !upstream.ok ? upstream.error : null;
  built.response.lifecoach.processing.modelSource = upstream.used && upstream.ok ? 'upstream-relay' : 'local-core-fallback';
  return built.response;
}

module.exports = {
  buildChatCompletion,
  finalizeChatCompletion,
};
