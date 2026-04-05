const fs = require('fs');
const path = require('path');

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readRequestBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(text);
}

function sendHtml(res, statusCode, html, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    ...headers,
  });
  res.end(html);
}

function sendFile(res, filePath, contentType) {
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
  });
  res.end(data);
}

function matchPath(pathname, pattern) {
  const actual = pathname.split('/').filter(Boolean);
  const expected = pattern.split('/').filter(Boolean);
  if (actual.length !== expected.length) return null;

  const params = {};
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) {
      params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
      continue;
    }
    if (expected[i] !== actual[i]) return null;
  }

  return params;
}

function resolveStaticFile(rootDir, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(rootDir, normalized);
}

module.exports = {
  readJsonBody,
  sendJson,
  sendText,
  sendHtml,
  sendFile,
  matchPath,
  resolveStaticFile,
};
