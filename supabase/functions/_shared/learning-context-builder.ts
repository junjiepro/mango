/**
 * Learning Context Builder
 * T182: 集成学习规则到 Agent 请求上下文
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LearningContext {
  preferences: string[];
  extensionSkills: string[];
}

export class LearningContextBuilder {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async build(userId: string): Promise<LearningContext> {
    const { data } = await this.supabase
      .from('learning_records')
      .select('rule_type, rule_content, confidence_score')
      .eq('user_id', userId)
      .gte('confidence_score', 0.5);

    const preferences: string[] = [];
    const extensionSkills: string[] = [];

    for (const rule of data || []) {
      if (rule.rule_type.startsWith('preference_')) {
        preferences.push(this.formatPreference(rule));
      } else if (rule.rule_type === 'extension_skill') {
        extensionSkills.push(this.formatSkill(rule));
      }
    }

    return { preferences, extensionSkills };
  }

  private formatPreference(rule: any): string {
    const { category, preference } = rule.rule_content;
    return `${category}: ${preference}`;
  }

  private formatSkill(rule: any): string {
    return rule.rule_content.content || '';
  }

  buildPrompt(context: LearningContext): string {
    const sections: string[] = [];

    if (context.preferences.length > 0) {
      sections.push(`## 用户偏好\n${context.preferences.join('\n')}`);
    }

    if (context.extensionSkills.length > 0) {
      sections.push(`## 扩展技能\n${context.extensionSkills.join('\n\n')}`);
    }

    return sections.join('\n\n');
  }
}
