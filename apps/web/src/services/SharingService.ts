/**
 * Sharing Service
 * T098: Create MiniApp sharing service
 *
 * 处理小应用的分享和导入
 */

import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorType } from '@mango/shared/utils'
import crypto from 'crypto'

interface ShareLink {
  id: string
  mini_app_id: string
  share_token: string
  created_by: string
  expires_at: string | null
  max_uses: number | null
  use_count: number
  created_at: string
}

/**
 * SharingService 类
 * 处理小应用的分享链接生成和管理
 */
export class SharingService {
  private supabase = createClient()

  /**
   * 生成分享链接
   */
  async createShareLink(
    mini_app_id: string,
    options?: {
      expires_in_days?: number
      max_uses?: number
    }
  ): Promise<ShareLink> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 验证小应用是否可分享
    const { data: miniApp, error: fetchError } = await this.supabase
      .from('mini_apps')
      .select('*')
      .eq('id', mini_app_id)
      .single()

    if (fetchError || !miniApp) {
      throw new AppError('Mini app not found', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    if (!miniApp.is_shareable) {
      throw new AppError('This mini app is not shareable', ErrorType.VALIDATION_FAILED, 400)
    }

    // 验证所有权（只有创建者可以分享）
    if (miniApp.creator_id !== user.id) {
      throw new AppError('Not authorized to share this mini app', ErrorType.AUTH_FORBIDDEN, 403)
    }

    // 生成唯一的分享 token
    const share_token = crypto.randomBytes(16).toString('hex')

    // 计算过期时间
    let expires_at = null
    if (options?.expires_in_days) {
      const expiresDate = new Date()
      expiresDate.setDate(expiresDate.getDate() + options.expires_in_days)
      expires_at = expiresDate.toISOString()
    }

    // 创建分享链接记录
    const { data: shareLink, error } = await this.supabase
      .from('mini_app_share_links')
      .insert({
        mini_app_id,
        share_token,
        created_by: user.id,
        expires_at,
        max_uses: options?.max_uses || null,
        use_count: 0,
      })
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to create share link: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return shareLink
  }

  /**
   * 通过分享 token 获取小应用信息
   */
  async getMiniAppByShareToken(share_token: string): Promise<{
    mini_app: any
    share_link: ShareLink
  }> {
    // 获取分享链接
    const { data: shareLink, error: linkError } = await this.supabase
      .from('mini_app_share_links')
      .select('*')
      .eq('share_token', share_token)
      .single()

    if (linkError || !shareLink) {
      throw new AppError('Invalid share link', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    // 检查是否过期
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new AppError('Share link has expired', ErrorType.VALIDATION_FAILED, 400)
    }

    // 检查使用次数
    if (shareLink.max_uses && shareLink.use_count >= shareLink.max_uses) {
      throw new AppError('Share link has reached maximum uses', ErrorType.VALIDATION_FAILED, 400)
    }

    // 获取小应用信息
    const { data: miniApp, error: appError } = await this.supabase
      .from('mini_apps')
      .select('*')
      .eq('id', shareLink.mini_app_id)
      .single()

    if (appError || !miniApp) {
      throw new AppError('Mini app not found', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    return { mini_app: miniApp, share_link: shareLink }
  }

  /**
   * 通过分享链接安装小应用
   */
  async installFromShareLink(
    share_token: string,
    granted_permissions: string[]
  ): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 获取小应用信息
    const { mini_app, share_link } = await this.getMiniAppByShareToken(share_token)

    // 检查是否已安装
    const { data: existing } = await this.supabase
      .from('mini_app_installations')
      .select('*')
      .eq('user_id', user.id)
      .eq('mini_app_id', mini_app.id)
      .eq('status', 'active')
      .single()

    if (existing) {
      throw new AppError('Mini app already installed', ErrorType.VALIDATION_FAILED, 400)
    }

    // 验证权限
    const manifest = mini_app.manifest || {}
    const requiredPermissions = manifest.required_permissions || []
    const missingPermissions = requiredPermissions.filter(
      (perm: string) => !granted_permissions.includes(perm)
    )

    if (missingPermissions.length > 0) {
      throw new AppError(
        `Missing required permissions: ${missingPermissions.join(', ')}`,
        ErrorType.VALIDATION_FAILED,
        400
      )
    }

    // 创建安装记录
    const { data: installation, error: installError } = await this.supabase
      .from('mini_app_installations')
      .insert({
        user_id: user.id,
        mini_app_id: mini_app.id,
        installed_version: manifest.version || '1.0.0',
        granted_permissions,
        status: 'active',
        stats: {
          invocation_count: 0,
          last_used_at: null,
          total_runtime_ms: 0,
        },
      })
      .select()
      .single()

    if (installError) {
      throw new AppError(
        `Failed to install mini app: ${installError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    // 增加分享链接使用次数
    await this.supabase
      .from('mini_app_share_links')
      .update({ use_count: share_link.use_count + 1 })
      .eq('id', share_link.id)

    // 更新小应用统计
    const stats = mini_app.stats || {}
    await this.supabase
      .from('mini_apps')
      .update({
        stats: {
          ...stats,
          install_count: (stats.install_count || 0) + 1,
        },
      })
      .eq('id', mini_app.id)

    return installation
  }

  /**
   * 获取用户创建的分享链接
   */
  async getUserShareLinks(mini_app_id?: string): Promise<ShareLink[]> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    let query = this.supabase
      .from('mini_app_share_links')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (mini_app_id) {
      query = query.eq('mini_app_id', mini_app_id)
    }

    const { data, error } = await query

    if (error) {
      throw new AppError(
        `Failed to get share links: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return data || []
  }

  /**
   * 删除分享链接
   */
  async deleteShareLink(share_link_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 验证所有权
    const { data: shareLink, error: fetchError } = await this.supabase
      .from('mini_app_share_links')
      .select('*')
      .eq('id', share_link_id)
      .single()

    if (fetchError || !shareLink) {
      throw new AppError('Share link not found', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    if (shareLink.created_by !== user.id) {
      throw new AppError('Not authorized to delete this share link', ErrorType.AUTH_FORBIDDEN, 403)
    }

    const { error } = await this.supabase
      .from('mini_app_share_links')
      .delete()
      .eq('id', share_link_id)

    if (error) {
      throw new AppError(
        `Failed to delete share link: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }
  }
}

// 导出单例
export const sharingService = new SharingService()
