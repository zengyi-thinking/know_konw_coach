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

## 3. 合并配置

参考：
- `config/openclaw.json.template`
- `install/openclaw-config.patch.example.json`

注意：不要直接覆盖你现有的 `~/.openclaw/openclaw.json`。
