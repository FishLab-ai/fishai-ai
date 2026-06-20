# FishAI AI Engine

FishLab-ai 自研 AI 引擎 — 纯逻辑层，**零外部依赖**。

只负责 AI 的"大脑逻辑"，不绑定任何推理 SDK。推理由 FishLab-ai 自研 Rust 引擎完成。

## 模块

| 模块 | 职责 |
|------|------|
| `system-prompt.ts` | 系统提示词：FishAI 身份、能力、行为规范 |
| `memory.ts` | 记忆管理：从 AI 回答中提取/清理记忆指令 |
| `thinking-parser.ts` | 深度思考解析器：流式分离 `<thinkthink>` 标签 |
| `chat-engine.ts` | 聊天引擎：组装提示词 + 后处理回答（不调推理） |

## 架构

```
fishai-web (前端 UI)
    ↓ HTTP
fishai-server (后端 API + 临时推理代理)
    ├── import fishai-ai (提示词组装 + 后处理)
    └── 调用 Rust 推理引擎 (实际推理)
         ↑
fishai-ai (纯逻辑)  ← 你在这里
    零依赖，只做文本处理
```

## 依赖

**无**。纯 TypeScript，不依赖任何外部包。
