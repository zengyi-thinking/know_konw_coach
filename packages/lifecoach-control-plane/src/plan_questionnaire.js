const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');

function fallbackQuestionnaire(seedText = '') {
  return {
    title: '三问理清',
    summary: '先用三问收束你的困境。',
    questions: [
      {
        id: 'q1',
        question: '现在最困扰你的，是哪一层？',
        options: [
          { key: 'A', title: '方向不清', subtitle: '不知道真正想要什么' },
          { key: 'B', title: '反复卡住', subtitle: '总在原地打转' },
          { key: 'C', title: '情绪太满', subtitle: '先想稳定下来' },
          { key: 'D', title: '关系拉扯', subtitle: '总被别人影响' },
        ],
      },
      {
        id: 'q2',
        question: '如果这件事有进展，你最希望先看到什么变化？',
        options: [
          { key: 'A', title: '心里更清楚', subtitle: '知道自己真正要什么' },
          { key: 'B', title: '行动更轻一点', subtitle: '能先动起来' },
          { key: 'C', title: '情绪更稳一点', subtitle: '别那么乱' },
          { key: 'D', title: '边界更清楚', subtitle: '少受外界牵动' },
        ],
      },
      {
        id: 'q3',
        question: '当前最大阻力更像哪一种？',
        options: [
          { key: 'A', title: '想太多', subtitle: '脑子停不下来' },
          { key: 'B', title: '怕做错', subtitle: '担心后果' },
          { key: 'C', title: '太在意他人', subtitle: '总被评价牵动' },
          { key: 'D', title: '没力气', subtitle: '现在承载不够' },
        ],
      },
    ],
    seedText,
  };
}

async function generatePlanQuestionnaire(seedText = '', env = process.env) {
  if (!isProxyEnabled(env)) {
    return fallbackQuestionnaire(seedText);
  }

  const prompt = [
    '你是一个 life coach 的 intake 问卷设计器。',
    '请根据用户当前困境，生成 3 个循序渐进的问题。',
    '每个问题都要附带 4 个简短选项。',
    '问题风格要像 Claude 的 plan/choice card：短、清楚、可点击，不要长段解释。',
    '输出 JSON，格式：',
    '{"title":"...","summary":"...","questions":[{"id":"q1","question":"...","options":[{"key":"A","title":"...","subtitle":"..."},{"key":"B","title":"...","subtitle":"..."},{"key":"C","title":"...","subtitle":"..."},{"key":"D","title":"...","subtitle":"..."}]},{"id":"q2","question":"...","options":[...]},{"id":"q3","question":"...","options":[...]}]}',
    `用户当前输入: ${seedText || '用户想理清自己的困境。'}`,
  ].join('\n');

  const response = await executeChat({
    modality: 'text',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: '生成三问问卷。' },
    ],
  }, buildUpstreamEnv(env), { timeoutMs: 30000 });

  if (!response.ok) {
    return fallbackQuestionnaire(seedText);
  }

  const content = response.data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length === 3) {
      return parsed;
    }
  } catch {}

  return fallbackQuestionnaire(seedText);
}

function buildPlanSummary(questionnaire, answers) {
  const lines = ['我先回答完这份三问问卷：'];
  for (const question of questionnaire.questions || []) {
    const answer = answers[question.id] || '';
    lines.push(`Q: ${question.question}`);
    lines.push(`A: ${answer}`);
  }
  return lines.join('\n');
}

module.exports = {
  generatePlanQuestionnaire,
  buildPlanSummary,
};
