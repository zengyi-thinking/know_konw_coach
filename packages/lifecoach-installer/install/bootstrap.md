# 安装引导

## 1. 先安装 OpenClaw

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

## 2. 运行统一安装器

推荐方式：

```bash
node scripts/install-openclaw.js
```

直接调用 package 安装器也可以：
- `node packages/lifecoach-installer/install-openclaw.js`
- `packages/lifecoach-installer/install/install.sh`
- `packages/lifecoach-installer/install/install.ps1`

## 3. 安装后的目标结构

安装器会把三层内容放入 OpenClaw：
- `app/lifecoach/runtime`：core 运行时
- `app/lifecoach/config`：默认配置
- `app/lifecoach/schemas`：契约
- `workspace`：静态 skills / knowledge / prompts / agents
- `state/lifecoach`：动态事件、timeline、review、proposal、memory cache、system review

## 4. 验证

```bash
node ~/.openclaw/app/lifecoach/runtime/tests/run-selftest.js
```

自测会同时验证：
- 静态 workspace manifest 是否存在
- runtime 与 config 路径是否正确
- state 持久化是否会写出引用静态 skill 的动态 artifact

## 5. 用户自定义内容放置建议

安装器会额外创建一组保留给用户自定义内容的目录：

- `~/.openclaw/workspace/.lifecoach-user/memories`
- `~/.openclaw/workspace/.lifecoach-user/knowledge`
- `~/.openclaw/workspace/.lifecoach-user/skills`
- `~/.openclaw/workspace/.lifecoach-user/prompts`
- `~/.openclaw/workspace/.lifecoach-user/notes`

建议把你的私人记忆、补充知识、实验性 skills、个性化 prompt 和临时笔记放到这些目录中。

这样升级 lifecoach 调料包时：

- 包托管文件继续按版本更新
- 用户自定义内容则集中放在独立命名空间中，更不容易与包内容混淆
