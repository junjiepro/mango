/**
 * MiniApp Service
 * T083: Create MiniApp service
 */

import { createClient } from '@/lib/supabase/server';
import { AppError, ErrorType } from '@mango/shared/utils';
import type { Database } from '@/types/database.types';
import crypto from 'crypto';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInsert = Database['public']['Tables']['mini_apps']['Insert'];
type MiniAppUpdate = Database['public']['Tables']['mini_apps']['Update'];

export interface MiniAppManifest {
  version: string;
  required_permissions: string[];
  apis: string[];
  triggers: Array<{
    type: 'schedule' | 'event';
    config: Record<string, any>;
  }>;
}

export interface MiniAppRuntimeConfig {
  sandbox_level: 'strict' | 'moderate' | 'relaxed';
  max_memory_mb: number;
  max_execution_time_ms: number;
  allowed_domains: string[];
}

/**
 * MiniAppService 类
 * 处理小应用的 CRUD 操作
 */
export class MiniAppService {
  /**
   * 创建新小应用
   */
  async createMiniApp(data: {
    name: string;
    display_name: string;
    description: string;
    code: string;
    html?: Record<string, string>;
    icon_url?: string;
    manifest?: MiniAppManifest;
    runtime_config?: MiniAppRuntimeConfig;
    tags?: string[];
    is_public?: boolean;
    is_shareable?: boolean;
  }): Promise<MiniApp> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    // 生成代码哈希
    const code_hash = crypto.createHash('sha256').update(data.code).digest('hex');

    // 默认 manifest
    const defaultManifest: MiniAppManifest = {
      version: '1.0.0',
      required_permissions: [],
      apis: [],
      triggers: [],
    };

    // 默认运行时配置
    const defaultRuntimeConfig: MiniAppRuntimeConfig = {
      sandbox_level: 'strict',
      max_memory_mb: 10,
      max_execution_time_ms: 5000,
      allowed_domains: [],
    };

    const miniAppData: MiniAppInsert = {
      creator_id: user.id,
      name: data.name,
      display_name: data.display_name,
      description: data.description,
      code: data.code,
      code_hash,
      html: data.html,
      icon_url: data.icon_url,
      manifest: data.manifest || defaultManifest,
      runtime_config: data.runtime_config || defaultRuntimeConfig,
      tags: data.tags || [],
      is_public: data.is_public ?? false,
      is_shareable: data.is_shareable ?? true,
      status: 'draft',
      stats: {
        install_count: 0,
        active_users: 0,
        total_invocations: 0,
        avg_rating: 0,
      },
      security_review: {
        reviewed: false,
        reviewed_at: null,
        reviewer_id: null,
        risk_level: 'unknown',
      },
    };

    const { data: miniApp, error } = await supabase
      .from('mini_apps')
      .insert(miniAppData)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to create mini app: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return miniApp;
  }

  /**
   * 获取小应用详情
   */
  async getMiniApp(id: string): Promise<MiniApp> {
    const supabase = await createClient();
    const { data: miniApp, error } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new AppError(`Failed to get mini app: ${error.message}`, ErrorType.DATABASE_ERROR, 500);
    }

    if (!miniApp) {
      throw new AppError('Mini app not found', ErrorType.NOT_FOUND, 404);
    }

    return miniApp;
  }

  /**
   * 获取用户创建的小应用列表
   */
  async getUserMiniApps(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: MiniApp[]; count: number }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    let query = supabase
      .from('mini_apps')
      .select('*', { count: 'exact' })
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(
        `Failed to get user mini apps: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return { data: data || [], count: count || 0 };
  }

  /**
   * 获取用户拥有的小应用（创建的 + 安装的）
   */
  async getOwnedMiniApps(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: MiniApp[]; count: number }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    // 获取用户安装的应用 ID
    const { data: installations } = await supabase
      .from('mini_app_installations')
      .select('mini_app_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const installedIds = (installations || []).map(i => i.mini_app_id);

    // 查询用户创建的或已安装的应用
    let query = supabase
      .from('mini_apps')
      .select('*', { count: 'exact' })
      .or(`creator_id.eq.${user.id},id.in.(${installedIds.join(',')})`)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(
        `Failed to get owned mini apps: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return { data: data || [], count: count || 0 };
  }

  /**
   * 获取公开的小应用列表
   */
  async getPublicMiniApps(options?: {
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: MiniApp[]; count: number }> {
    const supabase = await createClient();
    let query = supabase
      .from('mini_apps')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .eq('status', 'active')
      .order('stats->install_count', { ascending: false });

    if (options?.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    if (options?.search) {
      query = query.or(
        `display_name.ilike.%${options.search}%,description.ilike.%${options.search}%`
      );
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(
        `Failed to get public mini apps: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return { data: data || [], count: count || 0 };
  }

  /**
   * 创建版本快照
   * 保存当前 app 状态到 mini_app_versions 表
   */
  async createVersionSnapshot(id: string, changeSummary?: string): Promise<{ version: string; created: boolean }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const app = await this.getMiniApp(id);

    // 计算内容哈希，用于去重
    const raw = `${app.code || ''}|${(app as any).skill_content || ''}|${JSON.stringify(app.html || {})}`;
    const contentHash = crypto.createHash('sha256').update(raw).digest('hex');

    // 检查是否已有相同哈希的版本
    const { data: existing } = await supabase
      .from('mini_app_versions')
      .select('version')
      .eq('mini_app_id', id)
      .eq('content_hash', contentHash)
      .single();

    if (existing) {
      return { version: existing.version, created: false };
    }

    // 生成新版本号
    const { data: nextVersion } = await supabase
      .rpc('generate_next_mini_app_version', { p_mini_app_id: id });

    const version = nextVersion || '1.0.1';

    // 插入版本记录
    const { error } = await supabase.from('mini_app_versions').insert({
      mini_app_id: id,
      version,
      code_snapshot: app.code,
      skill_snapshot: (app as any).skill_content,
      html_snapshot: app.html,
      manifest_snapshot: app.manifest,
      content_hash: contentHash,
      change_summary: changeSummary || '保存版本',
      changed_by: user.id,
    });

    if (error) {
      console.error('Failed to create version snapshot:', error);
    }

    // 回写 manifest.version 到 mini_apps 表
    if (!error) {
      const currentManifest = (app.manifest as Record<string, unknown>) || {};
      await supabase
        .from('mini_apps')
        .update({ manifest: { ...currentManifest, version } })
        .eq('id', id);
    }

    return { version, created: true };
  }

  /**
   * 更新小应用
   */
  async updateMiniApp(
    id: string,
    updates: {
      display_name?: string;
      description?: string;
      code?: string;
      skill_content?: string;
      html?: Record<string, string>;
      icon_url?: string;
      manifest?: MiniAppManifest;
      runtime_config?: MiniAppRuntimeConfig;
      tags?: string[];
      is_public?: boolean;
      is_shareable?: boolean;
      status?: string;
    }
  ): Promise<MiniApp> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    // 验证所有权
    const existingApp = await this.getMiniApp(id);
    if (existingApp.creator_id !== user.id) {
      throw new AppError('Not authorized to update this mini app', ErrorType.AUTH_FORBIDDEN, 403);
    }

    const updateData: MiniAppUpdate = { ...updates };

    // 如果更新了代码,重新计算哈希
    if (updates.code) {
      updateData.code_hash = crypto.createHash('sha256').update(updates.code).digest('hex');
    }

    const { data: miniApp, error } = await supabase
      .from('mini_apps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to update mini app: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return miniApp;
  }

  /**
   * 发布小应用
   */
  async publishMiniApp(id: string): Promise<MiniApp> {
    return this.updateMiniApp(id, {
      status: 'active',
      is_public: true,
    });
  }

  /**
   * 删除小应用
   */
  async deleteMiniApp(id: string): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    // 验证所有权
    const existingApp = await this.getMiniApp(id);
    if (existingApp.creator_id !== user.id) {
      throw new AppError('Not authorized to delete this mini app', ErrorType.AUTH_FORBIDDEN, 403);
    }

    const { error } = await supabase.from('mini_apps').delete().eq('id', id);

    if (error) {
      throw new AppError(
        `Failed to delete mini app: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }
  }

  /**
   * 增加小应用调用次数
   */
  async incrementInvocationCount(id: string): Promise<void> {
    const supabase = await createClient();
    const miniApp = await this.getMiniApp(id);
    const stats = (miniApp.stats as any) || {};

    const { error } = await supabase
      .from('mini_apps')
      .update({
        stats: {
          ...stats,
          total_invocations: (stats.total_invocations || 0) + 1,
        },
      })
      .eq('id', id);

    if (error) {
      throw new AppError(
        `Failed to increment invocation count: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }
  }
}

// 导出单例
export const miniAppService = new MiniAppService();
