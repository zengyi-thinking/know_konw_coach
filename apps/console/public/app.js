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
  chatTodoList: null,
  chatMode: 'chat',
  planQuestionnaire: null,
  planAnswers: {},
  planActiveQuestionIndex: 0,
  planDirection: 'next',
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

function formatInlineRichText(value) {
  return escapeHtml(value || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderAssistantRichText(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraphLines = [];
  let listType = null;
  let listStart = 1;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(`<p>${formatInlineRichText(paragraphLines.join('\n')).replace(/\n/g, '<br>')}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    const attrs = listType === 'ol' && listStart > 1 ? ` start="${listStart}"` : '';
    blocks.push(`<${tag}${attrs}>${listItems.map((item) => `<li>${formatInlineRichText(item)}</li>`).join('')}</${tag}>`);
    listType = null;
    listStart = 1;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s*(.+)$/);
    const bulletMatch = line.match(/^[-*]\s*(.+)$/) || line.match(/^-(\S.*)$/);

    if (orderedMatch) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        listStart = Number(orderedMatch[1]) || 1;
      }
      listItems.push(orderedMatch[2]);
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.length ? blocks.join('') : `<p>${formatInlineRichText(text)}</p>`;
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function syncChatInputPlaceholder() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  if (state.chatMode === 'plan') {
    input.placeholder = '先把你的问题发出来，我会根据这条问题生成规划卡…';
    return;
  }

  input.placeholder = '和 Lifecoach 直接说话…';
}

function renderChatModeSwitch() {
  document.querySelectorAll('[data-chat-mode]').forEach((button) => {
    const active = button.dataset.chatMode === state.chatMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  document.body.dataset.chatMode = state.chatMode;
  document.body.classList.toggle('chat-plan-mode', state.chatMode === 'plan');
  syncChatInputPlaceholder();
}

function applyChatMode(mode) {
  state.chatMode = mode === 'plan' ? 'plan' : 'chat';
  renderChatModeSwitch();
  renderChatFollowups();
}

function activatePlanMode() {
  applyChatMode('plan');
  setChatStarted(true);
  setChatStatus('规划模式：先发出你的问题，我再抛出 3 个问题让你填写');
  document.getElementById('chat-input')?.focus();
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

function getScopedStorageKey(baseKey) {
  const userId = state.me?.user?.id || 'anonymous';
  return `${baseKey}:${userId}`;
}

function persistChatTodoList() {
  localStorage.setItem(getScopedStorageKey('lifecoach_console_todo_list'), JSON.stringify(state.chatTodoList));
}

function persistChatMessages() {
  localStorage.setItem(getScopedStorageKey('lifecoach_console_chat_messages'), JSON.stringify(state.chatMessages));
  localStorage.setItem(getScopedStorageKey('lifecoach_console_choice_flow'), JSON.stringify(state.chatChoiceFlowState));
}

function restoreChatMessages() {
  try {
    const raw = localStorage.getItem(getScopedStorageKey('lifecoach_console_chat_messages'));
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.chatMessages = parsed;
    }
  } catch {}
  try {
    const flowRaw = localStorage.getItem(getScopedStorageKey('lifecoach_console_choice_flow'));
    if (flowRaw) {
      state.chatChoiceFlowState = JSON.parse(flowRaw);
    }
  } catch {}
  try {
    const todoRaw = localStorage.getItem(getScopedStorageKey('lifecoach_console_todo_list'));
    if (todoRaw) {
      state.chatTodoList = JSON.parse(todoRaw);
    }
  } catch {}
}

function buildTodoContextSummary() {
  const lastUserMessage = state.chatMessages.slice().reverse().find((item) => item.role === 'user')?.text || '';
  const routeOrWorkflow = document.getElementById('chat-sidebar-user')?.textContent || '';
  return [lastUserMessage, state.chatLastAssistantText, routeOrWorkflow]
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
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

async function attachChatImageFile(file, sourceLabel = '图片') {
  if (!file || !String(file.type || '').startsWith('image/')) {
    setChatStatus('当前只支持图片附件');
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  state.chatAttachment = {
    name: file.name || `${sourceLabel}.png`,
    dataUrl,
  };
  renderChatAttachments();
  setChatStarted(true);
  setChatStatus(`已加入${sourceLabel}，现在可以直接发送`);
}

function canGenerateTodoList() {
  const userCount = state.chatMessages.filter((item) => item.role === 'user').length;
  return userCount >= 2 && state.chatMessages.length >= 4;
}

function statusLabel(status) {
  if (status === 'done') return '已完成';
  if (status === 'in_progress') return '进行中';
  return '待开始';
}

function renderChatTodoList() {
  const node = document.getElementById('chat-todo-list');
  const button = document.getElementById('generate-todo-button');
  const eligible = canGenerateTodoList();
  if (button) {
    button.disabled = state.chatBusy || !eligible;
    button.title = eligible ? '根据当前对话生成教练待办' : '先多聊几句，再生成 To-Do';
  }
  if (!node) return;

  if (!state.chatTodoList || !Array.isArray(state.chatTodoList.items) || !state.chatTodoList.items.length) {
    node.innerHTML = '<div class="todo-empty-state">多聊几句后，点击右上角生成 To-Do。</div>';
    return;
  }

  node.innerHTML = `
    <article class="todo-sidebar-card reveal">
      <div class="todo-sidebar-head">
        <strong>${escapeHtml(state.chatTodoList.title || '教练 To-Do')}</strong>
        <div class="todo-sidebar-summary">${escapeHtml(state.chatTodoList.summary || '我先把当前对话收束成几个可推进动作。')}</div>
      </div>
      <div class="todo-sidebar-items">
        ${(state.chatTodoList.items || []).map((item) => `
          <section class="todo-item todo-status-${escapeHtml(item.status || 'planned')}">
            <div class="todo-item-head">
              <strong>${escapeHtml(item.title || '')}</strong>
              <span class="todo-deadline">${escapeHtml(item.deadline || '待定')}</span>
            </div>
            <p class="todo-item-copy">${escapeHtml(item.description || '')}</p>
            <div class="todo-progress-row">
              <div class="todo-progress-meta">
                <span class="todo-status-label">${escapeHtml(statusLabel(item.status || 'planned'))}</span>
                <span>${Math.max(0, Math.min(100, Number(item.progress) || 0))}%</span>
              </div>
              <div class="todo-progress-bar"><span class="todo-progress-fill" style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></span></div>
            </div>
          </section>
        `).join('')}
      </div>
    </article>
  `;
}

async function generateChatTodoList() {
  if (!canGenerateTodoList()) {
    setChatStatus('先多聊几句，我再帮你收束成 To-Do。');
    return;
  }

  const button = document.getElementById('generate-todo-button');
  if (button) {
    button.disabled = true;
    button.textContent = '生成中…';
  }

  try {
    const result = await api('/api/chat/todo/generate', {
      method: 'POST',
      body: {
        messages: toApiMessages(),
        sidebarSummary: buildTodoContextSummary(),
        lastAssistantText: state.chatLastAssistantText || '',
      },
    });
    state.chatTodoList = result.todoList;
    persistChatTodoList();
    renderChatTodoList();
    setChatStatus('已生成教练 To-Do');
  } catch (error) {
    setChatStatus(error.message || 'To-Do 生成失败');
  } finally {
    if (button) {
      button.textContent = '生成 To-Do';
    }
    renderChatTodoList();
  }
}

function resetPlanState() {
  state.planQuestionnaire = null;
  state.planAnswers = {};
  state.planActiveQuestionIndex = 0;
  state.planDirection = 'next';
}

function renderPlanQuestionnaire() {
  const node = document.getElementById('chat-followups');
  if (!node) return;
  const questionnaireActive = state.chatMode === 'plan'
    && Array.isArray(state.planQuestionnaire?.questions)
    && state.planQuestionnaire.questions.length > 0;
  document.body.classList.toggle('plan-questionnaire-active', questionnaireActive);

  if (state.chatMode !== 'plan') {
    node.innerHTML = '';
    return;
  }

  if (!state.planQuestionnaire || !Array.isArray(state.planQuestionnaire.questions) || state.planQuestionnaire.questions.length === 0) {
    node.innerHTML = '';
    return;
  }

  const questions = state.planQuestionnaire.questions || [];
  const totalQuestions = questions.length;
  if (state.planActiveQuestionIndex >= totalQuestions) {
    state.planActiveQuestionIndex = totalQuestions - 1;
  }
  if (state.planActiveQuestionIndex < 0) {
    state.planActiveQuestionIndex = 0;
  }
  const activeIndex = state.planActiveQuestionIndex;
  const activeQuestion = questions[activeIndex];
  if (!activeQuestion) {
    node.innerHTML = '';
    return;
  }
  const planSeedText = String(
    state.planQuestionnaire.seedText
      || state.chatMessages.slice().reverse().find((item) => item.role === 'user')?.text
      || '',
  ).trim();
  const activeAnswer = String(state.planAnswers[activeQuestion.id] || '');
  const answeredCount = questions.filter((question) => String(state.planAnswers[question.id] || '').trim()).length;
  node.innerHTML = `
    <article class="plan-questionnaire-card reveal">
      <div class="plan-questionnaire-head">
        <div>
          <span class="choice-stream-kicker">规划问答</span>
          <strong>${escapeHtml(state.planQuestionnaire.title || '先补充几个关键信息')}</strong>
        </div>
        <div class="plan-questionnaire-side">
          <div class="plan-questionnaire-progress">已完成 ${answeredCount} / ${totalQuestions}</div>
          <div class="plan-question-switchers">
            <button class="ghost-button plan-switch-button" id="plan-prev-question" type="button" ${activeIndex <= 0 ? 'disabled' : ''}>上一张</button>
            <button class="ghost-button plan-switch-button" id="plan-next-question" type="button" ${activeIndex >= totalQuestions - 1 ? 'disabled' : ''}>下一张</button>
          </div>
        </div>
      </div>
      ${planSeedText ? `
        <div class="plan-problem-strip">
          <span>当前问题</span>
          <strong>${escapeHtml(planSeedText)}</strong>
        </div>
      ` : ''}
      <div class="plan-step-rail">
        ${questions.map((question, questionIndex) => {
          const answer = String(state.planAnswers[question.id] || '').trim();
          const status = questionIndex === activeIndex ? 'current' : (answer ? 'done' : 'upcoming');
          return `
            <button class="plan-step ${status}" type="button" data-plan-step-index="${questionIndex}">
              <span class="plan-step-badge">${answer ? '✓' : questionIndex + 1}</span>
              <span class="plan-step-copy">
                <strong>问题 ${questionIndex + 1}</strong>
                <small>${answer ? `已填写：${escapeHtml(answer)}` : '待填写'}</small>
              </span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="plan-question-stage">
        <section class="plan-question-item active plan-card-direction-${escapeHtml(state.planDirection)}" data-plan-question-id="${escapeHtml(activeQuestion.id)}" data-plan-question-index="${activeIndex}">
          <div class="plan-question-title">
            <span>${activeIndex + 1}</span>
            <div class="plan-question-title-copy">
              <strong>${escapeHtml(activeQuestion.question || '')}</strong>
              <small>左右切换问题卡；返回上一张后也可以重新修改答案。</small>
            </div>
          </div>
          <div class="plan-question-body">
            <div class="plan-question-options">
              ${(activeQuestion.options || []).map((option, optionIndex) => `
                <button class="plan-question-option ${activeAnswer === option.title ? 'active' : ''}" type="button" data-plan-question-option="${escapeHtml(activeQuestion.id)}:${optionIndex}">
                  <span class="plan-question-option-key">${escapeHtml(option.key || String(optionIndex + 1))}</span>
                  <span class="plan-question-option-copy">
                    <strong>${escapeHtml(option.title || '')}</strong>
                    ${option.subtitle ? `<small>${escapeHtml(option.subtitle)}</small>` : ''}
                  </span>
                </button>
              `).join('')}
            </div>
            <textarea class="plan-answer-input" data-plan-answer-input="${escapeHtml(activeQuestion.id)}" rows="3" placeholder="也可以在这里直接写你自己的回答…">${escapeHtml(activeAnswer)}</textarea>
          </div>
        </section>
      </div>
      <div class="plan-question-actions">
        <button class="ghost-button" id="plan-reset-button" type="button">清空回答</button>
        <button class="button primary" id="plan-submit-button" type="button">生成规划</button>
      </div>
    </article>
  `;

  node.querySelectorAll('[data-plan-question-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const [questionId, optionIndexRaw] = String(button.dataset.planQuestionOption || '').split(':');
      const questionIndex = questions.findIndex((item) => item.id === questionId);
      const question = questions[questionIndex];
      const optionIndex = Number(optionIndexRaw);
      const option = question?.options?.[optionIndex];
      if (!question || !option) return;
      state.planAnswers[question.id] = option.title || '';
      state.planDirection = 'next';
      state.planActiveQuestionIndex = Math.min(questionIndex + 1, totalQuestions - 1);
      renderPlanQuestionnaire();
    });
  });

  node.querySelectorAll('[data-plan-answer-input]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const questionId = event.currentTarget.dataset.planAnswerInput;
      state.planAnswers[questionId] = event.currentTarget.value;
    });
  });

  node.querySelectorAll('[data-plan-step-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextIndex = Number(button.dataset.planStepIndex);
      if (Number.isNaN(nextIndex) || nextIndex === state.planActiveQuestionIndex) return;
      state.planDirection = nextIndex > state.planActiveQuestionIndex ? 'next' : 'prev';
      state.planActiveQuestionIndex = nextIndex;
      renderPlanQuestionnaire();
    });
  });

  document.getElementById('plan-reset-button')?.addEventListener('click', () => {
    state.planAnswers = {};
    state.planActiveQuestionIndex = 0;
    state.planDirection = 'next';
    renderPlanQuestionnaire();
  });

  document.getElementById('plan-prev-question')?.addEventListener('click', () => {
    state.planDirection = 'prev';
    state.planActiveQuestionIndex = Math.max(0, state.planActiveQuestionIndex - 1);
    renderPlanQuestionnaire();
  });

  document.getElementById('plan-next-question')?.addEventListener('click', () => {
    state.planDirection = 'next';
    state.planActiveQuestionIndex = Math.min(totalQuestions - 1, state.planActiveQuestionIndex + 1);
    renderPlanQuestionnaire();
  });

  document.getElementById('plan-submit-button')?.addEventListener('click', async () => {
    const unanswered = state.planQuestionnaire.questions.filter((question) => !String(state.planAnswers[question.id] || '').trim());
    if (unanswered.length) {
      setChatStatus(`还差 ${unanswered.length} 个问题没有填写`);
      return;
    }

    const summaryLines = ['我补充了这三张规划卡：'];
    for (const question of state.planQuestionnaire.questions) {
      summaryLines.push(`Q: ${question.question}`);
      summaryLines.push(`A: ${String(state.planAnswers[question.id] || '').trim()}`);
    }

    state.chatMessages.push({
      role: 'user',
      text: summaryLines.join('\n'),
    });
    persistChatMessages();

    const submission = {
      mode: 'bulk_questionnaire',
      questionnaire: state.planQuestionnaire,
      answers: { ...state.planAnswers },
    };
    resetPlanState();
    renderPlanQuestionnaire();
    setChatStatus('正在根据三张规划卡生成规划…');
    try {
      await sendChatMessageFromState({ planResponseState: submission });
    } catch {}
  });
}

function renderChatInspector(meta) {
  if (!meta?.lifecoach) return;

  const workflow = meta.lifecoach.workflow?.title || meta.lifecoach.workflow?.id || '';
  const route = meta.lifecoach.route?.primarySkill || '';
  const summary = workflow || route;
  if (summary) {
    setText('chat-sidebar-user', summary);
  }
  const note = meta.lifecoach.workflow?.stageDescription
    || meta.lifecoach.timelineOutcome?.summary
    || meta.lifecoach.cerebellum?.recommendation
    || '教练会根据你的对话、主线和最近状态，持续更新这张用户画像。';
  setText('chat-sidebar-note', note);
}

function renderChatFollowups() {
  renderPlanQuestionnaire();
}

function renderChatMessages() {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;

  const intro = `
    <div class="message-row assistant reveal">
      <div class="message-badge">教练</div>
      <article class="message-bubble">
        <div class="message-richtext"><p>说说你现在最想理清的一层。</p></div>
      </article>
    </div>
  `;

  const rows = state.chatMessages.map((item, index) => {
    const attachment = item.imageDataUrl ? `<img class="message-image" src="${item.imageDataUrl}" alt="user attachment">` : '';
    const generated = item.generatedImageUrl ? `<img class="message-image generated-image" src="${item.generatedImageUrl}" alt="generated image">` : '';
    const actions = item.role === 'assistant'
      ? `<div class="message-actions"><button class="ghost-button speak-message" data-index="${index}" type="button">朗读</button></div>`
      : '';
    const textContent = item.role === 'assistant'
      ? `<div class="message-richtext">${renderAssistantRichText(item.text)}</div>`
      : `<p>${escapeHtml(item.text)}</p>`;
    return `
      <div class="message-row ${item.role === 'assistant' ? 'assistant' : 'user'} reveal">
        <div class="message-badge">${item.role === 'assistant' ? '教练' : '你'}</div>
        <article class="message-bubble">
          ${attachment}
          ${generated}
          ${textContent}
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
  renderChatTodoList();
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

  if (state.chatMode === 'plan' && state.planQuestionnaire) {
    setChatStatus('先把右侧生成的三张规划卡填完，再点“生成规划”');
    return;
  }

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

async function sendChatMessageFromState(extraBody = {}) {
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
        choiceFlowState: state.chatMode === 'plan' ? state.chatChoiceFlowState : null,
        uiMode: state.chatMode,
        ...extraBody,
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
    state.planQuestionnaire = result.lifecoach.planQuestionnaire || null;
    if (!state.planQuestionnaire) {
      state.planAnswers = {};
    }
    persistChatMessages();
    renderChatInspector(result);
    if (result.lifecoach?.processing?.generatedImageUrl) {
      setChatStatus('图像已生成');
    } else if (state.chatMode === 'plan' && state.planQuestionnaire) {
      setChatStatus('已根据你的问题生成三张规划卡');
    } else {
      setChatStatus('已回复');
    }
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
  applyChatMode('chat');
  renderChatMessages();
  renderChatAttachments();
  renderChatFollowups();
  renderChatTodoList();

  document.getElementById('chat-orb-button')?.addEventListener('click', () => {
    setChatStarted(true);
    document.getElementById('chat-input')?.focus();
  });

  document.getElementById('new-chat-button')?.addEventListener('click', () => {
    state.chatMessages = [];
    state.chatLastAssistantText = '';
    state.chatLastChoiceCard = null;
    state.chatChoiceFlowState = null;
    state.chatTodoList = null;
    resetPlanState();
    persistChatMessages();
    persistChatTodoList();
    setChatStarted(true);
    applyChatMode('chat');
    renderChatInspector(null);
    renderChatMessages();
    renderChatFollowups();
    renderChatTodoList();
    setText('chat-sidebar-user', state.me?.user?.displayName || '对味聊天');
    setText('chat-sidebar-note', '教练会根据你的对话、主线和最近状态，持续更新这张用户画像。');
    setChatStatus('新对话');
    document.getElementById('chat-input')?.focus();
  });

  document.getElementById('generate-todo-button')?.addEventListener('click', async () => {
    await generateChatTodoList();
  });

  document.querySelectorAll('[data-chat-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.chatMode;
      if (mode === 'plan') {
        activatePlanMode();
        return;
      }

      applyChatMode('chat');
      state.chatLastChoiceCard = null;
      state.chatChoiceFlowState = null;
      resetPlanState();
      persistChatMessages();
      renderChatFollowups();
      setChatStatus('聊天模式');
      document.getElementById('chat-input')?.focus();
    });
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
    await attachChatImageFile(file, '图片');
    event.currentTarget.value = '';
  });

  document.getElementById('chat-input')?.addEventListener('paste', async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => String(item.type || '').startsWith('image/'));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    await attachChatImageFile(file, '剪贴板图片');

    const text = event.clipboardData?.getData('text/plain') || '';
    if (text) {
      const input = event.currentTarget;
      const start = Number(input.selectionStart || 0);
      const end = Number(input.selectionEnd || 0);
      const nextValue = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
      input.value = nextValue;
      input.selectionStart = input.selectionEnd = start + text.length;
    }
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
      setText('chat-sidebar-note', '教练会根据你的对话、主线和最近状态，持续更新这张用户画像。');
      renderChatInspector(null);
      document.getElementById('chat-input')?.focus();
    } else {
      restoreChatMessages();
      renderChatTodoList();
      setText('chat-sidebar-user', state.me.user.displayName || '你的当前画像');
      setText('chat-sidebar-note', state.chatLastAssistantText || '进入聊天并生成 To-Do 后，这里会同步显示你的当前主线与推进动作。');
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
