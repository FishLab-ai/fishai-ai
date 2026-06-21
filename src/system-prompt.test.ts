import { SystemPrompt } from './system-prompt';

describe('SystemPrompt', () => {
  describe('build — 构建系统提示', () => {
    it('默认构建含基础提示 + 平衡记忆模式', () => {
      const prompt = SystemPrompt.build();
      expect(prompt).toContain('FishAI');
      expect(prompt).toContain('FishLab-ai');
      expect(prompt).toContain('记忆积极度：平衡');
    });

    it('开启深度思考模式追加后缀', () => {
      const prompt = SystemPrompt.build({ deepThinking: true });
      expect(prompt).toContain('深度思考模式');
      expect(prompt).toContain('<thinkthink>');
      expect(prompt).toContain('</thinkthink>');
    });

    it('积极记忆模式', () => {
      const prompt = SystemPrompt.build({ memoryMode: 'aggressive' });
      expect(prompt).toContain('记忆积极度：积极');
    });

    it('被动记忆模式', () => {
      const prompt = SystemPrompt.build({ memoryMode: 'passive' });
      expect(prompt).toContain('记忆积极度：被动');
    });

    it('同时开启深度思考 + 记忆模式', () => {
      const prompt = SystemPrompt.build({
        deepThinking: true,
        memoryMode: 'aggressive',
      });
      expect(prompt).toContain('深度思考模式');
      expect(prompt).toContain('记忆积极度：积极');
    });

    it('始终包含核心架构信息', () => {
      const prompt = SystemPrompt.build();
      expect(prompt).toContain('LLaMA-style');
      expect(prompt).toContain('MLA');
      expect(prompt).toContain('FlashAttention-2');
    });
  });

  describe('withMemories — 注入记忆', () => {
    const basePrompt = SystemPrompt.build();

    it('注入 active 记忆', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [{ category: 'general', content: '记住这个' }],
        notebook: [],
        core: [],
        recent: [],
      });
      expect(prompt).toContain('记事本（用户标记的重要笔记');
      expect(prompt).toContain('[general] 记住这个');
    });

    it('注入 notebook 记忆', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [],
        notebook: [{ category: 'personal', content: '学习笔记' }],
        core: [],
        recent: [],
      });
      expect(prompt).toContain('记事本（用户存的普通笔记');
      expect(prompt).toContain('[personal] 学习笔记');
    });

    it('注入 core 记忆', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [],
        notebook: [],
        core: [{ category: 'personal', content: '用户叫小明' }],
        recent: [],
      });
      expect(prompt).toContain('你牢牢记住的关于用户的信息');
      expect(prompt).toContain('[personal] 用户叫小明');
    });

    it('注入 recent 记忆', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [],
        notebook: [],
        core: [],
        recent: [{ category: 'preference', content: '喜欢咖啡' }],
      });
      expect(prompt).toContain('你模糊记得的关于用户的信息');
      expect(prompt).toContain('[preference] 喜欢咖啡');
    });

    it('全部为空不追加任何内容', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [],
        notebook: [],
        core: [],
        recent: [],
      });
      expect(prompt).toBe(basePrompt);
    });

    it('同时注入多种记忆', () => {
      const prompt = SystemPrompt.withMemories(basePrompt, {
        active: [{ category: 'general', content: '笔记A' }],
        notebook: [{ category: 'work', content: '笔记B' }],
        core: [{ category: 'personal', content: '核心记忆' }],
        recent: [{ category: 'preference', content: '偏好' }],
      });
      expect(prompt).toContain('笔记A');
      expect(prompt).toContain('笔记B');
      expect(prompt).toContain('核心记忆');
      expect(prompt).toContain('偏好');
    });
  });
});
