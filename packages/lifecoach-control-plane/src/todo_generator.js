const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');

function normalizeMessageContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (item.type === 'text') return item.text || '';
      if (item.type === 'image_url') return '[image]';
      return '';
    }).filter(Boolean).join(' ');
  }
  return '';
}

function summarizeConversation(messages = []) {
  return messages
    .slice(-8)
    .map((item) => `${item.role === 'assistant' ? '教练' : '用户'}: ${normalizeMessageContent(item.content)}`)
    .filter((line) => line.trim())
    .join('\n');
}

function pickFocus(text = '') {
  if (/(迷茫|方向|选择|想要什么)/.test(text)) {
    return 'clarify';
  }
  if (/(焦虑|情绪|难受|崩溃|压力)/.test(text)) {
    return 'stabilize';
  }
  if (/(父母|关系|认可|评价|别人)/.test(text)) {
    return 'boundary';
  }
  return 'action';
}

function fallbackItemsByFocus(focus) {
  if (focus === 'clarify') {
    return [
      { title: '写下一句你真正想推进的结果', description: '先把目标从模糊感受收束成一句清楚的话。', progress: 20, deadline: '今晚 21:00 前', status: 'in_progress' },
      { title: '列出当前最卡的 2 个阻力', description: '把阻力写出来，避免问题继续糊成一团。', progress: 0, deadline: '48 小时内', status: 'planned' },
      { title: '保留一个最小行动作为验证', description: '不要直接做大决定，只验证下一步是否值得继续。', progress: 0, deadline: '本周五前', status: 'planned' },
    ];
  }

  if (focus === 'stabilize') {
    return [
      { title: '先记录这次情绪最高点是什么', description: '抓住触发点，而不是只说“我很乱”。', progress: 25, deadline: '今晚睡前', status: 'in_progress' },
      { title: '给自己安排一个 15 分钟的低刺激恢复动作', description: '先让身体和注意力降下来。', progress: 10, deadline: '24 小时内', status: 'in_progress' },
      { title: '复盘这次情绪背后的未满足需求', description: '等稳定后，再看你真正想被满足的是什么。', progress: 0, deadline: '本周内', status: 'planned' },
    ];
  }

  if (focus === 'boundary') {
    return [
      { title: '写下这件事里你最在意谁的看法', description: '先看清压力真正来自哪里。', progress: 20, deadline: '今晚 22:00 前', status: 'in_progress' },
      { title: '区分“别人期待”和“你自己想要”', description: '至少各写 2 条，避免继续混在一起。', progress: 0, deadline: '48 小时内', status: 'planned' },
      { title: '为下一次回应准备一句边界表达', description: '把想说的话提前写出来，降低临场拉扯。', progress: 0, deadline: '本周前', status: 'planned' },
    ];
  }

  return [
    { title: '把当前问题压缩成一个最小行动', description: '只保留今天最值得推进的一步。', progress: 30, deadline: '今晚 21:00 前', status: 'in_progress' },
    { title: '确认完成这一步需要的资源', description: '写清楚你缺什么、已有什麽。', progress: 0, deadline: '48 小时内', status: 'planned' },
    { title: '设置一个简单复盘点', description: '到期后回看这一步是否真的有效。', progress: 0, deadline: '本周末前', status: 'planned' },
  ];
}

function fallbackTodoList(messages = [], authContext = {}, context = {}) {
  const transcript = summarizeConversation(messages);
  const focus = pickFocus(transcript);
  const displayName = authContext.user?.displayName || '你';
  const items = fallbackItemsByFocus(focus).map((item, index) => ({
    id: `todo-${index + 1}`,
    ...item,
  }));

  return {
    title: '教练 To-Do',
    summary: `${displayName}，我先把当前对话收束成 3 个可推进的动作。${context.sidebarSummary ? ` 当前主线：${context.sidebarSummary}` : ''}`,
    generatedAt: new Date().toISOString(),
    items,
  };
}

async function generateCoachTodoList(messages = [], authContext = {}, context = {}, env = process.env) {
  if (!isProxyEnabled(env)) {
    return fallbackTodoList(messages, authContext, context);
  }

  const transcript = summarizeConversation(messages);
  const prompt = [
    '你是一个长期陪伴型 Life Coach 的待办清单生成器。',
    '请根据用户最近的对话、当前主线和已有理解，生成 3 条最值得推进的教练式 To-Do。',
    '要求：每条都要具体、可执行、不过度承诺，不要像项目经理任务单。',
    '每条必须包含：id、title、description、progress(0-100 的整数)、deadline、status(planned/in_progress/done)。',
    '另外输出 title、summary。',
    '输出必须是 JSON，格式：',
    '{"title":"教练 To-Do","summary":"...","items":[{"id":"todo-1","title":"...","description":"...","progress":25,"deadline":"...","status":"in_progress"}]}',
    `用户名称: ${authContext.user?.displayName || '未知'}`,
    `用户套餐: ${authContext.user?.planId || 'unknown'}`,
    `当前主线摘要: ${context.sidebarSummary || '无'}`,
    `上一轮教练总结: ${context.lastAssistantText || '无'}`,
    `最近对话:\n${transcript || '暂无对话'}`,
    'deadline 用自然中文表达，比如“今晚 21:00 前”“48 小时内”“本周五前”。',
    'progress 要体现当前阶段，不要所有条目都写 0。',
  ].join('\n');

  const response = await executeChat({
    modality: 'text',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: '生成教练 To-Do List。' },
    ],
  }, buildUpstreamEnv(env), { timeoutMs: 30000 });

  if (!response.ok) {
    return fallbackTodoList(messages, authContext, context);
  }

  const content = response.data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
      return {
        title: parsed.title || '教练 To-Do',
        summary: parsed.summary || '我先根据当前对话收束成几个可推进动作。',
        generatedAt: new Date().toISOString(),
        items: parsed.items.slice(0, 4).map((item, index) => ({
          id: item.id || `todo-${index + 1}`,
          title: item.title || `待办 ${index + 1}`,
          description: item.description || '',
          progress: Math.max(0, Math.min(100, Number(item.progress) || 0)),
          deadline: item.deadline || '待定',
          status: ['planned', 'in_progress', 'done'].includes(item.status) ? item.status : 'planned',
        })),
      };
    }
  } catch {}

  return fallbackTodoList(messages, authContext, context);
}

function hasEnoughTodoContext(messages = []) {
  const userCount = messages.filter((item) => item.role === 'user').length;
  return userCount >= 2 && messages.length >= 4;
}

module.exports = {
  generateCoachTodoList,
  hasEnoughTodoContext,
};
