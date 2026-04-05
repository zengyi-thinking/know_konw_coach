# Anti Drift Rules

禁止自动修改：
- `workspace/prompts/core_*.md`
- `workspace/.agents/safety-guardian.md`
- `workspace/knowledge/safety/*`
- 高风险升级规则
- 网关安全策略

允许自动生成：
- review 报告
- 低风险 routing 建议
- knowledge 增补建议
- memory 清理建议
- skill 微调 proposal

所有高影响变更都必须先进入 `workspace/evolution/proposals/`，交给系统后台复核后再决定是否继续。
