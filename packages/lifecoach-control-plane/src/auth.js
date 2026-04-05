const crypto = require('crypto');
const { readDatabase, updateDatabase, nowIso, createId } = require('./database');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, derivedKey };
}

function verifyPassword(password, salt, expectedHash) {
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    planId: user.planId,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function ensureDefaultEntitlements(data, userId) {
  const existing = data.entitlements.find((item) => item.userId === userId);
  if (existing) return existing;

  const entitlements = {
    userId,
    featureText: true,
    featureVision: true,
    featureAsr: true,
    featureTts: true,
    featureImage: true,
    featureVideo: true,
    featureCerebellum: true,
    monthlyRequestLimit: 5000,
    createdAt: nowIso(),
  };
  data.entitlements.push(entitlements);
  return entitlements;
}

function createSessionRecord(data, userId) {
  const token = createId('lc_session');
  const session = {
    id: token,
    userId,
    createdAt: nowIso(),
    lastUsedAt: nowIso(),
  };
  data.sessions.push(session);
  return session;
}

function registerUser(input, env = process.env) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');
  const displayName = String(input.displayName || '').trim() || email.split('@')[0] || 'Life Coach User';

  if (!email || !password) {
    throw new Error('email_and_password_required');
  }

  return updateDatabase((data) => {
    if (data.users.some((user) => user.email === email)) {
      throw new Error('email_already_exists');
    }

    const passwordHash = hashPassword(password);
    const user = {
      id: createId('user'),
      email,
      displayName,
      passwordSalt: passwordHash.salt,
      passwordHash: passwordHash.derivedKey,
      planId: 'enhanced_trial',
      status: 'active',
      createdAt: nowIso(),
    };
    data.users.push(user);
    const entitlements = ensureDefaultEntitlements(data, user.id);
    const session = createSessionRecord(data, user.id);

    return {
      user: sanitizeUser(user),
      entitlements,
      sessionToken: session.id,
    };
  }, env);
}

function signInUser(input, env = process.env) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');

  return updateDatabase((data) => {
    const user = data.users.find((item) => item.email === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      throw new Error('invalid_credentials');
    }

    const entitlements = ensureDefaultEntitlements(data, user.id);
    const session = createSessionRecord(data, user.id);
    return {
      user: sanitizeUser(user),
      entitlements,
      sessionToken: session.id,
    };
  }, env);
}

function getSessionFromToken(token, env = process.env) {
  if (!token) return null;
  const data = readDatabase(env);
  const session = data.sessions.find((item) => item.id === token);
  if (!session) return null;
  const user = data.users.find((item) => item.id === session.userId);
  if (!user) return null;
  const entitlements = data.entitlements.find((item) => item.userId === user.id) || null;
  return {
    session,
    user: sanitizeUser(user),
    entitlements,
  };
}

function touchSession(token, env = process.env) {
  if (!token) return;
  updateDatabase((data) => {
    const session = data.sessions.find((item) => item.id === token);
    if (session) {
      session.lastUsedAt = nowIso();
    }
  }, env);
}

module.exports = {
  registerUser,
  signInUser,
  getSessionFromToken,
  touchSession,
};
