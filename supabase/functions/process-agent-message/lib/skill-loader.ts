/**
 * Skill Loader
 * 统一 Skill 加载器，适配 Edge Function 环境限制
 *
 * 设计：
 * - 构建时：skills/*.md → manifest.json (打包到函数)
 * - 运行时：从 manifest 或数据库加载内容
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 从打包的 manifest 导入
import manifest from '../skill-manifest.json' with { type: 'json' };

export interface SkillManifestEntry {
  skill_id: string;
  name: string;
  description: string;
  category: 'edge' | 'remote' | 'device';
  keywords: string[];
  triggers: string[];
  tags: string[];
  priority: number;
  content: string;
  content_hash: string;
}

export interface SkillMetadata {
  skill_id: string;
  name: string;
  description: string | null;
  category: string;
  skill_type: string | null;
  keywords: string[];
  triggers: string[];
  tags: string[];
  priority: number;
}

/**
 * 统一 Skill 加载器
 */
export class SkillLoader {
  private supabase: SupabaseClient;
  private manifestMap: Map<string, SkillManifestEntry>;
  private initialized = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // 构建 manifest 索引
    const skills = (manifest as any).skills || [];
    this.manifestMap = new Map(
      skills.map((s: SkillManifestEntry) => [s.skill_id, s])
    );
  }

  /**
   * 首次请求时同步 manifest 到数据库
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const skills = (manifest as any).skills || [];
    if (skills.length === 0) {
      this.initialized = true;
      return;
    }

    for (const entry of skills as SkillManifestEntry[]) {
      // Upsert 元数据到 skill_registry
      await this.supabase.from('skill_registry').upsert({
        skill_id: entry.skill_id,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        skill_type: 'system',
        keywords: entry.keywords,
        triggers: entry.triggers,
        tags: entry.tags,
        priority: entry.priority,
        content_hash: entry.content_hash,
        content_ref: { source: 'manifest' },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' });

      // Upsert 内容到 skill_content_cache
      await this.supabase.from('skill_content_cache').upsert({
        skill_id: entry.skill_id,
        content: entry.content,
        content_hash: entry.content_hash,
        cached_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' });
    }

    this.initialized = true;
  }

  /**
   * 加载所有元数据
   */
  async loadAllMetadata(): Promise<SkillMetadata[]> {
    const { data, error } = await this.supabase
      .from('skill_registry')
      .select('skill_id, name, description, category, skill_type, keywords, triggers, tags, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to load skill metadata:', error);
      return [];
    }

    return (data || []).map(row => ({
      skill_id: row.skill_id,
      name: row.name,
      description: row.description,
      category: row.category,
      skill_type: row.skill_type,
      keywords: row.keywords || [],
      triggers: row.triggers || [],
      tags: row.tags || [],
      priority: row.priority || 5,
    }));
  }

  /**
   * 加载完整内容
   */
  async loadContent(skillId: string): Promise<string | null> {
    // 1. 先查数据库缓存
    const { data: cached } = await this.supabase
      .from('skill_content_cache')
      .select('content')
      .eq('skill_id', skillId)
      .single();

    if (cached?.content) {
      // 更新命中计数（忽略错误）
      try {
        await this.supabase.rpc('increment_skill_hit_count', {
          p_skill_id: skillId
        });
      } catch {
        // 忽略计数更新失败
      }
      return cached.content;
    }

    // 2. Edge Skill 从 manifest 加载
    if (skillId.startsWith('edge:')) {
      const entry = this.manifestMap.get(skillId);
      if (entry) {
        // 写入缓存
        await this.supabase.from('skill_content_cache').upsert({
          skill_id: skillId,
          content: entry.content,
          content_hash: entry.content_hash,
          cached_at: new Date().toISOString(),
        }, { onConflict: 'skill_id' });
        return entry.content;
      }
    }

    return null;
  }
}