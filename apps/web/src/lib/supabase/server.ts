/**
 * Supabase Server Client
 * T029: Create Supabase server client (server-side)
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type Database } from '@/types/database.types'
import { authConfig } from './auth-config'

/**
 * 创建 Supabase 服务端客户端
 * 用于 Server Components、Server Actions 和 Route Handlers
 *
 * @returns Supabase 服务端客户端实例
 */
export async function createClient() {
  const cookieStore = await cookies()

  // 从环境变量获取配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: authConfig,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // 在 Server Component 中调用 set 会失败
          // 这是预期行为，因为 Server Component 是只读的
          // 只有在 Server Action 或 Route Handler 中才能设置 cookie
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // 同上
        }
      },
    },
  })
}

/**
 * 创建管理员客户端
 * 使用 service_role key，绕过 RLS
 * ⚠️ 仅在服务端使用，不要暴露给客户端
 *
 * @returns Supabase 管理员客户端实例
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      ...authConfig,
      persistSession: false,
      autoRefreshToken: false,
    },
    cookies: {
      get() {
        return undefined
      },
      set() {},
      remove() {},
    },
  })
}

/**
 * 获取当前用户
 * 便捷方法，用于 Server Components
 *
 * @returns 当前用户或 null
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting current user:', error)
    return null
  }

  return user
}

/**
 * 获取当前会话
 * 便捷方法，用于 Server Components
 *
 * @returns 当前会话或 null
 */
export async function getCurrentSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting current session:', error)
    return null
  }

  return session
}

/**
 * 检查用户是否已认证
 * 便捷方法，用于 Server Components
 *
 * @returns 是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}
