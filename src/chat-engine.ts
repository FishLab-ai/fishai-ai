/**
 * FishAI 聊天引擎
 * 核心调度层：组装系统提示 → 调用 ZAI SDK → 流式解析 → 输出事件
 *
 * 不负责数据库操作，由调用方（fishai-server）处理持久化
 */

import { ZAIClient } from './zai-client.js';
import { SystemPrompt } from './system-prompt.js';
import { ThinkingParser } from './thinking-parser.js';
import { MemoryManager } from './memory.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  /** 用户消息 */
  message: string;
  /** 对话历史 */
  history: ChatMessage[];
  /** 是否开启深度思考 */
  deepThinking?: boolean;
  /** 记忆积极度 */
  memoryMode?: 'aggressive' | 'balanced' | 'passive';
  /** 温度参数 */
  temperature?: number;
  /** 最大 token */
  maxTokens?: number;
  /** 是否需要联网搜索 */
  webSearch?: boolean;
}

export type ChatStreamEvent =
  | { type: 'thinking'; content: string }
  | { type: 'content'; content: string }
  | { type: 'search'; content: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

export interface ChatResult {
  /** 清理后的回答（移除记忆指令） */
  cleanContent: string;
  /** 思考过程（深度思考模式） */
  thinking: string;
  /** 提取的记忆操作 */
  memoryOps: MemoryManager extends { extractOps: (c: string) => infer R } ? never : ReturnType<typeof MemoryManager.extractOps>;
}

export class ChatEngine {
  /**
   * 构建完整系统提示
   */
  static buildSystemPrompt(options?: {
    deepThinking?: boolean;
    memoryMode?: 'aggressive' | 'balanced' | 'passive';
    memories?: {
      active: Array<{ category: string; content: string }>;
      core: Array<{ category: string; content: string }>;
      recent: Array<{ category: string; content: string }>;
    };
  }): string {
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
   * 执行联网搜索
   */
  static async webSearch(query: string): Promise<string> {
    const sdk = await ZAIClient.getClient();
    const result = await sdk.functions.invoke('web_search', {
      query,
      num: 5,
    });
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  /**
   * 流式聊天 —— 返回 ReadableStream 事件流
   * 事件格式: SSE (Server-Sent Events)
   */
  static stream(options: ChatOptions): ReadableStream<Uint8Array> {
    const parser = new ThinkingParser();
    const enc = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          // 联网搜索
          let searchResultsStr: string | null = null;
          if (options.webSearch) {
            try {
              searchResultsStr = await ChatEngine.webSearch(options.message);
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({ type: 'search', content: searchResultsStr })}\n\n`
                )
              );
            } catch {
              // 搜索失败不影响对话
            }
          }

          // 构建消息列表
          const messages: ChatMessage[] = [...options.history];

          if (searchResultsStr) {
            messages.push({
              role: 'user',
              content: `[联网搜索结果]\n${searchResultsStr}\n\n[用户问题]\n${options.message}`,
            });
          } else {
            messages.push({ role: 'user', content: options.message });
          }

          // 调用 ZAI SDK
          const sdk = await ZAIClient.getClient();
          const upstream = await sdk.chat.completions.create({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 16384,
            stream: true,
          });

          const reader = (upstream as ReadableStream<Uint8Array>).getReader();
          const dec = new TextDecoder();
          let buf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });

            const lines = buf.split('\n');
            buf = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const obj = JSON.parse(data);
                const c = obj.choices?.[0]?.delta?.content;
                if (c) {
                  fullContent += c;
                  const events = parser.parse(fullContent, c, options.deepThinking ?? false);
                  for (const evt of events) {
                    controller.enqueue(
                      enc.encode(`data: ${JSON.stringify(evt)}\n\n`)
                    );
                  }
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

          // 流结束
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );
          controller.close();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : '请求失败';
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });
  }

  /**
   * 最终处理：分离思考/回答、提取记忆操作
   * 在流结束后由调用方使用
   */
  static postProcess(
    fullContent: string,
    deepThinking: boolean
  ): { thinking: string; cleanContent: string; memoryOps: ReturnType<typeof MemoryManager.extractOps> } {
    const parser = new ThinkingParser();
    const finalized = parser.finalize(fullContent, deepThinking);
    const cleanContent = MemoryManager.cleanContent(finalized.content);
    const memoryOps = MemoryManager.extractOps(fullContent);
    return { thinking: finalized.thinking, cleanContent, memoryOps };
  }
}
