/**
 * FishAI 记忆管理器
 * 处理 AI 回答中的记忆指令提取、清理
 * 不直接操作数据库 —— 由调用方（fishai-server）负责持久化
 */

export type MemoryType = 'active' | 'persistent';

export interface MemoryOp {
  action: 'active' | 'persistent' | 'update' | 'delete';
  category?: string;
  content: string;
  oldKey?: string;
}

export class MemoryManager {
  /**
   * 从模型回答中提取记忆指令
   * 匹配格式: [MEM:action|category|content] 或 [MEM:action|content]
   */
  static extractOps(content: string): MemoryOp[] {
    const ops: MemoryOp[] = [];
    const regex = /\[MEM:(active|persistent|update|delete)\|([^\]]*?)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const action = match[1] as MemoryOp['action'];
      const payload = match[2];

      if (action === 'update') {
        // [MEM:update|旧关键词|新内容]
        const parts = payload.split('|');
        ops.push({
          action,
          oldKey: parts[0],
          content: parts.slice(1).join('|'),
        });
      } else if (action === 'delete') {
        ops.push({ action, content: payload });
      } else {
        // active or persistent
        const parts = payload.split('|');
        const validCategories = ['personal', 'preference', 'knowledge', 'schedule', 'general'];
        const hasCategory = validCategories.includes(parts[0]);
        ops.push({
          action,
          category: hasCategory ? parts[0] : 'general',
          content: hasCategory ? parts.slice(1).join('|') : payload,
        });
      }
    }

    return ops;
  }

  /**
   * 从回答中移除记忆指令标记（不展示给用户）
   */
  static cleanContent(content: string): string {
    return content.replace(/\[MEM:(active|persistent|update|delete)\|[^\]]*?\]/g, '').trim();
  }

  /**
   * 格式化记忆列表用于注入系统提示
   */
  static formatForPrompt(memories: Array<{ category: string; content: string }>): string {
    return memories.map((m) => `[${m.category}] ${m.content}`).join('\n');
  }
}
