# OpenClaw Life Coach Workspace Template

这是一个面向 OpenClaw（小龙虾）的 Life Coach 工作区模板仓库。

它不是 OpenClaw 本体，而是一套可安装到 `~/.openclaw/workspace` 的增强骨架，包含：
- life coach agents
- skills 三件套（`SKILL.md` + `route.json` + `response_schema.json`）
- memories 模板
- 轻量 prompts / core 规则卡片
- knowledge block + metadata
- 最小 runtime 执行层与自测入口
- 安装脚本与配置模板

## 适用场景

适合想在 OpenClaw 上快速搭建一个长期陪伴型 life coach 助手的人。

## 前置条件

请先完成 OpenClaw 官方安装与初始化：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Windows 建议优先使用 WSL2。

## 安装方式

### 方式一：手动复制
将本仓库 `workspace/` 下的内容合并到你的：

```text
~/.openclaw/workspace
```

并参考 `config/openclaw.json.template` 把相关配置加入：

```text
~/.openclaw/openclaw.json
```

### 方式二：使用安装脚本
- PowerShell：`install/install.ps1`
- Shell：`install/install.sh`

安装脚本默认采用保守模式：
- 创建缺失目录
- 复制模板文件
- 不强制覆盖你的核心配置
- 不写入真实密钥

## 目录说明

```text
config/      OpenClaw 配置模板与网关示例
install/     安装脚本与接入说明
docs/        架构和安全设计文档
runtime/     最小执行层、自测脚本与 schema
workspace/   将被安装到 ~/.openclaw/workspace 的核心内容
examples/    配置片段与使用示例
```

## workspace 结构

```text
workspace/
├─ .agents/
├─ skills/
├─ memories/
├─ knowledge/
├─ prompts/
└─ evolution/
```

## 当前状态

当前版本已包含一个可运行的最小闭环，重点是：
- 轻量 runtime 资产，便于 OpenClaw 调用
- skills 三件套与 knowledge metadata
- 最小 routing / retrieval / memory / evolution 执行层
- 本地自测入口 `node runtime/tests/run-selftest.js`

后续你可以继续补充：
- 更强的回复生成层
- 更细的高风险安全分级
- 更深的记忆净化与长期冲突处理
- 代理网关与多模态实际调用适配

## 后续自定义建议

你可以优先修改：
- `workspace/prompts/`：人格、语气、边界
- `workspace/.agents/`：代理职责与协作方式
- `workspace/skills/`：教练技能逻辑
- `workspace/memories/`：长期记忆模板
- `workspace/knowledge/`：框架、案例、安全规则
