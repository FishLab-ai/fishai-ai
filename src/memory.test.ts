import { MemoryManager } from './memory';

describe('MemoryManager', () => {
  describe('extractOps — 提取记忆指令', () => {
    it('提取 active 记忆', () => {
      const ops = MemoryManager.extractOps(
        '回答内容 [MEM:active|personal|用户名字是小明]',
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({
        action: 'active',
        category: 'personal',
        content: '用户名字是小明',
      });
    });

    it('提取 persistent 记忆', () => {
      const ops = MemoryManager.extractOps(
        '内容 [MEM:persistent|preference|喜欢用中文]',
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({
        action: 'persistent',
        category: 'preference',
        content: '喜欢用中文',
      });
    });

    it('提取 update 操作', () => {
      const ops = MemoryManager.extractOps(
        '[MEM:update|旧内容|新内容]',
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({
        action: 'update',
        oldKey: '旧内容',
        content: '新内容',
      });
    });

    it('提取 delete 操作', () => {
      const ops = MemoryManager.extractOps(
        '[MEM:delete|旧笔记]',
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({
        action: 'delete',
        content: '旧笔记',
      });
    });

    it('提取多条记忆指令', () => {
      const ops = MemoryManager.extractOps(
        '[MEM:active|general|重要笔记] [MEM:persistent|personal|小明在北京]',
      );
      expect(ops).toHaveLength(2);
    });

    it('无效分类默认为 general', () => {
      const ops = MemoryManager.extractOps(
        '[MEM:active|invalidcat|内容]',
      );
      expect(ops[0]).toEqual({
        action: 'active',
        category: 'general',
        content: 'invalidcat|内容',
      });
    });

    it('无记忆指令返回空数组', () => {
      const ops = MemoryManager.extractOps('纯文本没有任何记忆');
      expect(ops).toHaveLength(0);
    });

    it('空字符串返回空数组', () => {
      const ops = MemoryManager.extractOps('');
      expect(ops).toHaveLength(0);
    });

    it('update 操作含多个 | 分隔符', () => {
      const ops = MemoryManager.extractOps(
        '[MEM:update|旧关键词|中间部分|最终内容]',
      );
      expect(ops[0]).toEqual({
        action: 'update',
        oldKey: '旧关键词',
        content: '中间部分|最终内容',
      });
    });
  });

  describe('cleanContent — 清除记忆标记', () => {
    it('移除所有记忆指令', () => {
      const result = MemoryManager.cleanContent(
        '回答 [MEM:active|general|笔记] 继续 [MEM:persistent|preference|偏好]',
      );
      expect(result).toBe('回答  继续');
    });

    it('没有指令不改变内容', () => {
      const result = MemoryManager.cleanContent('正常文本');
      expect(result).toBe('正常文本');
    });

    it('空字符串返回空', () => {
      const result = MemoryManager.cleanContent('');
      expect(result).toBe('');
    });
  });

  describe('formatForPrompt — 格式化记忆注入', () => {
    it('格式化单条记忆', () => {
      const result = MemoryManager.formatForPrompt([
        { category: 'personal', content: '小明' },
      ]);
      expect(result).toBe('[personal] 小明');
    });

    it('格式化多条记忆', () => {
      const result = MemoryManager.formatForPrompt([
        { category: 'personal', content: '小明' },
        { category: 'preference', content: '中文' },
      ]);
      expect(result).toBe('[personal] 小明\n[preference] 中文');
    });

    it('空数组返回空字符串', () => {
      const result = MemoryManager.formatForPrompt([]);
      expect(result).toBe('');
    });
  });
});
