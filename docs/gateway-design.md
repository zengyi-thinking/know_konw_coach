# 代理网关设计

本项目默认采用代理网关模式接入模型能力。

原则：
- 用户先在官网/控制台创建自己的 API key
- 调料包默认内置网关地址与推荐模型
- 用户本地通常只需保存 `LIFECOACH_GATEWAY_API_KEY`
- 不在仓库中保存真实上游 API key
- 多模态模型通过网关统一暴露
- 调料包负责教练逻辑，多模态模型负责感知层

当前接入形态：
- 无 key：基础文本版
- 有 key：自动升级为多模态增强版

建议后续扩展：
- chat model
- vision model
- audio model
- image model
- document model
- video model
- tts model
