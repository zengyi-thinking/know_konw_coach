# OpenClaw Life Coach Package

这是一个面向 OpenClaw（小龙虾）的 Life Coach 调料包仓库。它现在按三层结构组织：

- `packages/lifecoach-core/`：运行核心
- `packages/lifecoach-workspace/`：静态教练资产
- `packages/lifecoach-installer/`：安装与分发

安装后会落到 OpenClaw 的三类目录中：

- `~/.openclaw/app/lifecoach/runtime`：运行核心
- `~/.openclaw/workspace`：静态 skills / knowledge / prompts / agents
- `~/.openclaw/state/lifecoach`：动态事件、timeline、review、proposal、memory cache

## 结构总览

```text
packages/
├─ lifecoach-core/
│  ├─ src/
│  ├─ schemas/
│  └─ tests/
├─ lifecoach-workspace/
│  ├─ content/
│  │  ├─ .lifecoach/workspace.manifest.json
│  │  ├─ .agents/
│  │  ├─ skills/
│  │  ├─ knowledge/
│  │  ├─ prompts/
│  │  ├─ memories/
│  │  └─ evolution/
│  └─ README.md
└─ lifecoach-installer/
   ├─ install-openclaw.js
   ├─ manifest/
   ├─ config/
   └─ install/
```

根目录还保留了少量兼容入口：

- `scripts/install-openclaw.js`
- `runtime/tests/run-selftest.js`
- `install/install.sh`
- `install/install.ps1`

## 静态与动态如何协作

静态资产在 `packages/lifecoach-workspace/content/`，由 `workspace.manifest.json` 暴露 skills、knowledge buckets 和受保护路径。

动态数据写入 `state/lifecoach/`，由 core 在会话运行时生成：
- event
- timeline
- review
- proposal
- memory snapshot

这些动态 artifact 会显式写入对静态资产的引用，例如当前命中的 `skill route` 路径和 workspace manifest 路径，从而把“静态规则”和“动态演化”真正连起来。

## 安装与验证

先安装 OpenClaw：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

安装调料包：

```bash
node scripts/install-openclaw.js
```

兼容入口：
- `install/install.sh`
- `install/install.ps1`

安装前校验包结构：

```bash
node scripts/validate-package.js
```

安装后自测：

```bash
node ~/.openclaw/app/lifecoach/runtime/tests/run-selftest.js
```

## 当前状态

当前版本已经具备：

- 基于 package 分层的清晰仓库结构
- manifest 驱动安装
- workspace manifest 驱动的静态资产索引
- state 持久化对静态 skill/knowledge 的引用
- routing / retrieval / memory / evolution / gateway 的最小闭环

## 主要入口

- Core 入口：`packages/lifecoach-core/src/index.js`
- Workspace 清单：`packages/lifecoach-workspace/content/.lifecoach/workspace.manifest.json`
- Installer 清单：`packages/lifecoach-installer/manifest/lifecoach.bundle.json`
