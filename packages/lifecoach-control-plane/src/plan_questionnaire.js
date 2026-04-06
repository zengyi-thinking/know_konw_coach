const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');

function summarizeSeed(seedText = '') {
  const compact = String(seedText || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '当前这个问题';
  return compact.length > 22 ? `${compact.slice(0, 22)}...` : compact;
}

function inferSeedLens(seedText = '') {
  const normalized = String(seedText || '').toLowerCase();
  if (/(关系|父母|伴侣|同事|朋友|婚|感情|沟通)/.test(normalized)) {
    return {
      focus: [
        { key: 'A', title: '关系边界', subtitle: '先看谁在拉扯你' },
        { key: 'B', title: '真实诉求', subtitle: '先看你真正想要什么' },
        { key: 'C', title: '触发场景', subtitle: '先看哪一刻最卡' },
        { key: 'D', title: '可说出口的话', subtitle: '先准备一句回应' },
      ],
      outcome: [
        { key: 'A', title: '边界更清楚', subtitle: '不再被对方节奏带走' },
        { key: 'B', title: '表达更稳', subtitle: '能说清你的立场' },
        { key: 'C', title: '关系降温', subtitle: '先减少对抗和消耗' },
        { key: 'D', title: '决定更明确', subtitle: '知道该继续还是调整' },
      ],
    };
  }

  if (/(工作|职业|项目|学习|考试|offer|简历|副业|公司)/.test(normalized)) {
    return {
      focus: [
        { key: 'A', title: '目标结果', subtitle: '先明确到底要达成什么' },
        { key: 'B', title: '推进顺序', subtitle: '先排出轻重缓急' },
        { key: 'C', title: '卡点诊断', subtitle: '先找到真正阻力' },
        { key: 'D', title: '第一步动作', subtitle: '先定今天能做什么' },
      ],
      outcome: [
        { key: 'A', title: '方向更清楚', subtitle: '知道先冲哪件事' },
        { key: 'B', title: '执行更顺', subtitle: '不再反复空转' },
        { key: 'C', title: '风险更低', subtitle: '先避开明显代价' },
        { key: 'D', title: '节奏更稳', subtitle: '把推进拆成可持续动作' },
      ],
    };
  }

  if (/(情绪|焦虑|内耗|崩溃|难过|压力|失眠|痛苦|迷茫)/.test(normalized)) {
    return {
      focus: [
        { key: 'A', title: '触发点', subtitle: '先看是哪件事刺到你' },
        { key: 'B', title: '脑中解释', subtitle: '先看你怎么理解这件事' },
        { key: 'C', title: '身体状态', subtitle: '先看现在承载够不够' },
        { key: 'D', title: '外界压力', subtitle: '先看是谁在牵动你' },
      ],
      outcome: [
        { key: 'A', title: '情绪先稳住', subtitle: '不再被当下淹没' },
        { key: 'B', title: '原因更清楚', subtitle: '知道自己为什么这么卡' },
        { key: 'C', title: '动作更轻', subtitle: '先恢复一点可行动感' },
        { key: 'D', title: '边界更稳', subtitle: '减少外界拉扯' },
      ],
    };
  }

  return {
    focus: [
      { key: 'A', title: '先定目标', subtitle: '先明确你最想解决哪层' },
      { key: 'B', title: '先找卡点', subtitle: '先找到当前最大阻力' },
      { key: 'C', title: '先排步骤', subtitle: '先把顺序拆开' },
      { key: 'D', title: '先做第一步', subtitle: '先落到一个具体动作' },
    ],
    outcome: [
      { key: 'A', title: '更清楚', subtitle: '知道到底该往哪走' },
      { key: 'B', title: '更能行动', subtitle: '开始动起来而不是空想' },
      { key: 'C', title: '更稳一点', subtitle: '先减少混乱和消耗' },
      { key: 'D', title: '更容易坚持', subtitle: '让推进节奏可持续' },
    ],
  };
}

function buildDynamicQuestionnaire(seedText = '', title = '先理清一下', summary = '我先根据你的问题生成三张计划卡片。') {
  const subject = summarizeSeed(seedText);
  const lens = inferSeedLens(seedText);
  return {
    title,
    summary,
    questions: [
      {
        id: 'q1',
        question: `围绕“${subject}”，你最想先拆开哪一层？`,
        options: lens.focus,
      },
      {
        id: 'q2',
        question: '如果这件事推进顺一点，你最想先看到什么变化？',
        options: lens.outcome,
      },
      {
        id: 'q3',
        question: '你现在最大的阻力，更像下面哪一种？',
        options: [
          { key: 'A', title: '信息太乱', subtitle: '脑子里东西太多，没收束' },
          { key: 'B', title: '怕选错', subtitle: '担心一步走错带来代价' },
          { key: 'C', title: '受外界牵动', subtitle: '很容易被别人或环境打断' },
          { key: 'D', title: '能量不够', subtitle: '知道方向但暂时推不动' },
        ],
      },
    ],
    seedText,
  };
}

function fallbackQuestionnaire(seedText = '') {
  return buildDynamicQuestionnaire(seedText, '三问理清', '先根据你的问题生成三张计划卡片。');
}

function fallbackClarifyQuestionnaire(seedText = '') {
  return buildDynamicQuestionnaire(seedText, '先理清一下', '我先根据你的问题生成三张澄清卡片。');
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

async function generateClarifyQuestionnaire(seedText = '', env = process.env) {
  if (!isProxyEnabled(env)) {
    return fallbackClarifyQuestionnaire(seedText);
  }

  const prompt = [
    '你是一个 life coach 的澄清流程设计器。',
    '请根据用户当前的模糊表达，生成 3 个循序渐进的澄清问题。',
    '每个问题都要附带 4 个短选项。',
    '输出 JSON，格式：',
    '{"title":"...","summary":"...","questions":[{"id":"q1","question":"...","options":[{"key":"A","title":"...","subtitle":"..."},{"key":"B","title":"...","subtitle":"..."},{"key":"C","title":"...","subtitle":"..."},{"key":"D","title":"...","subtitle":"..."}]},{"id":"q2","question":"...","options":[...]},{"id":"q3","question":"...","options":[...]}]}',
    `用户当前输入: ${seedText || '用户想理清自己的困境。'}`,
    '问题要短，像 Claude 的 plan 卡片，不要解释太多。',
  ].join('\n');

  const response = await executeChat({
    modality: 'text',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: '生成三问澄清问卷。' },
    ],
  }, buildUpstreamEnv(env), { timeoutMs: 30000 });

  if (!response.ok) {
    return fallbackClarifyQuestionnaire(seedText);
  }

  const content = response.data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length === 3) {
      return parsed;
    }
  } catch {}

  return fallbackClarifyQuestionnaire(seedText);
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
  generateClarifyQuestionnaire,
  buildPlanSummary,
};
