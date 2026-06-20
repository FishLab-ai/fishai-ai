import { ChatEngine } from './chat-engine';

describe('ChatEngine', () => {
  describe('buildSystemPrompt — 构建系统提示', () => {
    it('无参数构建基础提示', () => {
      const prompt = ChatEngine.buildSystemPrompt();
      expect(prompt).toContain('FishAI');
      expect(prompt).toContain('FishLab-ai');
    });

    it('传入深度思考选项', () => {
      const prompt = ChatEngine.buildSystemPrompt({ deepThinking: true });
      expect(prompt).toContain('深度思考模式');
    });

    it('传入记忆选项', () => {
      const prompt = ChatEngine.buildSystemPrompt({
        memories: {
          active: [{ category: 'general', content: '测试笔记' }],
          notebook: [],
          core: [],
          recent: [],
        },
      });
      expect(prompt).toContain('测试笔记');
    });
  });

  describe('buildMessages — 构建消息列表', () => {
    it('构建基础消息列表（系统提示 + 用户消息）', () => {
      const messages = ChatEngine.buildMessages({
        systemPrompt: '你是助手',
        history: [],
        userMessage: '你好',
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ role: 'system', content: '你是助手' });
      expect(messages[1]).toEqual({ role: 'user', content: '你好' });
    });

    it('包含历史对话', () => {
      const messages = ChatEngine.buildMessages({
        systemPrompt: '你是助手',
        history: [
          { role: 'user', content: '问题1' },
          { role: 'assistant', content: '回答1' },
        ],
        userMessage: '问题2',
      });
      expect(messages).toHaveLength(4);
      expect(messages[1]).toEqual({ role: 'user', content: '问题1' });
      expect(messages[2]).toEqual({ role: 'assistant', content: '回答1' });
      expect(messages[3]).toEqual({ role: 'user', content: '问题2' });
    });

    it('搜索结果注入到用户消息中', () => {
      const messages = ChatEngine.buildMessages({
        systemPrompt: '你是助手',
        history: [],
        userMessage: '搜索测试',
        searchResults: '搜索结果内容...',
      });
      expect(messages).toHaveLength(2);
      const [, userMsg] = messages;
      expect(userMsg?.content).toContain('联网搜索结果');
      expect(userMsg?.content).toContain('搜索结果内容...');
      expect(userMsg?.content).toContain('搜索测试');
    });
  });

  describe('postProcess — 后处理输出', () => {
    it('非深度思考：直接清理', () => {
      const result = ChatEngine.postProcess('直接回答', false);
      expect(result.cleanContent).toBe('直接回答');
      expect(result.thinking).toBe('');
      expect(result.memoryOps).toHaveLength(0);
    });

    it('深度思考：分离思考和回答', () => {
      const result = ChatEngine.postProcess(
        '<thinkthink>分析中</thinkthink>答案',
        true,
      );
      expect(result.thinking).toBe('分析中');
      expect(result.cleanContent).toBe('答案');
    });

    it('提取记忆指令', () => {
      const result = ChatEngine.postProcess(
        '回答 [MEM:persistent|personal|小明]',
        false,
      );
      expect(result.memoryOps).toHaveLength(1);
      expect(result.cleanContent).toBe('回答');
    });

    it('混合场景：思考 + 回答 + 记忆', () => {
      const result = ChatEngine.postProcess(
        '<thinkthink>需要记住用户信息</thinkthink>好的 [MEM:active|general|重要笔记]',
        true,
      );
      expect(result.thinking).toBe('需要记住用户信息');
      expect(result.cleanContent).toBe('好的');
      expect(result.memoryOps).toHaveLength(1);
    });
  });
});
