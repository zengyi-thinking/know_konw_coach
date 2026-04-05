# 安装引导

## 1. 先安装 OpenClaw

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Windows 建议使用 WSL2。

## 2. 安装本模板

- 手动复制 `workspace/` 到 `~/.openclaw/workspace`
- 或运行安装脚本
- runtime 自测脚本保留在当前仓库的 `runtime/tests/run-selftest.js`

## 3. 合并配置

参考：
- `config/openclaw.json.template`
- `examples/user-config-snippets.md`

注意：不要直接覆盖你现有的 `~/.openclaw/openclaw.json`。

## 4. 注入本地环境变量

使用本地 shell、`.env` 或你的私有配置注入：
- `CREATION_AI_BASE_URL`
- `CREATION_AI_API_KEY`
- `CREATION_AI_CHAT_MODEL`
- `CREATION_AI_VISION_MODEL`
- `CREATION_AI_IMAGE_MODEL`
- `CREATION_AI_VIDEO_MODEL`
- `CREATION_AI_TTS_MODEL`
- `CREATION_AI_ASR_MODEL`

仓库中的 template / example 文件只保留占位值，不写入真实密钥。

## 5. 运行自测

```bash
node runtime/tests/run-selftest.js
```
