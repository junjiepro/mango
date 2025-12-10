/**
 * AI Service
 * 封装 Vercel AI SDK，提供统一的 AI 模型调用接口
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIGenerateResult {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

/**
 * AI Service 类
 * 提供 AI 模型调用功能
 */
export class AIService {
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    this.defaultModel = options?.model || 'claude-3-5-sonnet-20241022';
    this.defaultTemperature = options?.temperature || 0.7;
    this.defaultMaxTokens = options?.maxTokens || 4096;
  }

  /**
   * 生成文本回复（非流式）
   */
  async generateText(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? this.defaultTemperature;
    const maxTokens = options.maxTokens || this.defaultMaxTokens;

    // 构建消息列表
    const messages = options.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...options.messages]
      : options.messages;

    try {
      const result = await generateText({
        model: anthropic(model),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        maxTokens,
      });

      return {
        content: result.text,
        model,
        tokensUsed: result.usage.totalTokens,
        finishReason: result.finishReason,
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(
        `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 生成流式文本回复
   */
  async *generateTextStream(options: AIGenerateOptions): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? this.defaultTemperature;
    const maxTokens = options.maxTokens || this.defaultMaxTokens;

    // 构建消息列表
    const messages = options.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...options.messages]
      : options.messages;

    try {
      const result = await streamText({
        model: anthropic(model),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        maxTokens,
      });

      // 流式返回文本片段
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      console.error('AI streaming error:', error);
      throw new Error(
        `Failed to stream AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 生成对话回复（带上下文）
   */
  async generateConversationReply(
    conversationHistory: AIMessage[],
    userMessage: string,
    systemPrompt?: string
  ): Promise<AIGenerateResult> {
    const messages: AIMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    return this.generateText({
      messages,
      systemPrompt,
    });
  }

  /**
   * 生成简单回复（无上下文）
   */
  async generateSimpleReply(
    userMessage: string,
    systemPrompt?: string
  ): Promise<AIGenerateResult> {
    return this.generateText({
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      systemPrompt,
    });
  }
}

/**
 * 创建 AI Service 实例
 */
export function createAIService(options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): AIService {
  return new AIService(options);
}

/**
 * 默认 AI Service 实例
 */
export const aiService = createAIService();
