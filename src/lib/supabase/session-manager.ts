import { createClient } from '@/lib/supabase/server'

// 会话管理工具函数
export class SessionManager {
  // 检查会话是否有效
  static async isSessionValid() {
    try {
      const supabase = await createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[SessionManager] Error checking session:', error.message)
        return false
      }

      if (!session) {
        console.log('[SessionManager] No active session found')
        return false
      }

      // 检查会话是否过期
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        console.warn('[SessionManager] Session expired')
        return false
      }

      console.log('[SessionManager] Valid session found for user:', session.user.id)
      return true

    } catch (error) {
      console.error('[SessionManager] Failed to check session validity:', error)
      return false
    }
  }

  // 刷新会话
  static async refreshSession() {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('[SessionManager] Error refreshing session:', error.message)
        return { success: false, error: error.message }
      }

      if (!data.session) {
        console.warn('[SessionManager] No session returned after refresh')
        return { success: false, error: '无法刷新会话' }
      }

      console.log('[SessionManager] Session refreshed successfully for user:', data.session.user.id)
      return { success: true, session: data.session }

    } catch (error) {
      console.error('[SessionManager] Failed to refresh session:', error)
      return { success: false, error: '刷新会话时发生错误' }
    }
  }

  // 清理会话
  static async clearSession() {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[SessionManager] Error clearing session:', error.message)
        return { success: false, error: error.message }
      }

      console.log('[SessionManager] Session cleared successfully')
      return { success: true }

    } catch (error) {
      console.error('[SessionManager] Failed to clear session:', error)
      return { success: false, error: '清理会话时发生错误' }
    }
  }

  // 获取会话信息
  static async getSessionInfo() {
    try {
      const supabase = await createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[SessionManager] Error getting session info:', error.message)
        return { success: false, error: error.message }
      }

      if (!session) {
        return { success: true, session: null }
      }

      const sessionInfo = {
        userId: session.user.id,
        email: session.user.email,
        createdAt: new Date(session.user.created_at),
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
        hasRefreshToken: !!session.refresh_token,
        userMetadata: session.user.user_metadata
      }

      return { success: true, session: sessionInfo }

    } catch (error) {
      console.error('[SessionManager] Failed to get session info:', error)
      return { success: false, error: '获取会话信息时发生错误' }
    }
  }
}

// 会话相关的Server Actions
export async function getSessionStatus() {
  const isValid = await SessionManager.isSessionValid()
  const sessionInfo = await SessionManager.getSessionInfo()

  return {
    isValid,
    ...sessionInfo
  }
}

export async function refreshCurrentSession() {
  return await SessionManager.refreshSession()
}

export async function clearCurrentSession() {
  return await SessionManager.clearSession()
}