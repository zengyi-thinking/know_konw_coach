# Zeabur Deploy Assets

这个目录提供给 Zeabur 部署时直接复制的素材：

- `zeabur.env.example`：推荐环境变量模板

上线顺序建议：

1. 先用根目录 `Dockerfile` 创建单服务
2. 绑定一个持久化卷到容器的 `/data`
3. 把 `zeabur.env.example` 中的变量配置到 Zeabur
4. 首次上线后拿到公开域名
5. 把 `LIFECOACH_GATEWAY_PUBLIC_BASE_URL` 改成真实域名
6. Redeploy
