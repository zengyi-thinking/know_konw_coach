const crypto = require('crypto');
const { readDatabase, updateDatabase, nowIso, createId } = require('./database');

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function createRawApiKey() {
  return `lc_live_${crypto.randomBytes(24).toString('hex')}`;
}

function sanitizeApiKey(record) {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    status: record.status,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt || null,
    scopes: record.scopes || [],
  };
}

function listApiKeys(userId, env = process.env) {
  const data = readDatabase(env);
  return data.apiKeys
    .filter((item) => item.userId === userId)
    .map(sanitizeApiKey);
}

function createApiKey(userId, input, env = process.env) {
  const name = String(input.name || '').trim() || 'OpenClaw Lifecoach Key';
  const rawKey = createRawApiKey();
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 18);

  return updateDatabase((data) => {
    const record = {
      id: createId('key'),
      userId,
      name,
      prefix,
      keyHash,
      status: 'active',
      createdAt: nowIso(),
      lastUsedAt: null,
      revokedAt: null,
      scopes: ['chat', 'vision', 'audio', 'speech', 'cerebellum'],
    };
    data.apiKeys.push(record);
    return {
      apiKey: sanitizeApiKey(record),
      rawKey,
    };
  }, env);
}

function revokeApiKey(userId, keyId, env = process.env) {
  return updateDatabase((data) => {
    const record = data.apiKeys.find((item) => item.id === keyId && item.userId === userId);
    if (!record) {
      throw new Error('api_key_not_found');
    }
    record.status = 'revoked';
    record.revokedAt = nowIso();
    return sanitizeApiKey(record);
  }, env);
}

function authenticateApiKey(rawKey, env = process.env) {
  const data = readDatabase(env);
  const keyHash = hashKey(String(rawKey || ''));
  const record = data.apiKeys.find((item) => item.keyHash === keyHash && item.status === 'active');
  if (!record) return null;

  const user = data.users.find((item) => item.id === record.userId);
  const entitlements = data.entitlements.find((item) => item.userId === record.userId) || null;

  return {
    apiKey: sanitizeApiKey(record),
    rawPrefix: record.prefix,
    user,
    entitlements,
  };
}

function touchApiKey(rawKey, env = process.env) {
  const keyHash = hashKey(String(rawKey || ''));
  updateDatabase((data) => {
    const record = data.apiKeys.find((item) => item.keyHash === keyHash && item.status === 'active');
    if (record) {
      record.lastUsedAt = nowIso();
    }
  }, env);
}

module.exports = {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  authenticateApiKey,
  touchApiKey,
};
