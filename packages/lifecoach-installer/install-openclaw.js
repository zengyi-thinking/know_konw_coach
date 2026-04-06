#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(__dirname, 'manifest', 'lifecoach.bundle.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveOpenClawHome() {
  if (process.env.OPENCLAW_HOME) {
    return path.resolve(process.env.OPENCLAW_HOME);
  }

  return path.join(os.homedir(), '.openclaw');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeTarget(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyReplace(sourcePath, targetPath) {
  removeTarget(targetPath);
  ensureDir(path.dirname(targetPath));
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function copyMerge(sourcePath, targetPath) {
  const sourceStat = fs.statSync(sourcePath);

  if (sourceStat.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      copyMerge(path.join(sourcePath, entry.name), path.join(targetPath, entry.name));
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.cpSync(sourcePath, targetPath, { force: true });
}

function copyEntry(sourcePath, targetPath, strategy = 'replace') {
  if (strategy === 'merge') {
    copyMerge(sourcePath, targetPath);
    return;
  }

  copyReplace(sourcePath, targetPath);
}

function renderTemplate(value, context) {
  return String(value).replace(/\{openclawHome\}/g, context.openclawHome);
}

function writeShellEnv(filePath, envMap) {
  const lines = Object.entries(envMap).map(([key, value]) => `export ${key}="${value}"`);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function writePowerShellEnv(filePath, envMap) {
  const lines = Object.entries(envMap).map(([key, value]) => `$env:${key} = "${value}"`);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function mergeUniqueStrings(existing, incoming) {
  return Array.from(new Set([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]));
}

function mergeAgentLists(existingAgents = [], incomingAgents = []) {
  const byId = new Map();

  for (const agent of existingAgents) {
    if (agent && agent.id) {
      byId.set(agent.id, { ...agent });
    }
  }

  for (const agent of incomingAgents) {
    if (!agent || !agent.id) continue;
    const current = byId.get(agent.id) || {};
    byId.set(agent.id, {
      ...current,
      ...agent,
      skills: mergeUniqueStrings(current.skills, agent.skills),
    });
  }

  return Array.from(byId.values());
}

function mergeOpenClawConfig(existingConfig, patchConfig) {
  const next = { ...(existingConfig || {}) };
  const patchAgents = patchConfig.agents || {};
  const existingAgents = next.agents || {};

  next.agents = {
    ...existingAgents,
    ...patchAgents,
    defaults: {
      ...(existingAgents.defaults || {}),
      ...(patchAgents.defaults || {}),
    },
    list: mergeAgentLists(existingAgents.list, patchAgents.list),
  };

  const patchEnv = patchConfig.env || {};
  const existingEnv = next.env || {};
  next.env = {
    ...existingEnv,
    ...patchEnv,
    vars: {
      ...(existingEnv.vars || {}),
      ...(patchEnv.vars || {}),
    },
  };

  return next;
}

function backupIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const backupPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function validateInstallation(openclawHome, manifest) {
  const missing = [];

  for (const relativePath of manifest.validation.files || []) {
    const target = path.join(openclawHome, relativePath);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      missing.push(relativePath);
    }
  }

  for (const relativePath of manifest.validation.directories || []) {
    const target = path.join(openclawHome, relativePath);
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
      missing.push(relativePath);
    }
  }

  return missing;
}

function install() {
  const manifest = readJson(manifestPath);
  const openclawHome = resolveOpenClawHome();
  const context = { openclawHome };

  for (const relativeDir of manifest.directories || []) {
    ensureDir(path.join(openclawHome, relativeDir));
  }

  for (const entry of manifest.copy || []) {
    const sourcePath = path.join(repoRoot, entry.source);
    const targetPath = path.join(openclawHome, entry.target);
    copyEntry(sourcePath, targetPath, entry.strategy);
  }

  const appDir = path.join(openclawHome, 'app', manifest.appId);
  ensureDir(appDir);

  const envMap = Object.fromEntries(
    Object.entries(manifest.env || {}).map(([key, value]) => [key, renderTemplate(value, context)])
  );
  writeShellEnv(path.join(appDir, 'install-env.sh'), envMap);
  writePowerShellEnv(path.join(appDir, 'install-env.ps1'), envMap);

  const configPath = path.join(openclawHome, 'openclaw.json');
  const previousConfig = fs.existsSync(configPath) ? readJson(configPath) : {};
  const backupPath = backupIfPresent(configPath);
  const mergedConfig = mergeOpenClawConfig(previousConfig, manifest.openclawConfig || {});
  fs.writeFileSync(configPath, `${JSON.stringify(mergedConfig, null, 2)}\n`, 'utf8');

  const installMeta = {
    packageName: manifest.packageName,
    packageVersion: manifest.packageVersion,
    installedAt: new Date().toISOString(),
    openclawHome,
    configBackup: backupPath,
  };
  fs.writeFileSync(path.join(appDir, 'install-meta.json'), `${JSON.stringify(installMeta, null, 2)}\n`, 'utf8');

  const missing = validateInstallation(openclawHome, manifest);
  if (missing.length > 0) {
    throw new Error(`installation validation failed: ${missing.join(', ')}`);
  }

  const selftestPath = path.join(appDir, 'runtime', 'tests', 'run-selftest.js');
  console.log(`Installed ${manifest.packageName}@${manifest.packageVersion} to ${openclawHome}`);
  console.log(`OpenClaw config updated: ${configPath}`);
  if (backupPath) {
    console.log(`OpenClaw config backup: ${backupPath}`);
  }
  console.log(`Load env: source ${path.join(appDir, 'install-env.sh')}`);
  console.log(`PowerShell env: . ${path.join(appDir, 'install-env.ps1')}`);
  console.log(`Verify: node ${selftestPath}`);
}

module.exports = {
  install,
};

if (require.main === module) {
  try {
    install();
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  }
}
