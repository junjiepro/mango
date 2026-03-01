/**
 * UnifiedSkillLoader - 统一 Skill 加载器
 * 实现三层缓存策略: 请求级缓存 → 数据库缓存 → 源
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 类型定义
interface SkillMetadata {
  skill_id: string;
  name: string;
  category: 'edge' | 'remote' | 'device';
  content_ref: Record<string, unknown>;
  content_hash?: string;
}

interface CachedContent {
  content: string;
  content_hash: string;
}

// 请求级缓存 (每次请求内有效)
const requestCache = new Map<string, string>();

export class UnifiedSkillLoader {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 加载 Skill 内容
   * 缓存策略: 请求级 → 数据库 → 源
   */
  async loadSkillContent(skillId: string): Promise<string | null> {
    // 1. 请求级缓存
    if (requestCache.has(skillId)) {
      return requestCache.get(skillId)!;
    }

    // 2. 获取元数据
    const metadata = await this.getSkillMetadata(skillId);
    if (!metadata) return null;

    // 3. 数据库缓存
    const cached = await this.getFromCache(skillId, metadata.content_hash);
    if (cached) {
      requestCache.set(skillId, cached.content);
      await this.incrementHitCount(skillId);
      return cached.content;
    }

    // 4. 从源加载
    const content = await this.loadFromSource(metadata);
    if (!content) return null;

    // 5. 更新缓存
    await this.updateCache(skillId, content);
    requestCache.set(skillId, content);

    return content;
  }

  /**
   * 获取 Skill 元数据
   */
  private async getSkillMetadata(skillId: string): Promise<SkillMetadata | null> {
    const { data, error } = await this.supabase
      .from('skill_registry')
      .select('skill_id, name, category, content_ref, content_hash')
      .eq('skill_id', skillId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data as SkillMetadata;
  }

  /**
   * 从数据库缓存获取
   */
  private async getFromCache(
    skillId: string,
    expectedHash?: string
  ): Promise<CachedContent | null> {
    const { data, error } = await this.supabase
      .from('skill_content_cache')
      .select('content, content_hash, expires_at')
      .eq('skill_id', skillId)
      .single();

    if (error || !data) return null;

    // 检查过期
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }

    // 检查哈希一致性
    if (expectedHash && data.content_hash !== expectedHash) {
      return null;
    }

    return { content: data.content, content_hash: data.content_hash };
  }

  /**
   * 从源加载内容
   */
  private async loadFromSource(metadata: SkillMetadata): Promise<string | null> {
    const { category, content_ref } = metadata;

    switch (category) {
      case 'edge':
        return this.loadEdgeSkill(content_ref as { path: string });
      case 'remote':
        return this.loadRemoteSkill(content_ref as { table: string; id: string });
      case 'device':
        // 设备 Skill 需要通过设备服务加载
        return null;
      default:
        return null;
    }
  }

  /**
   * 加载 Edge Skill (从文件系统)
   */
  private async loadEdgeSkill(ref: { path: string }): Promise<string | null> {
    try {
      // Edge Function 中读取本地文件
      const content = await Deno.readTextFile(ref.path);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * 加载 Remote Skill (从数据库)
   */
  private async loadRemoteSkill(ref: { table: string; id: string }): Promise<string | null> {
    const { data, error } = await this.supabase
      .from(ref.table)
      .select('content')
      .eq('id', ref.id)
      .single();

    if (error || !data) return null;
    return data.content;
  }

  /**
   * 更新缓存
   */
  private async updateCache(skillId: string, content: string): Promise<void> {
    const contentHash = await this.hashContent(content);

    await this.supabase
      .from('skill_content_cache')
      .upsert({
        skill_id: skillId,
        content,
        content_hash: contentHash,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        hit_count: 0,
      });
  }

  /**
   * 增加命中计数
   */
  private async incrementHitCount(skillId: string): Promise<void> {
    await this.supabase.rpc('increment_cache_hit', { p_skill_id: skillId });
  }

  /**
   * 计算内容哈希
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 清理请求级缓存
   */
  clearRequestCache(): void {
    requestCache.clear();
  }
}

export default UnifiedSkillLoader;
