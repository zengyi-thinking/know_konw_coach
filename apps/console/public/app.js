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
  chatStarted: false,
  chatMode: 'chat',
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

function setChatMode(mode) {
  state.chatMode = mode;
  document.querySelectorAll('[data-chat-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.chatMode === mode);
  });
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

  if (!state.chatLastFollowups.length) {
    node.innerHTML = '';
    return;
  }

  node.innerHTML = `
    <div class="followup-label">继续追问</div>
    <div class="followup-grid">
      ${state.chatLastFollowups.map((item, index) => `
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
      const choice = state.chatLastFollowups[index] || '';
      const label = typeof choice === 'string' ? choice : `${choice.key || ''}. ${choice.title || ''}`;
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
        <p>我在这儿。你可以直接说最近的困惑，也可以带一张图片过来，我们先一起看清楚现在最值得处理的那一层。</p>
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
    text: rawText || (state.chatMode === 'image' ? '请根据这个想法生成一张图。' : '请先帮我看这张图片，然后陪我聊聊现在的感受。'),
    imageDataUrl: state.chatAttachment ? state.chatAttachment.dataUrl : null,
  };
  setChatStarted(true);
  state.chatMessages.push(userMessage);
  persistChatMessages();
  if (input) input.value = '';
  await sendChatMessageFromState();
}

async function sendChatMessageFromState() {
  const input = document.getElementById('chat-input');
  state.chatLastFollowups = [];
  state.chatBusy = true;
  renderChatMessages();
  renderChatFollowups();
  setChatStatus(state.chatMode === 'image' ? '正在生成图像…' : '正在回复…');

  try {
    if (state.chatMode === 'image') {
      const imageResult = await api('/api/images/generations', {
        method: 'POST',
        body: {
          prompt: rawText || '生成一张柔和、温暖、像玻璃球一样带有情绪氛围的图像。',
          size: '1024x1024',
        },
      });

      const generatedText = imageResult.source === 'upstream-image-model'
        ? '我先为你生成了一张图像。'
        : '我先做了一张示意图。';

      state.chatMessages.push({
        role: 'assistant',
        text: generatedText,
        generatedImageUrl: imageResult.imageUrl || null,
      });
      state.chatLastAssistantText = generatedText;
      state.chatLastFollowups = [
        'A. 更暖一点',
        'B. 更像玻璃球',
        'C. 更安静一点',
        'D. 按我的情绪再改一版',
      ];
      persistChatMessages();
      setChatStatus(imageResult.source === 'upstream-image-model' ? '图像已生成' : '示意图已生成');
      return;
    }

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
    setChatStatus(result.lifecoach.processing.modelSource === 'upstream-relay' ? '已回复' : '已回复');
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
  renderChatFollowups();

  document.getElementById('chat-orb-button')?.addEventListener('click', () => {
    setChatStarted(true);
    document.getElementById('chat-input')?.focus();
  });

  document.querySelectorAll('[data-chat-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.chatMode || 'chat';
      setChatMode(mode);
      const input = document.getElementById('chat-input');
      if (!input) return;
      input.placeholder = mode === 'image'
        ? '描述你想生成的画面…'
        : mode === 'voice'
          ? '先说一句你想整理的心情…'
          : '和 Lifecoach 直接说话…';
    });
  });

  document.getElementById('new-chat-button')?.addEventListener('click', () => {
    state.chatMessages = [];
    state.chatLastAssistantText = '';
    state.chatLastFollowups = [];
    persistChatMessages();
    setChatStarted(true);
    renderChatInspector(null);
    renderChatMessages();
    renderChatFollowups();
    setText('chat-sidebar-user', state.me?.user?.displayName || '对味聊天');
    setChatStatus('新对话');
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
  });

  const recognition = initSpeechRecognition();
  document.getElementById('chat-voice-button')?.addEventListener('click', () => {
    if (!recognition) {
      setChatStatus('当前浏览器不支持语音输入');
      return;
    }
    recognition.start();
    setChatStatus('正在听…');
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

  document.getElementById('chat-generate-image-button')?.addEventListener('click', async () => {
    setChatMode('image');
    const input = document.getElementById('chat-input');
    if (input && !input.value.trim()) {
      input.value = '生成一张柔和、温暖、像玻璃球一样带有情绪氛围的图像。';
    }
    try {
      await sendChatMessage();
    } catch {}
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
      setText('chat-sidebar-user', state.me.user.displayName || '对味聊天');
      renderChatInspector(null);
      setChatMode('chat');
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
