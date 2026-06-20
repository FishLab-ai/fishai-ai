/**
 * FishAI ZAI SDK 客户端封装
 * 统一管理 z-ai-web-dev-sdk 的初始化和调用
 */

import ZAI from 'z-ai-web-dev-sdk';

export class ZAIClient {
  private static instance: ZAI | null = null;

  /**
   * 获取单例 ZAI 客户端
   */
  static async getClient(): Promise<ZAI> {
    if (!ZAIClient.instance) {
      ZAIClient.instance = await ZAI.create();
    }
    return ZAIClient.instance;
  }

  /**
   * 重置客户端（更换配置时使用）
   */
  static reset(): void {
    ZAIClient.instance = null;
  }
}
