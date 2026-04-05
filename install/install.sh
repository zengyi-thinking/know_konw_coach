#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${HOME}/.openclaw/workspace"
SOURCE_DIR="${ROOT_DIR}/workspace"

mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/* "$TARGET_DIR"/ 2>/dev/null || true
cp -R "$SOURCE_DIR"/.agents "$TARGET_DIR"/ 2>/dev/null || true

echo "OpenClaw Life Coach workspace 已复制到: $TARGET_DIR"
echo "runtime 自测入口保留在仓库内: ${ROOT_DIR}/runtime/tests/run-selftest.js"
echo "请手动参考 config/openclaw.json.template 合并到 ~/.openclaw/openclaw.json"
echo "真实 CREATION_AI_* 环境变量请只在本地 shell 或私有配置中注入，不要写回仓库。"
