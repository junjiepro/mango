/**
 * Extension Skill Injector
 * T204: 将扩展 Skill 注入到 Agent 提示词
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ExtensionSkill {
  name: string;
  content: string;
  confidence: number;
}

export class ExtensionSkillInjector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getExtensionSkills(userId: string): Promise<ExtensionSkill[]> {
    const { data } = await this.supabase
      .from('learning_records')
      .select('rule_content, confidence_score')
      .eq('user_id', userId)
      .eq('rule_type', 'extension_skill')
      .gte('confidence_score', 0.6);

    return (data || []).map((r) => ({
      name: (r.rule_content as { name: string }).name,
      content: (r.rule_content as { content: string }).content,
      confidence: r.confidence_score,
    }));
  }

  buildPromptSection(skills: ExtensionSkill[]): string {
    if (skills.length === 0) return '';

    const skillsText = skills
      .map((s) => `### ${s.name}\n${s.content}`)
      .join('\n\n');

    return `
## 用户扩展技能
以下是基于用户反馈学习到的偏好规则：

${skillsText}
`.trim();
  }
}
