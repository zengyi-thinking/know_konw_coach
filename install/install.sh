#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${HOME}/.openclaw/workspace"
SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)/workspace"

mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/* "$TARGET_DIR"/ 2>/dev/null || true
cp -R "$SOURCE_DIR"/.agents "$TARGET_DIR"/ 2>/dev/null || true

echo "OpenClaw Life Coach 模板已复制到: $TARGET_DIR"
echo "请手动参考 config/openclaw.json.template 合并到 ~/.openclaw/openclaw.json"
