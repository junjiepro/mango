/**
 * Learning Context Loader
 * 加载用户学习规则到 Agent 上下文
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface LearningContext {
  preferences: string[];
  extensionSkills: string[];
}

export async function loadLearningContext(
  supabase: SupabaseClient,
  userId: string
): Promise<LearningContext> {
  const { data } = await supabase
    .from('learning_records')
    .select('rule_type, rule_content, confidence_score')
    .eq('user_id', userId)
    .gte('confidence_score', 0.5)
    .order('confidence_score', { ascending: false })
    .limit(10);

  const preferences: string[] = [];
  const extensionSkills: string[] = [];

  for (const rule of data || []) {
    if (rule.rule_type.startsWith('preference_')) {
      preferences.push(formatPreference(rule));
    } else if (rule.rule_type === 'extension_skill') {
      extensionSkills.push(formatSkill(rule));
    }
  }

  return { preferences, extensionSkills };
}

function formatPreference(rule: any): string {
  const { category, preference } = rule.rule_content || {};
  return `${category || '通用'}: ${preference === 'positive' ? '偏好' : '不偏好'}`;
}

function formatSkill(rule: any): string {
  const { name, content } = rule.rule_content || {};
  return `### ${name || '未命名技能'}\n${content || ''}`;
}
