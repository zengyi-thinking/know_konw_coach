const crypto = require('crypto');
const { runLifecoachConversation } = require('./lifecoach_engine');
const { maybeProxyLifecoachChat } = require('./upstream_lifecoach_chat');
const { inferSemanticIntent } = require('./intent_classifier');
const { generateImageAsset } = require('./multimodal_surface');
const { generateClarifyQuestionnaire, buildPlanSummary } = require('./plan_questionnaire');

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

function buildTextualResponse(flow, body, authContext) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastInput = extractLastUserInput(messages);

  return {
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
      choiceCard: null,
      choiceFlowState: null,
      planQuestionnaire: null,
      processing: {
        modality: body.modality || lastInput.modality,
        capabilityIntent: 'chat',
        upstreamUsed: false,
        upstreamError: null,
        generatedImageUrl: null,
        persistedArtifacts: flow.result.persistence ? flow.result.persistence.files : [],
      },
    },
  };
}

function buildImageGenerationResponse(prompt, imageResult) {
  return {
    id: `chatcmpl_${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'lifecoach-image',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: imageResult.source === 'upstream-image-model'
            ? '我先根据你的描述生成了一张图。如果你想继续改，直接告诉我你想改哪一层。'
            : '我先做了一张示意图。如果你想继续改，直接告诉我你想改哪一层。',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.max(12, String(prompt || '').length),
      completion_tokens: 28,
      total_tokens: Math.max(40, String(prompt || '').length + 28),
    },
    lifecoach: {
      mode: 'enhanced',
      route: { primarySkill: 'vision-reflection', fallback: 'goal-clarify', rankedSkills: [] },
      workflow: null,
      safety: { riskLevel: 'low', allowCoaching: true, needsSafetyMode: false, matchedRuleId: null },
      knowledgeHits: [],
      adaptivePolicy: null,
      flavorScores: null,
      timelineOutcome: null,
      flavorOptimization: null,
      cerebellum: { enabled: false, focus: 'image', trace: ['image_generation'], recommendation: '图像生成由多模态能力完成。' },
      choiceCard: null,
      choiceFlowState: null,
      planQuestionnaire: null,
      processing: {
        modality: 'image',
        capabilityIntent: 'image_generation',
        upstreamUsed: imageResult.source === 'upstream-image-model',
        upstreamError: imageResult.error || null,
        generatedImageUrl: imageResult.imageUrl || null,
        persistedArtifacts: [],
      },
    },
  };
}

function buildPlanQuestionnaireResponse(flow, body, questionnaire) {
  return {
    id: `chatcmpl_${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: body.model || 'lifecoach-core',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: questionnaire.summary || '我先根据你的问题整理了三张计划卡片，请一次性填完，我再继续。',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 18,
      completion_tokens: 24,
      total_tokens: 42,
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
      choiceCard: null,
      choiceFlowState: null,
      planQuestionnaire: questionnaire,
      processing: {
        modality: body.modality || 'text',
        capabilityIntent: 'plan_intake',
        upstreamUsed: false,
        upstreamError: null,
        generatedImageUrl: null,
        persistedArtifacts: flow.result.persistence ? flow.result.persistence.files : [],
        uiMode: 'plan',
      },
    },
  };
}

async function finalizePlanFromAnswers(body, authContext, env, options = {}) {
  const planResponseState = body.planResponseState || {};
  const questionnaire = planResponseState.questionnaire;
  const answers = planResponseState.answers || {};
  const summary = buildPlanSummary(questionnaire, answers);
  const originalMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = originalMessages.length && extractLastUserInput(originalMessages).userText.includes('我补充了这三张计划卡片')
    ? originalMessages
    : [...originalMessages, { role: 'user', content: summary }];
  const lastInput = extractLastUserInput(messages);
  const flow = runLifecoachConversation({
    messages,
    modality: body.modality || lastInput.modality,
    imageUrl: body.imageUrl || lastInput.imageUrl,
  }, env, {
    entitlements: authContext.entitlements,
    workspaceRoot: options.workspaceRoot,
    stateRoot: options.stateRoot,
    uiMode: 'plan',
  });

  const response = buildTextualResponse(flow, { ...body, messages }, authContext);
  response.lifecoach.processing.capabilityIntent = 'plan';
  response.lifecoach.processing.uiMode = 'plan';

  const upstream = await maybeProxyLifecoachChat(flow, { ...body, messages }, env, { uiMode: 'plan', planStage: 'final' });
  const upstreamContent = upstream.ok
    ? upstream.data?.choices?.[0]?.message?.content
    : null;
  if (upstreamContent) {
    response.choices[0].message.content = upstreamContent;
  }
  response.lifecoach.processing.upstreamUsed = upstream.used && upstream.ok;
  response.lifecoach.processing.upstreamError = upstream.used && !upstream.ok ? upstream.error : null;
  response.lifecoach.processing.modelSource = upstream.used && upstream.ok ? 'upstream-relay' : 'local-core-fallback';
  response.lifecoach.processing.intentSource = 'plan_questionnaire_submission';
  return response;
}

async function finalizeChatCompletion(body, authContext, env, options = {}) {
  const uiMode = body.uiMode === 'plan' ? 'plan' : 'chat';
  const intent = await inferSemanticIntent(body, env);
  const responseMode = uiMode === 'plan' && intent.type === 'image_understanding' ? 'chat' : uiMode;

  if (body.planResponseState?.mode === 'bulk_questionnaire' && uiMode === 'plan') {
    return finalizePlanFromAnswers(body, authContext, env, options);
  }

  if (intent.type === 'image_generation') {
    if (!authContext.entitlements?.featureImage) {
      throw new Error('feature_not_enabled:featureImage');
    }
    const imageResult = await generateImageAsset({
      prompt: intent.userText,
      size: '1024x1024',
    }, env);
    return buildImageGenerationResponse(intent.userText, imageResult);
  }

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
    uiMode: responseMode,
  });

  if (uiMode === 'plan' && !['image_generation', 'image_understanding'].includes(intent.type)) {
    const questionnaire = await generateClarifyQuestionnaire(intent.userText || lastInput.userText || '', env);
    return buildPlanQuestionnaireResponse(flow, body, questionnaire);
  }

  const response = buildTextualResponse(flow, body, authContext);
  response.lifecoach.processing.capabilityIntent = responseMode === 'plan' ? 'plan' : intent.type;
  response.lifecoach.processing.uiMode = responseMode;

  const upstream = await maybeProxyLifecoachChat(flow, body, env, { uiMode: responseMode });
  const upstreamContent = upstream.ok
    ? upstream.data?.choices?.[0]?.message?.content
    : null;
  if (upstreamContent) {
    response.choices[0].message.content = upstreamContent;
  }
  response.lifecoach.processing.upstreamUsed = upstream.used && upstream.ok;
  response.lifecoach.processing.upstreamError = upstream.used && !upstream.ok ? upstream.error : null;
  response.lifecoach.processing.modelSource = upstream.used && upstream.ok ? 'upstream-relay' : 'local-core-fallback';
  response.lifecoach.processing.intentSource = intent.reason || 'rule';
  return response;
}

module.exports = {
  buildTextualResponse,
  finalizeChatCompletion,
};
