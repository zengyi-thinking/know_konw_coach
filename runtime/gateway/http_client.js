async function postJson(url, payload, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    ...(options.headers || {}),
  };

  if (options.mockResponse) {
    return {
      ok: true,
      status: 200,
      data: options.mockResponse,
      meta: {
        url,
        apiKeyPresent: Boolean(options.apiKey),
      },
    };
  }

  if (!globalThis.fetch) {
    return {
      ok: false,
      status: 500,
      error: 'fetch_unavailable',
      meta: {
        url,
        apiKeyPresent: Boolean(options.apiKey),
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs || 30000),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : 'upstream_request_failed',
      meta: {
        url,
        apiKeyPresent: Boolean(options.apiKey),
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error && error.name ? error.name : 'network_error',
      details: error && error.message ? error.message : String(error),
      meta: {
        url,
        apiKeyPresent: Boolean(options.apiKey),
      },
    };
  }
}

module.exports = {
  postJson,
};
