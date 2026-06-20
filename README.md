# FishAI AI Engine

FishLab-ai 自研 AI 引擎 — FishAI 的"大脑"。

独立于后端服务（fishai-server）和前端（fishai-web），专注于 AI 推理核心逻辑。

## 核心模块

| 模块 | 职责 |
|------|------|
| `system-prompt.ts` | 系统提示词：身份定义、能力描述、行为规范 |
| `memory.ts` | 记忆管理：记忆指令提取、内容清理、格式化 |
| `thinking-parser.ts` | 深度思考解析器：流式分离 `<thinkthink>` 标签 |
| `chat-engine.ts` | 聊天引擎：组装提示 → 调用 ZAI SDK → 流式输出 |
| `zai-client.ts` | ZAI SDK 客户端封装：单例管理 |

## 架构关系

```
fishai-web (前端)
    ↓ HTTP
fishai-server (后端 API)
    ↓ import
fishai-ai (AI 引擎)  ← 你在这里
    ↓
z-ai-web-dev-sdk (推理 SDK)
```

## 使用方式

```typescript
import { ChatEngine } from 'fishai-ai';

const stream = ChatEngine.stream({
  message: '你好',
  history: [{ role: 'system', content: '你叫 FishAI...' }],
  deepThinking: true,
  memoryMode: 'balanced',
});
```

## 许可

MIT
