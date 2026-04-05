const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function resolveRepoRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function resolveDatabaseFile(env = process.env) {
  if (env.LIFECOACH_CONTROL_PLANE_DATA) {
    return path.resolve(env.LIFECOACH_CONTROL_PLANE_DATA);
  }

  return path.join(resolveRepoRoot(), '.control-plane-data', 'control-plane.json');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function defaultData() {
  return {
    users: [],
    sessions: [],
    apiKeys: [],
    entitlements: [],
    usageLogs: [],
    auditLogs: [],
  };
}

function readDatabase(env = process.env) {
  const filePath = resolveDatabaseFile(env);
  ensureDir(path.dirname(filePath));

  if (!fs.existsSync(filePath)) {
    const data = defaultData();
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return data;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeDatabase(data, env = process.env) {
  const filePath = resolveDatabaseFile(env);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return data;
}

function updateDatabase(mutator, env = process.env) {
  const data = readDatabase(env);
  const result = mutator(data) || data;
  writeDatabase(data, env);
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = {
  resolveDatabaseFile,
  readDatabase,
  writeDatabase,
  updateDatabase,
  nowIso,
  createId,
};
