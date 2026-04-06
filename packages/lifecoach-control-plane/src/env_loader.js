const fs = require('fs');
const path = require('path');

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const index = trimmed.indexOf('=');
  if (index <= 0) return null;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnvFile(filePath, target = process.env, overwrite = false) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return false;

  const lines = fs.readFileSync(resolved, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (!overwrite && typeof target[parsed.key] !== 'undefined' && target[parsed.key] !== '') {
      continue;
    }
    target[parsed.key] = parsed.value;
  }
  return true;
}

function loadEnvFiles(filePaths, target = process.env, overwrite = false) {
  let loaded = false;
  for (const filePath of filePaths) {
    if (filePath) {
      loaded = loadEnvFile(filePath, target, overwrite) || loaded;
    }
  }
  return loaded;
}

module.exports = {
  loadEnvFile,
  loadEnvFiles,
};
