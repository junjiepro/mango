/**
 * Prompt Service
 * T181: 提示词工程服务，集成学习规则到 Agent 请求上下文
 */

import { createClient } from '@/lib/supabase/client';

interface LearningRule {
  rule_type: string;
  rule_content: Record<string, unknown>;
  confidence_score: number;
}

interface PromptContext {
  systemPrompt: string;
  userPreferences: string[];
  learningRules: LearningRule[];
}

export class PromptService {
  private supabase = createClient();

  /**
   * 获取用户的学习规则
   */
  async getUserLearningRules(userId: string): Promise<LearningRule[]> {
    const { data } = await this.supabase
      .from('learning_records')
      .select('rule_type, rule_content, confidence_score')
      .eq('user_id', userId)
      .gte('confidence_score', 0.5)
      .order('confidence_score', { ascending: false })
      .limit(10);

    return (data || []) as LearningRule[];
  }

  /**
   * 构建增强的提示词上下文
   */
  async buildPromptContext(userId: string): Promise<PromptContext> {
    const rules = await this.getUserLearningRules(userId);

    const userPreferences = rules
      .filter((r) => r.rule_type.startsWith('preference_'))
      .map((r) => this.formatPreference(r));

    const systemPrompt = this.buildSystemPrompt(userPreferences);

    return {
      systemPrompt,
      userPreferences,
      learningRules: rules,
    };
  }

  /**
   * 格式化偏好规则
   */
  private formatPreference(rule: LearningRule): string {
    const content = rule.rule_content as {
      category?: string;
      preference?: string;
      patterns?: string[];
    };

    const category = content.category || 'general';
    const preference = content.preference || 'neutral';

    return `用户对 ${category} 类型的内容偏好: ${preference}`;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(preferences: string[]): string {
    if (preferences.length === 0) {
      return '';
    }

    return `
## 用户偏好
基于历史反馈，用户有以下偏好：
${preferences.map((p, i) => `${i + 1}. ${p}`).join('\n')}

请在回复时考虑这些偏好。
`.trim();
  }
}

export const promptService = new PromptService();
