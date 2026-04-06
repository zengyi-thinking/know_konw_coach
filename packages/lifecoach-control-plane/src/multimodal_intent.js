function extractLastUserText(messages = []) {
  const last = [...messages].reverse().find((item) => item.role === 'user');
  if (!last) return '';
  if (Array.isArray(last.content)) {
    const textPart = last.content.find((item) => item.type === 'text');
    return textPart ? String(textPart.text || '') : '';
  }
  return String(last.content || '');
}

function hasImageAttachment(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = [...messages].reverse().find((message) => message.role === 'user');
  return Array.isArray(last?.content)
    && last.content.some((item) => item.type === 'image_url' && item.image_url?.url);
}

function hasGeneratedImageContext(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  return messages.some((message) => message.role === 'assistant' && Boolean(message.generatedImageUrl));
}

function isImageGenerationRequest(text = '') {
  const normalized = String(text).toLowerCase();
  const hints = [
    '生成一张',
    '生成图片',
    '画一张',
    '帮我画',
    '做一张图',
    '可视化',
    '给我一张图',
    '帮我做个图',
    '给我做张图',
    '生成配图',
    '做个配图',
    '生成插画',
    '做一张海报',
    '生成封面',
    '给我一个画面',
    '我想看一个画面',
    '做个视觉化的图',
    'design an image',
    'generate an image',
    'create an image',
    'draw an image',
  ];
  return hints.some((item) => normalized.includes(item.toLowerCase()));
}

function isImageRefinementRequest(text = '') {
  const normalized = String(text).toLowerCase();
  const hints = [
    '更暖一点',
    '再改一版',
    '换个颜色',
    '更像玻璃球',
    '更柔和一点',
    '更安静一点',
    '按我的情绪改',
    '调整一下图片',
    '继续改图',
    '换个版本',
    '再来一张',
    '再试一版',
  ];
  return hints.some((item) => normalized.includes(item.toLowerCase()));
}

function inferRuleIntent(body = {}) {
  const text = extractLastUserText(body.messages || []);
  const hasGeneratedImage = hasGeneratedImageContext(body);

  if (hasImageAttachment(body)) {
    return {
      type: 'image_understanding',
      userText: text,
    };
  }

  if (isImageGenerationRequest(text)) {
    return {
      type: 'image_generation',
      userText: text,
    };
  }

  if (hasGeneratedImage && isImageRefinementRequest(text)) {
    return {
      type: 'image_generation',
      userText: text,
      reason: 'continue_image_generation',
    };
  }

  return {
    type: 'chat',
    userText: text,
    needsSemanticCheck: true,
  };
}

module.exports = {
  inferRuleIntent,
  extractLastUserText,
};
