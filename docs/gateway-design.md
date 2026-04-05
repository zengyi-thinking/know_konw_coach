# 代理网关设计

本项目默认采用代理网关模式接入模型能力。

原则：
- 本地仅保存网关地址与用户 token
- 不在仓库中保存真实上游 API key
- 多模态模型通过网关统一暴露

建议后续扩展：
- chat model
- vision model
- audio model
- image model
- document model
