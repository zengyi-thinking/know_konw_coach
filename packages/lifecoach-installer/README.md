# lifecoach-installer

安装与分发层。

包含：
- `install-openclaw.js`：统一安装器
- `manifest/`：安装清单
- `config/`：默认配置模板
- `install/`：Shell / PowerShell 包装脚本与说明

职责：
- 把 core、workspace、config 安装到 OpenClaw 目录
- 生成环境变量文件
- 合并 `openclaw.json`
- 执行安装结构校验
