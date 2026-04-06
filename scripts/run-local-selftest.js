#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-lifecoach-selftest-'));
const env = {
  ...process.env,
  OPENCLAW_HOME: tempRoot,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

try {
  run('node', ['scripts/install-openclaw.js']);
  const customDir = path.join(tempRoot, 'workspace', '.lifecoach-user', 'memories');
  const customFile = path.join(customDir, 'user-note.md');
  fs.mkdirSync(customDir, { recursive: true });
  fs.writeFileSync(customFile, '# user note\n', 'utf8');

  run('node', ['scripts/install-openclaw.js']);
  assert(fs.existsSync(customFile), 'custom workspace file should survive reinstall');
  run('node', [path.join(tempRoot, 'app', 'lifecoach', 'runtime', 'tests', 'run-selftest.js')]);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
