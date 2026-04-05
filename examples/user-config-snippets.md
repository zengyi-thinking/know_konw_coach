# 用户配置片段示例

以下内容应合并进 `~/.openclaw/openclaw.json`，不要直接覆盖原文件。

可参考 `config/openclaw.json.template` 中的示例：
- 设置 workspace
- 注册 life-coach agent
- 配置技能白名单
- 注入 `CREATION_AI_*` 环境变量占位名

建议做法：
1. 保留仓库模板中的占位值。
2. 在本地 shell、系统环境变量或你自己的私有配置中注入真实值。
3. 不要把真实 API key 写入仓库中的 template/example 文件。
