/**
 * FishAI AI Engine v0.1.0
 * FishLab-ai 自研 AI 引擎 — 纯逻辑层
 *
 * 不依赖任何外部推理 SDK，只负责：
 * - 系统提示词管理
 * - 记忆系统（指令提取 / 内容清理）
 * - 深度思考解析器
 * - 聊天消息组装与后处理
 */

export { SystemPrompt } from './system-prompt.js';
export { MemoryManager } from './memory.js';
export { ThinkingParser } from './thinking-parser.js';
export { ChatEngine, type ChatMessage, type PromptOptions, type ResponseResult } from './chat-engine.js';
