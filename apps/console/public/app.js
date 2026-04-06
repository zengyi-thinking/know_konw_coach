const state = {
  token: localStorage.getItem('lifecoach_console_token') || '',
  me: null,
  usage: null,
  keys: [],
  integration: null,
  models: [],
  chatMessages: [],
  chatAttachment: null,
  chatLastAssistantText: '',
  chatLastChoiceCard: null,
  chatChoiceFlowState: null,
  chatBusy: false,
  chatStarted: false,
  planQuestionnaire: null,
  planStepIndex: 0,
  planAnswers: {},
  selectedPlanOptionIndex: null,
  mediaRecorder: null,
  mediaChunks: [],
  isRecording: false,
};

function pageName() {
  return document.body.dataset.page || 'landing';
}

function protectedPage() {
  return ['dashboard', 'keys', 'integration', 'models', 'chat'].includes(pageName());
}

const themeState = {
  key: 'lifecoach_console_theme',
  themes: ['warm-tea', 'taisho-nouveau', 'zine-handmade'],
};

function normalizeTheme(theme) {
  return themeState.themes.includes(theme) ? theme : 'warm-tea';
}

function getThemeRuntime() {
  return window.LifeCoachTheme && typeof window.LifeCoachTheme.setTheme === 'function'
    ? window.LifeCoachTheme
    : null;
}

function getCurrentTheme() {
  const runtime = getThemeRuntime();
  if (runtime) {
    return normalizeTheme(runtime.getTheme());
  }

  try {
    return normalizeTheme(localStorage.getItem(themeState.key));
  } catch {
    return 'warm-tea';
  }
}

function setCurrentTheme(theme) {
  const runtime = getThemeRuntime();
  if (runtime) {
    return normalizeTheme(runtime.setTheme(theme));
  }

  const next = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(themeState.key, next);
  } catch {}
  window.dispatchEvent(new CustomEvent('lifecoach-theme-change', { detail: { theme: next } }));
  return next;
}

function syncThemeSelectors(theme) {
  document.querySelectorAll('[data-theme-select]').forEach((select) => {
    if (select.value !== theme) {
      select.value = theme;
    }
  });
}

function initThemeSelector() {
  const selects = document.querySelectorAll('[data-theme-select]');
  if (!selects.length) return;

  const current = getCurrentTheme();
  syncThemeSelectors(current);

  selects.forEach((select) => {
    select.addEventListener('change', (event) => {
      const next = setCurrentTheme(event.currentTarget.value);
      syncThemeSelectors(next);
    });
  });

  window.addEventListener('lifecoach-theme-change', (event) => {
    const next = normalizeTheme(event.detail?.theme);
    syncThemeSelectors(next);
  });
}

function saveToken(token) {
  state.token = token || '';
  if (state.token) {
    localStorage.setItem('lifecoach_console_token', state.token);
  } else {
    localStorage.removeItem('lifecoach_console_token');
  }
}

function logout() {
  saveToken('');
  window.location.href = '/auth';
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function setPre(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDetailRows(targetId, rows) {
  const node = document.getElementById(targetId);
  if (!node) return;
  node.innerHTML = rows.map((row) => `
    <div class="detail-row">
      <span>${row.label}</span>
      <strong>${row.value}</strong>
    </div>
  `).join('');
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new Error(data.error || 'request_failed');
  }
  return data;
}

async function apiBinary(path, payload) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    throw new Error(data.error || 'request_failed');
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('content-type') || '',
  };
}

function formatEntitlements(entitlements = {}) {
  return [
    entitlements.featureText ? '文本' : null,
    entitlements.featureVision ? '图片' : null,
    entitlements.featureAsr ? '语音转写' : null,
    entitlements.featureTts ? '语音输出' : null,
    entitlements.featureCerebellum ? '小脑' : null,
  ].filter(Boolean).join(' / ') || '仅基础文本';
}

async function loadSessionData() {
  if (!state.token) {
    if (protectedPage()) {
      window.location.href = '/auth';
      return false;
    }
    return false;
  }

  const [me, usage, keys] = await Promise.all([
    api('/api/me'),
    api('/api/me/usage'),
    api('/api/keys'),
  ]);
  state.me = me;
  state.usage = usage;
  state.keys = keys.items || [];
  return true;
}

function bindLogoutButtons() {
  document.querySelectorAll('#logout-button').forEach((button) => {
    button.addEventListener('click', logout);
  });
}

function setChatStatus(text) {
  setText('chat-status-note', text);
}

function setChatStarted(started) {
  state.chatStarted = Boolean(started);
  const body = document.body;
  const stage = document.getElementById('chat-bubble-stage');
  const windowNode = document.getElementById('chat-window');
  if (!body || !stage || !windowNode) return;

  body.classList.toggle('chat-started', state.chatStarted);
  stage.classList.toggle('bubble-stage-docked', state.chatStarted);
  windowNode.classList.toggle('chat-window-hidden', !state.chatStarted);
}

function renderDashboard() {
  const user = state.me.user;
  const usage = state.usage;
  const activeKeys = state.keys.filter((item) => item.status === 'active');

  setText('dashboard-greeting', `${user.displayName}，你的 Lifecoach 当前已经调到 ${state.me.entitlements.featureCerebellum ? '浓香增强' : '清亮基础'} 风味。`);
  setText('dashboard-mode', state.me.entitlements.featureCerebellum ? '增强版已开味' : '基础版');
  setText('dashboard-plan', user.planId || 'enhanced_trial');
  setText('metric-features', formatEntitlements(state.me.entitlements));
  setText('metric-keys', `${activeKeys.length} 把激活中`);
  setText('metric-requests', `${usage.totalRequests}`);
  setText('metric-last-used', usage.lastRequestAt || '还没有调用');

  renderDetailRows('me-card', [
    { label: '账号邮箱', value: user.email },
    { label: '显示名称', value: user.displayName },
    { label: '套餐标识', value: user.planId || 'enhanced_trial' },
    { label: '可用能力', value: formatEntitlements(state.me.entitlements) },
  ]);

  renderDetailRows('usage-card', [
    { label: '成功请求', value: `${usage.successfulRequests}` },
    { label: '失败请求', value: `${usage.failedRequests}` },
    { label: '输入体积', value: `${usage.totalInputUnits}` },
    { label: '输出体积', value: `${usage.totalOutputUnits}` },
  ]);
}

function renderKeys() {
  const list = document.getElementById('keys-list');
  if (!list) return;

  if (!state.keys.length) {
    list.innerHTML = '<div class="key-card"><p>还没有创建过增强 key。</p></div>';
    return;
  }

  list.innerHTML = state.keys.map((item) => `
    <article class="key-card" data-key-id="${item.id}">
      <header>
        <div>
          <h3>${item.name}</h3>
          <p>${item.prefix}</p>
        </div>
        <span class="capsule ${item.status === 'active' ? '' : 'warn'}">${item.status}</span>
      </header>
      <div class="capsule-row">
        ${(item.scopes || []).map((scope) => `<span class="capsule plum">${scope}</span>`).join('')}
      </div>
      <div class="key-actions">
        <div class="detail-list">
          <div class="detail-row"><span>创建时间</span><strong>${item.createdAt}</strong></div>
          <div class="detail-row"><span>最近使用</span><strong>${item.lastUsedAt || '尚未使用'}</strong></div>
        </div>
        ${item.status === 'active' ? '<button class="ghost-button revoke-button" type="button">吊销</button>' : ''}
      </div>
    </article>
  `).join('');

  list.querySelectorAll('.revoke-button').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const card = event.currentTarget.closest('[data-key-id]');
      const keyId = card.dataset.keyId;
      await api(`/api/keys/${keyId}/revoke`, { method: 'POST' });
      await refreshKeys();
    });
  });
}

async function refreshKeys() {
  const keys = await api('/api/keys');
  state.keys = keys.items || [];
  renderKeys();
}

async function loadIntegration() {
  const result = await api('/api/integration/openclaw');
  state.integration = result;
  setPre('snippet-output', result.snippet);
  renderDetailRows('integration-hint', [
    { label: 'Gateway 地址', value: result.gatewayBaseUrl },
    { label: '有激活 key', value: result.hasActiveKey ? '是' : '否' },
    { label: '当前建议', value: result.hasActiveKey ? '可以直接复制去接入 OpenClaw' : '先去钥匙库创建一把 key' },
  ]);
}

async function loadModels() {
  const result = await api('/api/models');
  state.models = result.items || [];
  const grid = document.getElementById('models-grid');
  if (!grid) return;

  grid.innerHTML = state.models.map((item) => `
    <article class="model-card">
      <header>
        <div>
          <h3>${item.id}</h3>
          <p>${item.type}</p>
        </div>
        <span class="capsule ${item.available ? '' : 'warn'}">${item.available ? '已开味' : '未启用'}</span>
      </header>
      <div class="capsule-row">
        <span class="capsule plum">${item.recommended ? '推荐配方' : '候选配方'}</span>
      </div>
    </article>
  `).join('');
}

function bindAuthForms() {
  document.getElementById('sign-in-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api('/api/auth/sign-in', {
      method: 'POST',
      body: Object.fromEntries(form.entries()),
    });
    saveToken(result.sessionToken);
    window.location.href = '/dashboard';
  });

  document.getElementById('sign-up-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api('/api/auth/sign-up', {
      method: 'POST',
      body: Object.fromEntries(form.entries()),
    });
    saveToken(result.sessionToken);
    window.location.href = '/dashboard';
  });
}

function bindKeyCreateForm() {
  document.getElementById('create-key-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api('/api/keys', {
      method: 'POST',
      body: Object.fromEntries(form.entries()),
    });
    setPre('key-output', {
      message: '完整 key 只在这次显示，请立刻复制保存。',
      rawKey: result.rawKey,
      apiKey: result.apiKey,
    });
    await refreshKeys();
  });

  document.getElementById('refresh-keys')?.addEventListener('click', refreshKeys);
}

function bindPageButtons() {
  document.getElementById('load-snippet')?.addEventListener('click', loadIntegration);
  document.getElementById('load-models')?.addEventListener('click', loadModels);
}

function persistChatMessages() {
  localStorage.setItem('lifecoach_console_chat_messages', JSON.stringify(state.chatMessages));
  localStorage.setItem('lifecoach_console_choice_flow', JSON.stringify(state.chatChoiceFlowState));
}

function restoreChatMessages() {
  try {
    const raw = localStorage.getItem('lifecoach_console_chat_messages');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.chatMessages = parsed;
    }
  } catch {}
  try {
    const flowRaw = localStorage.getItem('lifecoach_console_choice_flow');
    if (flowRaw) {
      state.chatChoiceFlowState = JSON.parse(flowRaw);
    }
  } catch {}
}

function toApiMessages() {
  return state.chatMessages.map((item) => {
    if (item.role === 'assistant') {
      return {
        role: 'assistant',
        content: item.text,
        generatedImageUrl: item.generatedImageUrl || null,
      };
    }

    if (item.imageDataUrl) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: item.text || '请结合这张图片和我的感受一起理解。' },
          { type: 'image_url', image_url: { url: item.imageDataUrl } },
        ],
      };
    }

    return {
      role: 'user',
      content: item.text,
    };
  });
}

function renderChatAttachments() {
  const node = document.getElementById('chat-attachments');
  if (!node) return;

  if (!state.chatAttachment) {
    node.innerHTML = '';
    return;
  }

  node.innerHTML = `
    <article class="attachment-pill reveal">
      <img src="${state.chatAttachment.dataUrl}" alt="attachment preview">
      <div>
        <strong>${escapeHtml(state.chatAttachment.name)}</strong>
        <span>这张图片会随消息一起发出</span>
      </div>
      <button class="ghost-button" id="remove-chat-attachment" type="button">移除</button>
    </article>
  `;

  document.getElementById('remove-chat-attachment')?.addEventListener('click', () => {
    state.chatAttachment = null;
    renderChatAttachments();
  });
}

function resetPlanState() {
  state.planQuestionnaire = null;
  state.planStepIndex = 0;
  state.planAnswers = {};
  state.selectedPlanOptionIndex = null;
}

function renderPlanCard() {
  const node = document.getElementById('chat-plan-card');
  if (!node) return;

  if (!state.planQuestionnaire || !Array.isArray(state.planQuestionnaire.questions) || !state.planQuestionnaire.questions.length) {
    node.innerHTML = '';
    return;
  }

  const total = state.planQuestionnaire.questions.length;
  const question = state.planQuestionnaire.questions[state.planStepIndex];
  if (!question) {
    node.innerHTML = '';
    return;
  }

  const selectedAnswer = typeof state.planAnswers[question.id] === 'string' ? state.planAnswers[question.id] : '';
  node.innerHTML = `
    <article class="plan-card reveal">
      <div class="plan-card-head">
        <div>
          <strong>${escapeHtml(question.question)}</strong>
        </div>
        <div class="plan-progress">${state.planStepIndex + 1} / ${total}</div>
      </div>
      <div class="plan-options">
        ${(question.options || []).map((item, index) => `
          <button class="plan-option ${selectedAnswer === item.title ? 'active' : ''}" type="button" data-plan-option-index="${index}">
            <span class="plan-option-key">${escapeHtml(item.key || String(index + 1))}</span>
            <span class="plan-option-copy">
              <strong>${escapeHtml(item.title || '')}</strong>
              ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}
            </span>
          </button>
        `).join('')}
      </div>
      <div class="plan-actions">
        <button class="ghost-button" id="plan-skip-button" type="button">${state.planStepIndex + 1 >= total ? 'Skip' : '跳过'}</button>
        <button class="button primary" id="plan-next-button" type="button">${state.planStepIndex + 1 >= total ? '完成' : '→'}</button>
      </div>
    </article>
  `;

  node.querySelectorAll('[data-plan-option-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.planOptionIndex);
      const option = question.options?.[index];
      if (!option) return;
      state.planAnswers[question.id] = option.title;
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = option.title;
      }
      renderPlanCard();
    });
  });

  document.getElementById('plan-skip-button')?.addEventListener('click', async () => {
    state.planAnswers[question.id] = state.planAnswers[question.id] || '跳过';
    await advancePlanQuestion();
  });

  document.getElementById('plan-next-button')?.addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    if (input?.value.trim()) {
      state.planAnswers[question.id] = input.value.trim();
    }
    if (!state.planAnswers[question.id]) {
      setChatStatus('先选一个选项，或输入你的回答');
      return;
    }
    await advancePlanQuestion();
  });
}

async function advancePlanQuestion() {
  const input = document.getElementById('chat-input');
  if (input) input.value = '';

  if (!state.planQuestionnaire) return;
  if (state.planStepIndex + 1 < state.planQuestionnaire.questions.length) {
    state.planStepIndex += 1;
    renderPlanCard();
    return;
  }

  const summaryLines = [];
  for (const question of state.planQuestionnaire.questions) {
    summaryLines.push(`Q: ${question.question}`);
    summaryLines.push(`A: ${state.planAnswers[question.id] || '跳过'}`);
  }
  state.chatMessages.push({
    role: 'user',
    text: summaryLines.join('\n'),
  });
  persistChatMessages();
  resetPlanState();
  renderPlanCard();
  await sendChatMessageFromState();
}

function renderChatInspector(meta) {
  if (!meta?.lifecoach) return;

  const workflow = meta.lifecoach.workflow?.title || meta.lifecoach.workflow?.id || '';
  const route = meta.lifecoach.route?.primarySkill || '';
  const summary = workflow || route;
  if (summary) {
    setText('chat-sidebar-user', summary);
  }
}

function renderChatFollowups() {
  const node = document.getElementById('chat-followups');
  if (!node) return;

  if (!state.chatLastChoiceCard || !Array.isArray(state.chatLastChoiceCard.options) || state.chatLastChoiceCard.options.length === 0) {
    node.innerHTML = '';
    return;
  }

  node.innerHTML = `
    <div class="followup-label">${escapeHtml(state.chatLastChoiceCard.question || '继续')}</div>
    <div class="followup-grid">
      ${state.chatLastChoiceCard.options.map((item, index) => `
        <button class="followup-chip card-option" type="button" data-followup-index="${index}">
          <span class="card-option-key">${escapeHtml(item.key || '')}</span>
          <span class="card-option-text">
            <strong>${escapeHtml(item.title || item)}</strong>
            ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}
          </span>
        </button>
      `).join('')}
    </div>
  `;

  node.querySelectorAll('.followup-chip').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.followupIndex);
      const choice = state.chatLastChoiceCard.options[index] || '';
      const label = typeof choice === 'string' ? choice : `Q: ${state.chatLastChoiceCard.question || ''}\nA: ${choice.title || ''}`;
      state.chatMessages.push({
        role: 'user',
        text: label,
      });
      persistChatMessages();
      try {
        await sendChatMessageFromState();
      } catch {}
    });
  });
}

function renderChatMessages() {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;

  const intro = `
    <div class="message-row assistant reveal">
      <div class="message-badge">教练</div>
      <article class="message-bubble">
        <p>说说你现在最想理清的一层。</p>
      </article>
    </div>
  `;

  const rows = state.chatMessages.map((item, index) => {
    const attachment = item.imageDataUrl ? `<img class="message-image" src="${item.imageDataUrl}" alt="user attachment">` : '';
    const generated = item.generatedImageUrl ? `<img class="message-image generated-image" src="${item.generatedImageUrl}" alt="generated image">` : '';
    const actions = item.role === 'assistant'
      ? `<div class="message-actions"><button class="ghost-button speak-message" data-index="${index}" type="button">朗读</button></div>`
      : '';
    return `
      <div class="message-row ${item.role === 'assistant' ? 'assistant' : 'user'} reveal">
        <div class="message-badge">${item.role === 'assistant' ? '教练' : '你'}</div>
        <article class="message-bubble">
          ${attachment}
          ${generated}
          <p>${escapeHtml(item.text)}</p>
          ${actions}
        </article>
      </div>
    `;
  }).join('');

  thread.innerHTML = intro + rows + (state.chatBusy ? `
    <div class="message-row assistant reveal">
      <div class="message-badge">教练</div>
      <article class="message-bubble typing-bubble">
        <span></span><span></span><span></span>
      </article>
    </div>
  ` : '');

  thread.querySelectorAll('.speak-message').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.chatMessages[Number(button.dataset.index)];
      if (item) {
        speakText(item.text);
      }
    });
  });

  thread.scrollTop = thread.scrollHeight;
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    setChatStatus('当前浏览器不支持朗读回复。');
    return;
  }
  if (!text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  window.speechSynthesis.speak(utter);
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const rawText = (input?.value || '').trim();
  if (!rawText && !state.chatAttachment) {
    setChatStatus('先写一句话，或者附上一张图片。');
    return;
  }

  const userMessage = {
    role: 'user',
    text: rawText || '请先帮我看这张图片，然后陪我聊聊现在的感受。',
    imageDataUrl: state.chatAttachment ? state.chatAttachment.dataUrl : null,
  };
  setChatStarted(true);
  state.chatMessages.push(userMessage);
  persistChatMessages();
  if (input) input.value = '';
  await sendChatMessageFromState();
}

async function sendChatMessageFromState() {
  state.chatLastChoiceCard = null;
  state.chatBusy = true;
  renderChatMessages();
  renderChatFollowups();
  setChatStatus('正在回复…');

  try {
    const result = await api('/api/chat/completions', {
      method: 'POST',
      body: {
        messages: toApiMessages(),
        choiceFlowState: state.chatChoiceFlowState,
      },
    });

    const assistantText = result.choices?.[0]?.message?.content || '我先接住你，再继续。';
    state.chatMessages.push({
      role: 'assistant',
      text: assistantText,
      generatedImageUrl: result.lifecoach?.processing?.generatedImageUrl || null,
    });
    state.chatLastAssistantText = assistantText;
    state.chatLastChoiceCard = result.lifecoach.choiceCard || null;
    state.chatChoiceFlowState = result.lifecoach.choiceFlowState || null;
    persistChatMessages();
    renderChatInspector(result);
    setChatStatus(result.lifecoach.processing.generatedImageUrl ? '图像已生成' : '已回复');
  } catch (error) {
    setChatStatus(error.message || '聊天请求失败');
    throw error;
  } finally {
    state.chatBusy = false;
    state.chatAttachment = null;
    renderChatAttachments();
    renderChatMessages();
    renderChatFollowups();
  }
}

function bindChatPage() {
  restoreChatMessages();
  setChatStarted(true);
  renderChatMessages();
  renderChatAttachments();
  renderPlanCard();
  renderChatFollowups();

  document.getElementById('chat-orb-button')?.addEventListener('click', () => {
    setChatStarted(true);
    document.getElementById('chat-input')?.focus();
  });

  document.getElementById('new-chat-button')?.addEventListener('click', () => {
    state.chatMessages = [];
    state.chatLastAssistantText = '';
    state.chatLastChoiceCard = null;
    state.chatChoiceFlowState = null;
    resetPlanState();
    persistChatMessages();
    setChatStarted(true);
    renderChatInspector(null);
    renderChatMessages();
    renderPlanCard();
    renderChatFollowups();
    setText('chat-sidebar-user', state.me?.user?.displayName || '对味聊天');
    setChatStatus('新对话');
    document.getElementById('chat-input')?.focus();
  });

  document.getElementById('start-plan-button')?.addEventListener('click', async () => {
    const seedText = document.getElementById('chat-input')?.value.trim()
      || state.chatMessages.slice().reverse().find((item) => item.role === 'user')?.text
      || '';
    const result = await api('/api/chat/plan/start', {
      method: 'POST',
      body: { seedText },
    });
    state.planQuestionnaire = result.questionnaire;
    state.planStepIndex = 0;
    state.planAnswers = {};
    renderPlanCard();
    setChatStarted(true);
    setChatStatus(result.questionnaire?.summary || '进入 Plan');
  });

  document.getElementById('chat-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await sendChatMessage();
    } catch {}
  });

  document.querySelectorAll('[data-chat-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = button.dataset.chatPrompt || '';
        input.focus();
      }
    });
  });

  document.getElementById('chat-image-input')?.addEventListener('change', async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    state.chatAttachment = {
      name: file.name,
      dataUrl,
    };
    renderChatAttachments();
    setChatStatus('已加入图片');
    setChatStarted(true);
  });

  const recognition = initSpeechRecognition();
  document.getElementById('chat-voice-button')?.addEventListener('click', () => {
    (async () => {
      if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        return;
      }

      if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          state.mediaChunks = [];
          state.mediaRecorder = new MediaRecorder(stream);
          state.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              state.mediaChunks.push(event.data);
            }
          };
          state.mediaRecorder.onstop = async () => {
            state.isRecording = false;
            const audioBlob = new Blob(state.mediaChunks, { type: state.mediaRecorder.mimeType || 'audio/webm' });
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(audioBlob);
            });
            const result = await api('/api/audio/transcriptions', {
              method: 'POST',
              body: {
                audioDataUrl: dataUrl,
                language: 'zh',
              },
            });
            const input = document.getElementById('chat-input');
            if (input) {
              input.value = input.value ? `${input.value} ${result.text}` : result.text;
            }
            setChatStatus('语音已转文字');
            stream.getTracks().forEach((track) => {
              track.stop();
            });
          };
          state.mediaRecorder.start();
          state.isRecording = true;
          setChatStarted(true);
          setChatStatus('正在录音…');
          return;
        } catch {
          setChatStatus('麦克风不可用，回退浏览器识别');
        }
      }

      if (!recognition) {
        setChatStatus('当前浏览器不支持语音输入');
        return;
      }
      recognition.start();
      setChatStarted(true);
      setChatStatus('正在听…');
    })();
  });
  if (recognition) {
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = input.value ? `${input.value} ${transcript}` : transcript;
      }
      setChatStatus('语音已转文字');
    };
    recognition.onerror = () => {
      setChatStatus('语音识别失败');
    };
  }

  document.getElementById('chat-read-button')?.addEventListener('click', () => {
    (async () => {
      try {
        const { blob } = await apiBinary('/api/audio/speech', {
          text: state.chatLastAssistantText,
          voice: 'alloy',
          format: 'wav',
        });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().finally(() => {
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        });
      } catch {
        speakText(state.chatLastAssistantText);
      }
    })();
  });
}

async function initPage() {
  initThemeSelector();
  bindLogoutButtons();
  bindAuthForms();
  bindKeyCreateForm();
  bindPageButtons();

  if (protectedPage()) {
    const ok = await loadSessionData();
    if (!ok) return;

    if (pageName() === 'dashboard') {
      renderDashboard();
    }
    if (pageName() === 'keys') {
      renderKeys();
      if (window.location.hash === '#integration-section') {
        await loadIntegration();
      }
      if (window.location.hash === '#models-section') {
        await loadModels();
      }
    }
    if (pageName() === 'integration') {
      await loadIntegration();
    }
    if (pageName() === 'models') {
      await loadModels();
    }
    if (pageName() === 'chat') {
      bindChatPage();
      setText('chat-sidebar-user', state.me.user.displayName || '对味聊天');
      renderChatInspector(null);
      document.getElementById('chat-input')?.focus();
    }
  }
}

initPage().catch((error) => {
  if (protectedPage() && error.message === 'unauthorized') {
    logout();
    return;
  }

  const fallbackTargets = ['auth-notice', 'register-notice', 'key-output', 'snippet-output', 'models-grid', 'chat-status-note'];
  for (const target of fallbackTargets) {
    const node = document.getElementById(target);
    if (node) {
      node.textContent = error.message || String(error);
      break;
    }
  }
});
