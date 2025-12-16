/**
 * MiniApp Installation Service
 * T084: Create MiniApp installation service
 */

import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorType } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'
import { miniAppService } from './MiniAppService'

type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']
type MiniAppInstallationInsert = Database['public']['Tables']['mini_app_installations']['Insert']
type MiniAppInstallationUpdate = Database['public']['Tables']['mini_app_installations']['Update']

/**
 * MiniAppInstallationService 类
 * 处理小应用安装、卸载和配置管理
 */
export class MiniAppInstallationService {
  private supabase = createClient()

  /**
   * 安装小应用
   */
  async installMiniApp(data: {
    mini_app_id: string
    custom_name?: string
    granted_permissions?: string[]
    user_config?: Record<string, any>
  }): Promise<MiniAppInstallation> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 检查小应用是否存在
    const miniApp = await miniAppService.getMiniApp(data.mini_app_id)

    // 检查是否已安装
    const existing = await this.getInstallation(data.mini_app_id)
    if (existing) {
      throw new AppError('Mini app already installed', ErrorType.VALIDATION_ERROR, 400)
    }

    // 验证权限请求
    const manifest = miniApp.manifest as any
    const requiredPermissions = manifest?.required_permissions || []
    const grantedPermissions = data.granted_permissions || []

    // 确保所有必需权限都被授予
    const missingPermissions = requiredPermissions.filter(
      (perm: string) => !grantedPermissions.includes(perm)
    )

    if (missingPermissions.length > 0) {
      throw new AppError(
        `Missing required permissions: ${missingPermissions.join(', ')}`,
        ErrorType.VALIDATION_ERROR,
        400
      )
    }

    const installationData: MiniAppInstallationInsert = {
      user_id: user.id,
      mini_app_id: data.mini_app_id,
      installed_version: manifest?.version || '1.0.0',
      custom_name: data.custom_name,
      granted_permissions: grantedPermissions,
      user_config: data.user_config || {},
      status: 'active',
      stats: {
        invocation_count: 0,
        last_used_at: null,
        total_runtime_ms: 0,
      },
    }

    const { data: installation, error } = await this.supabase
      .from('mini_app_installations')
      .insert(installationData)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to install mini app: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    // 更新小应用的安装统计
    await this.updateMiniAppStats(data.mini_app_id, 'install')

    return installation
  }

  /**
   * 获取用户的某个小应用安装
   */
  async getInstallation(mini_app_id: string): Promise<MiniAppInstallation | null> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data, error } = await this.supabase
      .from('mini_app_installations')
      .select('*')
      .eq('user_id', user.id)
      .eq('mini_app_id', mini_app_id)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new AppError(
        `Failed to get installation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return data || null
  }

  /**
   * 获取用户安装的所有小应用
   */
  async getUserInstallations(options?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ data: MiniAppInstallation[]; count: number }> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    let query = this.supabase
      .from('mini_app_installations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    } else {
      query = query.eq('status', 'active')
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new AppError(
        `Failed to get user installations: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return { data: data || [], count: count || 0 }
  }

  /**
   * 更新小应用安装配置
   */
  async updateInstallation(
    installation_id: string,
    updates: {
      custom_name?: string
      granted_permissions?: string[]
      user_config?: Record<string, any>
      status?: string
    }
  ): Promise<MiniAppInstallation> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 验证所有权
    const { data: existing, error: fetchError } = await this.supabase
      .from('mini_app_installations')
      .select('*')
      .eq('id', installation_id)
      .single()

    if (fetchError || !existing) {
      throw new AppError('Installation not found', ErrorType.NOT_FOUND, 404)
    }

    if (existing.user_id !== user.id) {
      throw new AppError('Not authorized to update this installation', ErrorType.AUTH_FORBIDDEN, 403)
    }

    const updateData: MiniAppInstallationUpdate = { ...updates }

    const { data: installation, error } = await this.supabase
      .from('mini_app_installations')
      .update(updateData)
      .eq('id', installation_id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update installation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return installation
  }

  /**
   * 暂停小应用
   */
  async pauseInstallation(installation_id: string): Promise<MiniAppInstallation> {
    return this.updateInstallation(installation_id, { status: 'paused' })
  }

  /**
   * 恢复小应用
   */
  async resumeInstallation(installation_id: string): Promise<MiniAppInstallation> {
    return this.updateInstallation(installation_id, { status: 'active' })
  }

  /**
   * 卸载小应用
   */
  async uninstallMiniApp(installation_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 验证所有权
    const { data: existing, error: fetchError } = await this.supabase
      .from('mini_app_installations')
      .select('*')
      .eq('id', installation_id)
      .single()

    if (fetchError || !existing) {
      throw new AppError('Installation not found', ErrorType.NOT_FOUND, 404)
    }

    if (existing.user_id !== user.id) {
      throw new AppError('Not authorized to uninstall this mini app', ErrorType.AUTH_FORBIDDEN, 403)
    }

    // 软删除：更新状态为 uninstalled
    const { error } = await this.supabase
      .from('mini_app_installations')
      .update({
        status: 'uninstalled',
        uninstalled_at: new Date().toISOString(),
      })
      .eq('id', installation_id)

    if (error) {
      throw new AppError(
        `Failed to uninstall mini app: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    // 更新小应用的安装统计
    await this.updateMiniAppStats(existing.mini_app_id, 'uninstall')
  }

  /**
   * 记录小应用调用
   */
  async recordInvocation(installation_id: string, runtime_ms: number): Promise<void> {
    const { data: installation, error: fetchError } = await this.supabase
      .from('mini_app_installations')
      .select('*')
      .eq('id', installation_id)
      .single()

    if (fetchError || !installation) {
      throw new AppError('Installation not found', ErrorType.NOT_FOUND, 404)
    }

    const stats = installation.stats as any || {}

    const { error } = await this.supabase
      .from('mini_app_installations')
      .update({
        stats: {
          invocation_count: (stats.invocation_count || 0) + 1,
          last_used_at: new Date().toISOString(),
          total_runtime_ms: (stats.total_runtime_ms || 0) + runtime_ms,
        },
      })
      .eq('id', installation_id)

    if (error) {
      throw new AppError(
        `Failed to record invocation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    // 同时更新小应用的全局调用统计
    await miniAppService.incrementInvocationCount(installation.mini_app_id)
  }

  /**
   * 检查权限
   */
  async checkPermission(installation_id: string, permission: string): Promise<boolean> {
    const { data: installation, error } = await this.supabase
      .from('mini_app_installations')
      .select('granted_permissions')
      .eq('id', installation_id)
      .single()

    if (error || !installation) {
      return false
    }

    const grantedPermissions = installation.granted_permissions || []
    return grantedPermissions.includes(permission)
  }

  /**
   * 更新小应用的安装统计
   */
  private async updateMiniAppStats(
    mini_app_id: string,
    action: 'install' | 'uninstall'
  ): Promise<void> {
    const miniApp = await miniAppService.getMiniApp(mini_app_id)
    const stats = miniApp.stats as any || {}

    const installCount = stats.install_count || 0
    const newInstallCount = action === 'install' ? installCount + 1 : Math.max(0, installCount - 1)

    // 计算活跃用户数（当前安装数）
    const { count } = await this.supabase
      .from('mini_app_installations')
      .select('*', { count: 'exact', head: true })
      .eq('mini_app_id', mini_app_id)
      .eq('status', 'active')

    const { error } = await this.supabase
      .from('mini_apps')
      .update({
        stats: {
          ...stats,
          install_count: newInstallCount,
          active_users: count || 0,
        },
      })
      .eq('id', mini_app_id)

    if (error) {
      // 记录错误但不抛出，避免影响主流程
      console.error('Failed to update mini app stats:', error)
    }
  }
}

// 导出单例
export const miniAppInstallationService = new MiniAppInstallationService()
