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
  chatLastFollowups: [],
  chatBusy: false,
};

function pageName() {
  return document.body.dataset.page || 'landing';
}

function protectedPage() {
  return ['dashboard', 'keys', 'integration', 'models', 'chat'].includes(pageName());
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
}

function toApiMessages() {
  return state.chatMessages.map((item) => {
    if (item.role === 'assistant') {
      return {
        role: 'assistant',
        content: item.text,
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
        <span>图片将随本条消息一起发给 Lifecoach</span>
      </div>
      <button class="ghost-button" id="remove-chat-attachment" type="button">移除</button>
    </article>
  `;

  document.getElementById('remove-chat-attachment')?.addEventListener('click', () => {
    state.chatAttachment = null;
    renderChatAttachments();
  });
}

function renderChatInspector(meta) {
  const node = document.getElementById('chat-inspector');
  if (!node) return;

  const route = meta?.lifecoach?.route?.primarySkill || '等待对话';
  const workflow = meta?.lifecoach?.workflow?.stageId || meta?.lifecoach?.workflow?.id || '等待激活';
  const flavor = meta?.lifecoach?.flavorScores
    ? `${meta.lifecoach.flavorScores.overall} / ${meta.lifecoach.flavorScores.band}`
    : '等待计算';

  node.innerHTML = [
    { label: '主 skill', value: route },
    { label: '工作流', value: workflow },
    { label: '对味分', value: flavor },
  ].map((row) => `
    <div class="detail-row">
      <span>${row.label}</span>
      <strong>${escapeHtml(row.value)}</strong>
    </div>
  `).join('');
}

function renderChatFollowups() {
  const node = document.getElementById('chat-followups');
  if (!node) return;

  if (!state.chatLastFollowups.length) {
    node.innerHTML = '';
    return;
  }

  node.innerHTML = `
    <div class="followup-label">继续追问</div>
    <div class="followup-grid">
      ${state.chatLastFollowups.map((item, index) => `
        <button class="followup-chip" type="button" data-followup-index="${index}">${escapeHtml(item)}</button>
      `).join('')}
    </div>
  `;

  node.querySelectorAll('.followup-chip').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.followupIndex);
      const choice = state.chatLastFollowups[index] || '';
      const cleanChoice = choice.replace(/^[A-D]\.\s*/, '');
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = cleanChoice;
      }
      try {
        await sendChatMessage();
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
        <p>我在这儿。你可以直接说最近的困惑，也可以带一张图片过来，我们先一起看清楚现在最值得处理的那一层。</p>
      </article>
    </div>
  `;

  const rows = state.chatMessages.map((item, index) => {
    const attachment = item.imageDataUrl ? `<img class="message-image" src="${item.imageDataUrl}" alt="user attachment">` : '';
    const actions = item.role === 'assistant'
      ? `<div class="message-actions"><button class="ghost-button speak-message" data-index="${index}" type="button">朗读</button></div>`
      : '';
    return `
      <div class="message-row ${item.role === 'assistant' ? 'assistant' : 'user'} reveal">
        <div class="message-badge">${item.role === 'assistant' ? '教练' : '你'}</div>
        <article class="message-bubble">
          ${attachment}
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
  state.chatMessages.push(userMessage);
  persistChatMessages();
  state.chatLastFollowups = [];
  state.chatBusy = true;
  renderChatMessages();
  renderChatFollowups();
  setChatStatus('Lifecoach 正在用你的调料包内核收束当前问题…');

  try {
    const result = await api('/api/chat/completions', {
      method: 'POST',
      body: {
        messages: toApiMessages(),
      },
    });

    const assistantText = result.choices?.[0]?.message?.content || '我先接住你，再继续。';
    state.chatMessages.push({
      role: 'assistant',
      text: assistantText,
    });
    state.chatLastAssistantText = assistantText;
    state.chatLastFollowups = Array.isArray(result.lifecoach.followups) ? result.lifecoach.followups : [];
    persistChatMessages();
    renderChatInspector(result);
    setText('chat-sidebar-user', `${state.me.user.displayName}，这轮我更倾向于从 ${result.lifecoach.route.primarySkill} 这层陪你往前走。`);
    setText('chat-capability-pill', result.lifecoach.processing.modality === 'image' ? '图片对话已参与' : '文字对话进行中');
    setText('chat-cerebellum-pill', result.lifecoach.processing.modelSource === 'upstream-relay' ? `真实模型：${result.model}` : `小脑：${result.lifecoach.cerebellum.focus}`);
    setChatStatus(`已完成：${result.lifecoach.route.primarySkill} · 对味分 ${result.lifecoach.flavorScores.overall} · ${result.lifecoach.processing.modelSource === 'upstream-relay' ? '真实模型已调用' : '本地内核回退'}`);
  } catch (error) {
    setChatStatus(error.message || '聊天请求失败');
    throw error;
  } finally {
    state.chatBusy = false;
    state.chatAttachment = null;
    if (input) input.value = '';
    renderChatAttachments();
    renderChatMessages();
    renderChatFollowups();
  }
}

function bindChatPage() {
  restoreChatMessages();
  renderChatMessages();
  renderChatAttachments();
  renderChatFollowups();

  document.getElementById('new-chat-button')?.addEventListener('click', () => {
    state.chatMessages = [];
    state.chatLastAssistantText = '';
    state.chatLastFollowups = [];
    persistChatMessages();
    renderChatInspector(null);
    renderChatMessages();
    renderChatFollowups();
    setChatStatus('已开始新对话。');
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
    setChatStatus('图片已加入，这条消息会以多模态方式发送。');
  });

  const recognition = initSpeechRecognition();
  document.getElementById('chat-voice-button')?.addEventListener('click', () => {
    if (!recognition) {
      setChatStatus('当前浏览器不支持语音输入，请直接输入文字。');
      return;
    }
    recognition.start();
    setChatStatus('正在听你说话…');
  });
  if (recognition) {
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = input.value ? `${input.value} ${transcript}` : transcript;
      }
      setChatStatus('语音已转成文字，可以继续发给 Lifecoach。');
    };
    recognition.onerror = () => {
      setChatStatus('语音识别失败，请重试或改用文字输入。');
    };
  }

  document.getElementById('chat-read-button')?.addEventListener('click', () => {
    speakText(state.chatLastAssistantText);
  });
}

async function initPage() {
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
    }
    if (pageName() === 'integration') {
      await loadIntegration();
    }
    if (pageName() === 'models') {
      await loadModels();
    }
    if (pageName() === 'chat') {
      bindChatPage();
      setText('chat-sidebar-user', `${state.me.user.displayName}，你现在可以直接和你的 Lifecoach 内核聊天。`);
      renderChatInspector(null);
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
