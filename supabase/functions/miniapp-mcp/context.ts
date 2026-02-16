/**
 * MiniApp Sandbox Context
 * 提供 user, storage, notification 等 API
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Context } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import type {
  MiniApp,
  MiniAppSandboxContext,
  UserInfo,
  StorageAPI,
  NotificationAPI,
  HttpAPI,
  HttpOptions,
  HttpResponse,
} from './types.ts';

/**
 * 创建 MiniApp 沙箱上下文
 */
export async function createMiniAppContext(
  c: Context,
  supabase: SupabaseClient,
  miniApp: MiniApp
): Promise<MiniAppSandboxContext> {
  // 解析用户信息
  const user = await resolveUser(c, supabase);

  // 解析 installation ID（匿名用户为 null，降级为无存储）
  const installationId = await resolveInstallationId(supabase, user.id, miniApp);

  // 创建存储 API
  const storage = createStorageAPI(supabase, installationId);

  // 创建通知 API
  const notification = createNotificationAPI(supabase, miniApp, user);

  // 创建 HTTP API
  const http = createHttpAPI(miniApp);

  return {
    user,
    storage,
    notification,
    http,
    miniAppId: miniApp.id,
    miniAppName: miniApp.name,
  };
}

/**
 * 解析用户信息
 */
async function resolveUser(c: Context, supabase: SupabaseClient): Promise<UserInfo> {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return {
      id: 'anonymous',
      name: 'Anonymous',
      email: '',
    };
  }

  // Service-to-service 调用：使用 service_role key 认证时，
  // 通过 X-User-Id header 传递真实用户身份
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const forwardedUserId = c.req.header('X-User-Id');

  if (token === serviceRoleKey && forwardedUserId) {
    // 信任内部调用传递的 userId，查询用户基本信息
    const { data: { user } } = await supabase.auth.admin.getUserById(forwardedUserId);
    if (user) {
      return {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
      };
    }
    // 用户不存在但有 userId，仍使用该 ID（避免降级为 anonymous）
    return { id: forwardedUserId, name: 'User', email: '' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return {
      id: 'anonymous',
      name: 'Anonymous',
      email: '',
    };
  }

  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
  };
}

/**
 * 解析或创建 installation ID
 * 匿名用户返回 null（降级为无存储）
 */
async function resolveInstallationId(
  supabase: SupabaseClient,
  userId: string,
  miniApp: MiniApp
): Promise<string | null> {
  if (userId === 'anonymous') {
    return null;
  }

  // 查询已有的 active installation
  const { data: existing } = await supabase
    .from('mini_app_installations')
    .select('id')
    .eq('user_id', userId)
    .eq('mini_app_id', miniApp.id)
    .eq('status', 'active')
    .single();

  if (existing) {
    return existing.id;
  }

  // 未找到 → 自动创建（处理创建者调试场景）
  const { data: created, error } = await supabase
    .from('mini_app_installations')
    .insert({
      user_id: userId,
      mini_app_id: miniApp.id,
      installed_version: miniApp.manifest?.version || '1.0.0',
      status: 'active',
    })
    .select('id')
    .single();

  if (created) {
    return created.id;
  }

  // 并发冲突（unique_violation 23505）→ 重新查询
  if (error?.code === '23505') {
    const { data: retry } = await supabase
      .from('mini_app_installations')
      .select('id')
      .eq('user_id', userId)
      .eq('mini_app_id', miniApp.id)
      .eq('status', 'active')
      .single();

    return retry?.id ?? null;
  }

  return null;
}

/**
 * 创建存储 API
 */
function assertInstallation(installationId: string | null): asserts installationId is string {
  if (!installationId) {
    throw new Error('Storage unavailable: user not authenticated. Please log in to use this feature.');
  }
}

function createStorageAPI(supabase: SupabaseClient, installationId: string | null): StorageAPI {
  return {
    async get(key: string) {
      assertInstallation(installationId);
      const { data, error } = await supabase
        .from('mini_app_data')
        .select('value')
        .eq('installation_id', installationId)
        .eq('key', key)
        .single();
      // PGRST116 = no rows found, not a real error
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Storage read failed: ${error.message}`);
      }
      return data?.value ?? null;
    },

    async set(key: string, value: unknown) {
      assertInstallation(installationId);
      const { error } = await supabase.from('mini_app_data').upsert({
        installation_id: installationId,
        key,
        value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'installation_id,key' });
      if (error) {
        throw new Error(`Storage write failed: ${error.message}`);
      }
    },

    async delete(key: string) {
      assertInstallation(installationId);
      const { error } = await supabase
        .from('mini_app_data')
        .delete()
        .eq('installation_id', installationId)
        .eq('key', key);
      if (error) {
        throw new Error(`Storage delete failed: ${error.message}`);
      }
    },

    async list(prefix?: string) {
      assertInstallation(installationId);
      let query = supabase
        .from('mini_app_data')
        .select('key')
        .eq('installation_id', installationId);

      if (prefix) {
        query = query.like('key', `${prefix}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Storage list failed: ${error.message}`);
      }
      return (data || []).map((d: { key: string }) => d.key);
    },
  };
}

/**
 * 创建通知 API
 */
function createNotificationAPI(
  supabase: SupabaseClient,
  miniApp: MiniApp,
  user: UserInfo
): NotificationAPI {
  return {
    async send(title: string, body?: string) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        source_type: 'miniapp',
        source_id: miniApp.id,
        title,
        body: body || '',
        category: 'info',
        created_at: new Date().toISOString(),
      });
    },
  };
}

/**
 * 创建 HTTP API
 */
function createHttpAPI(_miniApp: MiniApp): HttpAPI {
  const defaultTimeout = 30000;

  async function request(
    method: string,
    url: string,
    body?: unknown,
    options?: HttpOptions
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeout || defaultTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => response.text());

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    get: (url, opts) => request('GET', url, undefined, opts),
    post: (url, body, opts) => request('POST', url, body, opts),
    put: (url, body, opts) => request('PUT', url, body, opts),
    delete: (url, opts) => request('DELETE', url, undefined, opts),
  };
}
