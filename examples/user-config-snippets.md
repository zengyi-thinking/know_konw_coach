# 用户配置片段示例

以下内容应合并进 `~/.openclaw/openclaw.json`，不要直接覆盖原文件。

可参考 `config/openclaw.json.template` 中的示例：
- 设置 workspace
- 注册 life-coach agent
- 配置技能白名单
- 仅注入 `LIFECOACH_GATEWAY_API_KEY`

建议做法：
1. 先在官网/控制台创建自己的 API key。
2. 调料包默认携带网关地址和推荐模型，无需用户手动配置全部模型。
3. 在本地 shell、系统环境变量或你自己的私有配置中注入 `LIFECOACH_GATEWAY_API_KEY`。
4. 不要把真实 API key 写入仓库中的 template/example 文件。
