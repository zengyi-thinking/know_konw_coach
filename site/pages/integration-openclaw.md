# OpenClaw 接入说明

## 第一步：创建你的 API key
在控制台创建专属 key，不要使用仓库内的占位值。

## 第二步：复制配置
```bash
CREATION_AI_BASE_URL=https://your-gateway.example.com/v1
CREATION_AI_API_KEY=your-api-key
CREATION_AI_CHAT_MODEL=gpt-4o
CREATION_AI_VISION_MODEL=gemini-2.5-flash
CREATION_AI_IMAGE_MODEL=doubao-seedream-4-0-250828
CREATION_AI_VIDEO_MODEL=veo3.1-fast
CREATION_AI_TTS_MODEL=tts-1
CREATION_AI_ASR_MODEL=whisper-1
```

## 第三步：注入本地环境变量
- shell 环境变量
- 系统环境变量
- OpenClaw 私有配置

## 第四步：启动 OpenClaw
- 未配置 key：基础文本版
- 已配置 key：自动启用多模态增强版
