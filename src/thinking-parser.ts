/**
 * FishAI 深度思考解析器
 * 解析 AI 回答中的 <thinkthink>...</thinkthink> 或 <LMTHINK>...</LMTHINK> 标签
 * 支持流式解析，边生成边分离思考过程和最终回答
 */

export interface ParseEvent {
  type: 'thinking' | 'content';
  content: string;
}

interface TagPair {
  openIdx: number;
  openTagLen: number;
  closeIdx: number;
  closeTagLen: number;
}

export class ThinkingParser {
  private thinkingDone = false;
  private lastSentThinkingLen = 0;
  private bufferedContent = '';

  /**
   * 流式解析：每次传入新的 chunk，返回分离后的事件
   */
  parse(fullContent: string, chunk: string, deepThinking: boolean): ParseEvent[] {
    // 非深度思考模式：直接透传
    if (!deepThinking) {
      if (chunk.length > 0) {
        return [{ type: 'content', content: chunk }];
      }
      return [];
    }

    // 思考已结束：直接透传后续内容
    if (this.thinkingDone) {
      if (chunk.length > 0) {
        return [{ type: 'content', content: chunk }];
      }
      return [];
    }

    const tags = this.findTagPair(fullContent);

    // 还没出现开标签 —— 检测是否是不完整的标签片段
    if (tags.openIdx === -1) {
      return this.handleNoOpenTag(fullContent, chunk);
    }

    // 清除之前的 buffer
    if (this.bufferedContent.length > 0) {
      this.bufferedContent = '';
    }

    // 开标签已出现但闭标签还没出现 —— 流式输出思考内容
    if (tags.closeIdx === -1) {
      return this.handleStreamingThinking(fullContent, tags.openIdx, tags.openTagLen);
    }

    // 闭标签出现了 —— 最终状态
    this.thinkingDone = true;

    const events: ParseEvent[] = [];

    const thinkContent = fullContent.slice(tags.openIdx + tags.openTagLen, tags.closeIdx);
    if (thinkContent.length > this.lastSentThinkingLen) {
      const newPart = thinkContent.slice(this.lastSentThinkingLen);
      this.lastSentThinkingLen = thinkContent.length;
      events.push({ type: 'thinking', content: newPart });
    }

    const afterThink = fullContent.slice(tags.closeIdx + tags.closeTagLen);
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

  private findTagPair(content: string): TagPair {
    const openIdx = content.indexOf('<thinkthink>');
    const openIdxAlt = content.indexOf('<LMTHINK>');
    const effectiveOpenIdx = openIdx !== -1 ? openIdx : openIdxAlt;
    const openTagLen = this.resolveTagLength(openIdx, openIdxAlt, '<thinkthink>', '<LMTHINK>');

    const closeIdx = content.indexOf('</thinkthink>');
    const closeIdxAlt = content.indexOf('</LMTHINK>');
    const effectiveCloseIdx = closeIdx !== -1 ? closeIdx : closeIdxAlt;
    const closeTagLen = this.resolveTagLength(closeIdx, closeIdxAlt, '</thinkthink>', '</LMTHINK>');

    return { openIdx: effectiveOpenIdx, openTagLen, closeIdx: effectiveCloseIdx, closeTagLen };
  }

  private resolveTagLength(
    primaryIdx: number,
    altIdx: number,
    primaryTag: string,
    altTag: string
  ): number {
    if (primaryIdx !== -1) {
      return primaryTag.length;
    }
    if (altIdx !== -1) {
      return altTag.length;
    }
    return 0;
  }

  private handleNoOpenTag(fullContent: string, chunk: string): ParseEvent[] {
    if (this.couldBePartialTag(fullContent)) {
      this.bufferedContent = fullContent;
      return [];
    }
    this.bufferedContent = '';
    if (chunk.length > 0) {
      return [{ type: 'content', content: chunk }];
    }
    return [];
  }

  private handleStreamingThinking(
    fullContent: string,
    openIdx: number,
    openTagLen: number
  ): ParseEvent[] {
    const thinkContent = fullContent.slice(openIdx + openTagLen);
    if (thinkContent.length > this.lastSentThinkingLen) {
      const newPart = thinkContent.slice(this.lastSentThinkingLen);
      this.lastSentThinkingLen = thinkContent.length;
      return [{ type: 'thinking', content: newPart }];
    }
    return [];
  }

  private couldBePartialTag(s: string): boolean {
    const tags = ['<thinkthink>', '</thinkthink>', '<LMTHINK>', '</LMTHINK>'];
    for (const tag of tags) {
      for (let len = 1; len <= tag.length; len++) {
        if (s.endsWith(tag.slice(0, len))) {
          return true;
        }
      }
    }
    return false;
  }
}