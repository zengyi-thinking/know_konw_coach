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

默认情况下，调料包已自带网关地址和推荐模型。
用户只需要在本地 shell、`.env` 或私有配置注入：
- `LIFECOACH_GATEWAY_API_KEY`

如需特殊情况，也可额外覆盖：
- `LIFECOACH_GATEWAY_BASE_URL`
- `LIFECOACH_CHAT_MODEL`
- `LIFECOACH_VISION_MODEL`
- `LIFECOACH_IMAGE_MODEL`
- `LIFECOACH_VIDEO_MODEL`
- `LIFECOACH_TTS_MODEL`
- `LIFECOACH_ASR_MODEL`

用户可以先在官网/控制台创建自己的 key，再把 key 配到本地。
仓库中的 template / example 文件只保留占位值，不写入真实密钥。

## 5. 运行自测

```bash
node runtime/tests/run-selftest.js
```
