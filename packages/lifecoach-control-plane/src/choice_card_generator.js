const { executeChat } = require('../../lifecoach-core/src/gateway/chat_executor');
const { buildUpstreamEnv, isProxyEnabled } = require('./upstream_lifecoach_chat');

function fallbackChoices(flow) {
  const route = flow.result.route.primarySkill;
  const workflow = flow.result.workflow;

  if (workflow?.id === 'long-horizon-confusion') {
    return {
      question: workflow.stageDescription || '你更想先从哪一层开始？',
      options: [
        { key: 'A', title: '先说最近的一个具体情境', subtitle: '从真实场景进入' },
        { key: 'B', title: '先看我最在意谁的评价', subtitle: '找清压力来源' },
        { key: 'C', title: '先说我真正想过的生活', subtitle: '回到自己的方向' },
        { key: 'D', title: '先只保留一个小动作', subtitle: '不急着一次想清全部' },
      ],
    };
  }

  if (route === 'emotional-debrief') {
    return {
      question: '你更想先从哪一层开始？',
      options: [
        { key: 'A', title: '具体发生了什么', subtitle: '先把情境说清' },
        { key: 'B', title: '哪句话最刺到我', subtitle: '先抓触发点' },
        { key: 'C', title: '我为什么反应这么大', subtitle: '再看背后的模式' },
        { key: 'D', title: '先给我一个小动作', subtitle: '先稳住再推进' },
      ],
    };
  }

  return {
    question: '你更想先从哪一层开始？',
    options: [
      { key: 'A', title: '先说清问题', subtitle: '先聚焦' },
      { key: 'B', title: '先看卡点', subtitle: '先诊断' },
      { key: 'C', title: '先收束成一步', subtitle: '先行动' },
      { key: 'D', title: '先看时间线', subtitle: '先找连续性' },
    ],
  };
}

async function generateChoiceCard(flow, body, env = process.env) {
  if (!isProxyEnabled(env)) {
    return fallbackChoices(flow);
  }

  const userText = body.messages?.[body.messages.length - 1]?.content;
  const questionPrompt = [
    '你是一个 life coach 的问题卡片生成器。',
    '请根据当前对话，生成一个最适合用户继续回答的追问问题，以及 4 个简短选项。',
    '输出必须是 JSON，格式如下：',
    '{"question":"...","options":[{"key":"A","title":"...","subtitle":"..."},{"key":"B","title":"...","subtitle":"..."},{"key":"C","title":"...","subtitle":"..."},{"key":"D","title":"...","subtitle":"..."}]}',
    `当前主 skill: ${flow.result.route.primarySkill}`,
    `当前 workflow: ${flow.result.workflow ? `${flow.result.workflow.id}/${flow.result.workflow.stageId}` : 'none'}`,
    `用户上一条输入: ${typeof userText === 'string' ? userText : JSON.stringify(userText)}`,
    '问题和选项要短，像 Claude plan 选择卡片，不要长段解释。',
  ].join('\n');

  const response = await executeChat({
    modality: 'text',
    messages: [
      { role: 'system', content: questionPrompt },
      { role: 'user', content: '生成下一步问题卡片。' },
    ],
  }, buildUpstreamEnv(env), { timeoutMs: 30000 });

  if (!response.ok) {
    return fallbackChoices(flow);
  }

  const content = response.data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 3) {
      return parsed;
    }
  } catch {}

  return fallbackChoices(flow);
}

module.exports = {
  generateChoiceCard,
};
