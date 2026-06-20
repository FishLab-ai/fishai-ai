/**
 * FishAI 深度思考解析器
 * 解析 AI 回答中的 <thinkthink>...</thinkthink> 或 <LMTHINK>...</LMTHINK> 标签
 * 支持流式解析，边生成边分离思考过程和最终回答
 */

export interface ParseEvent {
  type: 'thinking' | 'content';
  content: string;
}

export class ThinkingParser {
  private thinkingDone = false;
  private lastSentThinkingLen = 0;
  private bufferedContent = '';

  /**
   * 流式解析：每次传入新的 chunk，返回分离后的事件
   */
  parse(fullContent: string, chunk: string, deepThinking: boolean): ParseEvent[] {
    const events: ParseEvent[] = [];

    // 非深度思考模式：直接透传
    if (!deepThinking) {
      if (chunk) events.push({ type: 'content', content: chunk });
      return events;
    }

    // 思考已结束：直接透传后续内容
    if (this.thinkingDone) {
      if (chunk) events.push({ type: 'content', content: chunk });
      return events;
    }

    const openIdx = fullContent.indexOf('<thinkthink>');
    const openIdxAlt = fullContent.indexOf('<LMTHINK>');
    const effectiveOpenIdx = openIdx !== -1 ? openIdx : openIdxAlt;
    const openTagLen =
      openIdx !== -1
        ? '<thinkthink>'.length
        : openIdxAlt !== -1
          ? '<LMTHINK>'.length
          : 0;

    const closeIdx = fullContent.indexOf('</thinkthink>');
    const closeIdxAlt = fullContent.indexOf('</LMTHINK>');
    const effectiveCloseIdx = closeIdx !== -1 ? closeIdx : closeIdxAlt;
    const closeTagLen =
      closeIdx !== -1
        ? '</thinkthink>'.length
        : closeIdxAlt !== -1
          ? '</LMTHINK>'.length
          : 0;

    // 还没出现开标签 —— 检测是否是不完整的标签片段
    if (effectiveOpenIdx === -1) {
      if (this.couldBePartialTag(fullContent)) {
        this.bufferedContent = fullContent;
        return events;
      }
      this.bufferedContent = '';
      if (chunk) events.push({ type: 'content', content: chunk });
      return events;
    }

    // 清除之前的 buffer
    if (this.bufferedContent.length > 0) {
      this.bufferedContent = '';
    }

    // 开标签已出现但闭标签还没出现 —— 流式输出思考内容
    if (effectiveCloseIdx === -1) {
      const thinkContent = fullContent.slice(effectiveOpenIdx + openTagLen);
      if (thinkContent.length > this.lastSentThinkingLen) {
        const newPart = thinkContent.slice(this.lastSentThinkingLen);
        this.lastSentThinkingLen = thinkContent.length;
        events.push({ type: 'thinking', content: newPart });
      }
      return events;
    }

    // 闭标签出现了 —— 最终状态
    this.thinkingDone = true;

    const thinkContent = fullContent.slice(
      effectiveOpenIdx + openTagLen,
      effectiveCloseIdx
    );
    if (thinkContent.length > this.lastSentThinkingLen) {
      const newPart = thinkContent.slice(this.lastSentThinkingLen);
      this.lastSentThinkingLen = thinkContent.length;
      events.push({ type: 'thinking', content: newPart });
    }

    const afterThink = fullContent.slice(effectiveCloseIdx + closeTagLen);
    if (afterThink.length > 0) {
      events.push({ type: 'content', content: afterThink });
    }

    return events;
  }

  /**
   * 最终处理：一次性分离思考和回答（流结束后调用）
   */
  finalize(
    fullContent: string,
    deepThinking: boolean
  ): { thinking: string; content: string } {
    if (!deepThinking) {
      return { thinking: '', content: fullContent };
    }

    let openIdx = fullContent.indexOf('<thinkthink>');
    let openTagLen = '<thinkthink>'.length;
    let closeIdx = fullContent.indexOf('</thinkthink>');
    let closeTagLen = '</thinkthink>'.length;

    if (openIdx === -1) {
      openIdx = fullContent.indexOf('<LMTHINK>');
      openTagLen = '<LMTHINK>'.length;
      closeIdx = fullContent.indexOf('</LMTHINK>');
      closeTagLen = '</LMTHINK>'.length;
    }

    if (openIdx === -1) {
      return { thinking: '', content: fullContent };
    }

    if (closeIdx === -1) {
      return {
        thinking: fullContent.slice(openIdx + openTagLen),
        content: '',
      };
    }

    const thinking = fullContent.slice(openIdx + openTagLen, closeIdx);
    const content = fullContent.slice(closeIdx + closeTagLen).trim();
    return { thinking, content };
  }

  /**
   * 重置解析器状态（新对话时调用）
   */
  reset(): void {
    this.thinkingDone = false;
    this.lastSentThinkingLen = 0;
    this.bufferedContent = '';
  }

  private couldBePartialTag(s: string): boolean {
    const tags = ['<thinkthink>', '</thinkthink>', '<LMTHINK>', '</LMTHINK>'];
    for (const tag of tags) {
      for (let len = 1; len <= tag.length; len++) {
        if (s.endsWith(tag.slice(0, len))) return true;
      }
    }
    return false;
  }
}
