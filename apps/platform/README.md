# lifecoach platform

单服务部署入口。

它把：
- 控制台页面与 `/api/*`
- 增强网关 `/v1/*`

合并到一个进程和一个端口里，适合先在 Zeabur 上以单服务方式部署。

运行：

```bash
node apps/platform/server.js
```
