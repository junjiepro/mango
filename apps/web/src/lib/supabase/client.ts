/**
 * Supabase Browser Client
 * T028: Create Supabase client factory (browser client)
 */

import { createBrowserClient } from '@supabase/ssr';
import { type Database } from '@/types/database.types';
import { authConfig } from './auth-config';

/**
 * 创建 Supabase 浏览器客户端
 * 用于客户端组件和客户端操作
 *
 * @returns Supabase 客户端实例
 */
export function createClient() {
  // 从环境变量获取配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: authConfig,
    cookies: {
      get(name: string) {
        // 仅在浏览器环境读取 cookie
        if (typeof document === 'undefined') {
          return undefined;
        }
        const value = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`))
          ?.split('=')[1];
        return value ? decodeURIComponent(value) : undefined;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        // 仅在浏览器环境设置 cookie
        if (typeof document === 'undefined') {
          return;
        }
        let cookie = `${name}=${encodeURIComponent(value)}`;

        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`;
        }
        if (options?.path) {
          cookie += `; path=${options.path}`;
        }
        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }
        if (options?.sameSite) {
          cookie += `; samesite=${options.sameSite}`;
        }
        if (options?.secure) {
          cookie += '; secure';
        }

        document.cookie = cookie;
      },
      remove(name: string, options: Record<string, unknown>) {
        // 仅在浏览器环境删除 cookie
        if (typeof document === 'undefined') {
          return;
        }
        let cookie = `${name}=; max-age=0`;

        if (options?.path) {
          cookie += `; path=${options.path}`;
        }
        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }

        document.cookie = cookie;
      },
    },
  });
}

/**
 * 单例模式的客户端实例
 * 避免在客户端组件中重复创建
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

/**
 * 获取单例客户端实例
 */
export function getClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

/**
 * 重置客户端实例
 * 用于测试或需要重新初始化的场景
 */
export function resetClient() {
  clientInstance = null;
}
