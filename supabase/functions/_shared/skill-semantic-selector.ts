/**
 * Skill Keyword Selector
 * T168: 基于关键词的 Skill 选择器（替代语义搜索）
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SkillMatch {
  id: string;
  name: string;
  description: string;
  category: string;
  rank: number;
}

export class SkillKeywordSelector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async selectSkills(
    userQuery: string,
    limit = 5
  ): Promise<SkillMatch[]> {
    // 使用全文搜索
    const { data, error } = await this.supabase.rpc(
      'search_skills_by_keywords',
      {
        query_text: userQuery,
        match_count: limit,
      }
    );

    if (error) {
      console.error('Skill search error:', error);
      return [];
    }

    return data || [];
  }
}
