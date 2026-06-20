import { ThinkingParser } from './thinking-parser';

describe('ThinkingParser', () => {
  let parser: ThinkingParser;

  beforeEach(() => {
    parser = new ThinkingParser();
  });

  describe('parse — 流式解析', () => {
    it('非深度思考模式：直接透传内容', () => {
      const events = parser.parse('你好世界', '你好世界', false);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'content', content: '你好世界' });
    });

    it('深度思考：返回 thinking 事件', () => {
      const full = '<thinkthink>让我想想...</thinkthink>答案是42';
      const events = parser.parse(full, full, true);
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'thinking', content: '让我想想...' });
      expect(events[1]).toEqual({ type: 'content', content: '答案是42' });
    });

    it('LMTHINK 标签也能正确解析', () => {
      const full = '<LMTHINK>thinking...</LMTHINK>answer';
      const events = parser.parse(full, full, true);
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'thinking', content: 'thinking...' });
      expect(events[1]).toEqual({ type: 'content', content: 'answer' });
    });

    it('开标签出现但闭标签还没出现：增量输出思考', () => {
      const events1 = parser.parse('<thinkthink>let', '<thinkthink>let', true);
      expect(events1).toHaveLength(1);
      expect(events1[0]).toEqual({ type: 'thinking', content: 'let' });

      const events2 = parser.parse('<thinkthink>let me think', ' me think', true);
      expect(events2).toHaveLength(1);
      expect(events2[0]).toEqual({ type: 'thinking', content: ' me think' });
    });

    it('空 chunk 不产生事件', () => {
      const events = parser.parse('hello', '', false);
      expect(events).toHaveLength(0);
    });

    it('思考结束后直接透传', () => {
      // 先完成思考
      parser.parse('<thinkthink>done</thinkthink>part1', 'full', true);
      // 后续chunk应该直接透传
      const events = parser.parse('<thinkthink>done</thinkthink>part1part2', 'part2', true);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'content', content: 'part2' });
    });
  });

  describe('finalize — 最终处理', () => {
    it('非深度思考：返回全部内容', () => {
      const result = parser.finalize('hello world', false);
      expect(result).toEqual({ thinking: '', content: 'hello world' });
    });

    it('完整思考标签：正确分离', () => {
      const result = parser.finalize(
        '<thinkthink>分析中...</thinkthink>最终答案',
        true,
      );
      expect(result.thinking).toBe('分析中...');
      expect(result.content).toBe('最终答案');
    });

    it('无闭标签：把所有内容当作思考', () => {
      const result = parser.finalize('<thinkthink>还没想完', true);
      expect(result.thinking).toBe('还没想完');
      expect(result.content).toBe('');
    });

    it('无开标签：返回全部内容', () => {
      const result = parser.finalize('普通回答没有思考', true);
      expect(result.thinking).toBe('');
      expect(result.content).toBe('普通回答没有思考');
    });

    it('空内容：返回空', () => {
      const result = parser.finalize('', true);
      expect(result).toEqual({ thinking: '', content: '' });
    });
  });

  describe('reset — 重置状态', () => {
    it('重置后回到初始状态', () => {
      parser.parse('<thinkthink>done</thinkthink>ans', 'full', true);
      parser.reset();
      // 重置后不应该还有 thinkingDone 状态
      const events = parser.parse('no think', 'no think', true);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'content', content: 'no think' });
    });
  });
});
