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

function buildQuestionnaireStepResponse(flow, body, questionnaire, stepIndex, answers = {}) {
  const question = questionnaire.questions[stepIndex];
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
          content: question.question,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 18,
      completion_tokens: 14,
      total_tokens: 32,
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
      choiceCard: {
        question: question.question,
        options: question.options,
        step: stepIndex + 1,
        total: questionnaire.questions.length,
      },
      choiceFlowState: {
        mode: 'clarify',
        questionnaire,
        stepIndex,
        answers,
      },
      processing: {
        modality: body.modality || 'text',
        capabilityIntent: 'clarify_with_choice_card',
        upstreamUsed: false,
        upstreamError: null,
        generatedImageUrl: null,
        persistedArtifacts: flow.result.persistence ? flow.result.persistence.files : [],
        uiMode: body.uiMode || 'auto',
      },
    },
  };
}

function shouldGeneratePlanCards(uiMode, intentType) {
  return uiMode === 'plan' && !['image_generation', 'image_understanding'].includes(intentType);
}

async function continueClarifyFlow(body, authContext, env, options = {}) {
  const flowState = body.choiceFlowState;
  const questionnaire = flowState.questionnaire;
  const currentQuestion = questionnaire.questions[flowState.stepIndex];
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastInput = extractLastUserInput(messages);
  const updatedAnswers = {
    ...(flowState.answers || {}),
    [currentQuestion.id]: lastInput.userText,
  };

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

  if (flowState.stepIndex + 1 < questionnaire.questions.length) {
    return buildQuestionnaireStepResponse(flow, body, questionnaire, flowState.stepIndex + 1, updatedAnswers);
  }

  const summary = buildPlanSummary(questionnaire, updatedAnswers);
  const summarizedFlow = runLifecoachConversation({
    messages: [
      ...messages,
      { role: 'user', content: summary },
    ],
    modality: 'text',
  }, env, {
    entitlements: authContext.entitlements,
    workspaceRoot: options.workspaceRoot,
    stateRoot: options.stateRoot,
    uiMode: 'plan',
  });

  const response = buildTextualResponse(summarizedFlow, body, authContext);
  response.choices[0].message.content = summarizedFlow.assistantMessage;
  response.lifecoach.processing.capabilityIntent = 'plan';
  response.lifecoach.processing.uiMode = 'plan';
  return response;
}

async function finalizeChatCompletion(body, authContext, env, options = {}) {
  const uiMode = body.uiMode === 'plan' ? 'plan' : 'chat';
  const intent = await inferSemanticIntent(body, env);
  const effectiveIntentType = intent.type === 'clarify_with_choice_card' ? 'chat' : intent.type;

  if (
    body.choiceFlowState?.mode === 'clarify'
    && body.choiceFlowState?.questionnaire
    && uiMode === 'plan'
  ) {
    return continueClarifyFlow(body, authContext, env, options);
  }

  if (effectiveIntentType === 'image_generation') {
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
    uiMode,
  });

  if (shouldGeneratePlanCards(uiMode, effectiveIntentType)) {
    const questionnaire = await generateClarifyQuestionnaire(intent.userText || lastInput.userText || '', env);
    return buildQuestionnaireStepResponse(flow, body, questionnaire, 0, {});
  }

  const response = buildTextualResponse(flow, body, authContext);
  response.lifecoach.processing.capabilityIntent = uiMode === 'plan' ? 'plan' : effectiveIntentType;
  response.lifecoach.processing.uiMode = uiMode;

  const upstream = await maybeProxyLifecoachChat(flow, body, env, { uiMode });
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
