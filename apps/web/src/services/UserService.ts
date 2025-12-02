/**
 * User Service
 * T075: Create user profile service
 */

import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorType } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

/**
 * UserService 类
 * 处理用户配置文件的 CRUD 操作
 */
export class UserService {
  private supabase = createClient()

  /**
   * 获取当前用户配置
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      return null
    }

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      // 如果配置不存在,创建默认配置
      if (error.code === 'PGRST116') {
        return this.createUserProfile(user.id)
      }

      throw new AppError(
        `Failed to fetch user profile: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return profile
  }

  /**
   * 创建用户配置
   */
  async createUserProfile(userId: string): Promise<UserProfile> {
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .insert({
        id: userId,
        display_name: null,
        avatar_url: null,
        bio: null,
      })
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to create user profile: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return profile
  }

  /**
   * 更新用户配置
   */
  async updateUserProfile(updates: UserProfileUpdate): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update user profile: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return profile
  }

  /**
   * 更新用户偏好设置
   */
  async updatePreferences(preferences: Record<string, any>): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 获取当前配置
    const currentProfile = await this.getCurrentUserProfile()

    if (!currentProfile) {
      throw new AppError('User profile not found', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    // 合并偏好设置
    const updatedPreferences = {
      ...(currentProfile.preferences as Record<string, any> || {}),
      ...preferences,
    }

    return this.updateUserProfile({
      preferences: updatedPreferences,
    })
  }

  /**
   * 更新用户配额
   */
  async updateQuota(quota: Record<string, any>): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    return this.updateUserProfile({
      quota,
    })
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    conversationCount: number
    messageCount: number
    taskCount: number
  }> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 获取对话数量
    const { count: conversationCount } = await this.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    // 获取消息数量
    const { count: messageCount } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)

    // 获取任务数量
    const { count: taskCount } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return {
      conversationCount: conversationCount || 0,
      messageCount: messageCount || 0,
      taskCount: taskCount || 0,
    }
  }

  /**
   * 更新最后活跃时间
   */
  async updateLastActive(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      return
    }

    await this.supabase
      .from('user_profiles')
      .update({
        last_active_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  }
}

/**
 * 导出单例实例
 */
export const userService = new UserService()
