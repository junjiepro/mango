/**
 * Extension Skill Generator
 * 基于用户反馈自动生成扩展 Skill
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FeedbackPattern {
  category: string;
  patterns: string[];
  frequency: number;
  confidence: number;
}

interface ExtensionSkill {
  name: string;
  description: string;
  content: string;
  source: 'feedback' | 'behavior' | 'explicit';
  confidence: number;
}

export class ExtensionSkillGenerator {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * 从反馈中提取模式
   */
  async extractPatterns(): Promise<FeedbackPattern[]> {
    const { data: feedbacks } = await this.supabase
      .from('feedback_records')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!feedbacks?.length) return [];

    const patterns = this.clusterFeedback(feedbacks);
    return patterns;
  }

  /**
   * 聚类反馈数据
   */
  private clusterFeedback(feedbacks: unknown[]): FeedbackPattern[] {
    const categoryMap = new Map<string, string[]>();

    for (const fb of feedbacks as Array<{ category?: string; comment?: string }>) {
      const category = fb.category || 'general';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      if (fb.comment) {
        categoryMap.get(category)!.push(fb.comment);
      }
    }

    return Array.from(categoryMap.entries()).map(([category, patterns]) => ({
      category,
      patterns,
      frequency: patterns.length,
      confidence: Math.min(patterns.length / 10, 1),
    }));
  }

  /**
   * 生成扩展 Skill
   */
  async generateSkill(pattern: FeedbackPattern): Promise<ExtensionSkill> {
    const skillName = `user-preference-${pattern.category}`;
    const description = `用户偏好: ${pattern.category}`;

    const content = this.buildSkillContent(pattern);

    return {
      name: skillName,
      description,
      content,
      source: 'feedback',
      confidence: pattern.confidence,
    };
  }

  /**
   * 构建 Skill 内容
   */
  private buildSkillContent(pattern: FeedbackPattern): string {
    const rules = pattern.patterns
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n');

    return `# User Preference: ${pattern.category}

## Description
基于用户反馈自动生成的偏好规则。

## Rules
${rules}

## Confidence
${(pattern.confidence * 100).toFixed(0)}%

## Source
- Feedback count: ${pattern.frequency}
- Category: ${pattern.category}
`;
  }

  /**
   * 保存生成的 Skill
   */
  async saveSkill(skill: ExtensionSkill): Promise<void> {
    await this.supabase.from('learning_records').upsert({
      user_id: this.userId,
      rule_type: 'extension_skill',
      rule_content: {
        name: skill.name,
        description: skill.description,
        content: skill.content,
        source: skill.source,
      },
      confidence_score: skill.confidence,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 获取用户的扩展 Skills
   */
  async getUserExtensionSkills(): Promise<ExtensionSkill[]> {
    const { data } = await this.supabase
      .from('learning_records')
      .select('rule_content, confidence_score')
      .eq('user_id', this.userId)
      .eq('rule_type', 'extension_skill');

    return (data || []).map((record) => ({
      ...(record.rule_content as Omit<ExtensionSkill, 'confidence'>),
      confidence: record.confidence_score,
    }));
  }
}
