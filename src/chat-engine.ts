/**
 * FishAI 聊天引擎 — 纯逻辑层
 *
 * 职责：
 * - 组装系统提示（基础提示 + 记忆注入 + 深度思考）
 * - 后处理 AI 原始输出（分离思考/回答、提取记忆指令、清理标记）
 *
 * 不负责：推理调用（由 Rust 引擎完成）、数据库（由 fishai-server 处理）
 */

import { SystemPrompt } from './system-prompt.js';
import { ThinkingParser } from './thinking-parser.js';
import { MemoryManager } from './memory.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptOptions {
  deepThinking?: boolean;
  memoryMode?: 'aggressive' | 'balanced' | 'passive';
  memories?: {
    active: Array<{ category: string; content: string }>;
    core: Array<{ category: string; content: string }>;
    recent: Array<{ category: string; content: string }>;
  };
}

export interface ResponseResult {
  /** 清理后的回答（移除记忆指令） */
  cleanContent: string;
  /** 思考过程（深度思考模式） */
  thinking: string;
  /** 提取的记忆操作 */
  memoryOps: ReturnType<typeof MemoryManager.extractOps>;
}

export class ChatEngine {
  /**
   * 构建完整系统提示词
   */
  static buildSystemPrompt(options?: PromptOptions): string {
    const base = SystemPrompt.build({
      deepThinking: options?.deepThinking,
      memoryMode: options?.memoryMode,
    });

    if (options?.memories) {
      return SystemPrompt.withMemories(base, options.memories);
    }
    return base;
  }

  /**
   * 构建发送给推理引擎的完整消息列表
   */
  static buildMessages(options: {
    systemPrompt: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    userMessage: string;
    searchResults?: string;
  }): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: options.systemPrompt },
      ...options.history.map((m) => ({ role: m.role, content: m.content })),
    ];

    if (options.searchResults) {
      messages.push({
        role: 'user',
        content: `[联网搜索结果]\n${options.searchResults}\n\n[用户问题]\n${options.userMessage}`,
      });
    } else {
      messages.push({ role: 'user', content: options.userMessage });
    }

    return messages;
  }

  /**
   * 后处理 AI 原始输出
   * - 分离思考过程和最终回答
   * - 移除记忆指令标记
   * - 提取记忆操作
   */
  static postProcess(rawContent: string, deepThinking: boolean): ResponseResult {
    const parser = new ThinkingParser();
    const finalized = parser.finalize(rawContent, deepThinking);
    const cleanContent = MemoryManager.cleanContent(finalized.content);
    const memoryOps = MemoryManager.extractOps(rawContent);
    return { thinking: finalized.thinking, cleanContent, memoryOps };
  }
}
