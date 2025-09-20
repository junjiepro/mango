'use server'

import { createClient } from '@/lib/supabase/server'
import { updatePasswordSchema } from '@/lib/validations/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

type UpdatePasswordActionResult = {
  error?: string
  success?: boolean
  message?: string
}

export async function updatePasswordAction(
  formData: FormData
): Promise<UpdatePasswordActionResult> {
  console.log('[Profile] Starting password update process')

  try {
    // 从FormData中提取数据
    const data = {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    }

    console.log('[Profile] Processing password update request')

    // 验证输入数据格式
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      console.warn('[Profile] Missing required password fields')
      return { error: '请填写所有密码字段' }
    }

    // 使用Zod验证数据
    const validatedData = updatePasswordSchema.parse(data)
    console.log('[Profile] Password update validation passed')

    // 创建Supabase服务器客户端
    const supabase = await createClient()

    // 首先检查用户是否已认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Profile] User not authenticated:', authError?.message)
      return { error: '用户未认证，请重新登录' }
    }

    console.log('[Profile] User authenticated:', user.id)

    // 验证当前密码
    // 注意：Supabase没有直接验证当前密码的API，我们需要通过重新登录来验证
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: validatedData.currentPassword
    })

    if (signInError) {
      console.error('[Profile] Current password verification failed:', signInError.message)

      let errorMessage = '当前密码验证失败'
      switch (signInError.message) {
        case 'Invalid login credentials':
        case 'Invalid email or password':
          errorMessage = '当前密码不正确，请重新输入'
          break
        case 'Too many requests':
          errorMessage = '密码验证尝试过于频繁，请稍后再试'
          break
        case 'Account temporarily locked':
          errorMessage = '账户已临时锁定，请稍后再试'
          break
        default:
          if (signInError.message.includes('rate limit')) {
            errorMessage = '密码验证请求过于频繁，请稍后再试'
          }
          break
      }

      return { error: errorMessage }
    }

    console.log('[Profile] Current password verified successfully')

    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: validatedData.newPassword
    })

    if (updateError) {
      console.error('[Profile] Password update error:', updateError.message)

      let errorMessage = updateError.message
      switch (updateError.message) {
        case 'New password should be different from the old password':
          errorMessage = '新密码不能与当前密码相同'
          break
        case 'Password should be at least 6 characters':
          errorMessage = '密码至少需要6个字符'
          break
        case 'User not found':
          errorMessage = '用户不存在，请重新登录'
          break
        case 'Auth session missing!':
          errorMessage = '会话已过期，请重新登录'
          break
        default:
          if (errorMessage.includes('password')) {
            errorMessage = '密码格式要求不符合'
          } else if (errorMessage.includes('session')) {
            errorMessage = '会话已过期，请重新登录'
          }
          break
      }

      return { error: errorMessage }
    }

    console.log('[Profile] Password updated successfully for user:', user.id)

    // 记录密码更新活动
    await recordPasswordUpdateActivity(user.id)

    // 重新验证页面缓存
    revalidatePath('/dashboard/profile')

    return {
      success: true,
      message: '密码已成功更新'
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      console.warn('[Profile] Validation error:', firstError?.message)
      return { error: firstError?.message || '输入数据格式不正确' }
    }

    // 记录未知错误
    console.error('[Profile] Unexpected password update error:', error)

    return { error: '密码更新过程中发生未知错误，请稍后重试' }
  }
}

// 更新用户资料信息的action
export async function updateProfileAction(
  formData: FormData
): Promise<UpdatePasswordActionResult> {
  console.log('[Profile] Starting profile update process')

  try {
    // 创建Supabase服务器客户端
    const supabase = await createClient()

    // 检查用户是否已认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Profile] User not authenticated:', authError?.message)
      return { error: '用户未认证，请重新登录' }
    }

    // 提取表单数据
    const displayName = formData.get('displayName') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string

    console.log('[Profile] Updating profile for user:', user.id)

    // 更新用户元数据
    const updateData: any = {}

    if (displayName) updateData.display_name = displayName.trim()
    if (firstName) updateData.first_name = firstName.trim()
    if (lastName) updateData.last_name = lastName.trim()

    if (Object.keys(updateData).length === 0) {
      return { error: '没有需要更新的信息' }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: updateData
    })

    if (updateError) {
      console.error('[Profile] Profile update error:', updateError.message)
      return { error: '更新资料失败，请稍后重试' }
    }

    console.log('[Profile] Profile updated successfully for user:', user.id)

    // 重新验证页面缓存
    revalidatePath('/dashboard/profile')

    return {
      success: true,
      message: '资料已成功更新'
    }

  } catch (error) {
    console.error('[Profile] Unexpected profile update error:', error)
    return { error: '更新资料过程中发生未知错误，请稍后重试' }
  }
}

// 获取当前用户资料的函数
export async function getCurrentUserProfile() {
  console.log('[Profile] Fetching current user profile')

  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('[Profile] Error fetching user:', error?.message)
      return { user: null, error: '获取用户信息失败' }
    }

    console.log('[Profile] User profile fetched successfully:', user.id)

    return { user, error: null }

  } catch (error) {
    console.error('[Profile] Failed to fetch user profile:', error)
    return { user: null, error: '获取用户信息过程中发生错误' }
  }
}

// 记录密码更新活动的函数
async function recordPasswordUpdateActivity(userId: string) {
  console.log('[Profile] Recording password update activity for user:', userId)

  try {
    // 这里可以实现活动记录逻辑
    // 例如：记录到审计日志、发送通知邮件等

    const activityData = {
      user_id: userId,
      activity: 'password_update',
      timestamp: new Date().toISOString(),
      ip_address: await getClientIpAddress(),
      user_agent: await getUserAgent()
    }

    console.log('[Profile] Password update activity recorded:', activityData)

    // 实际的记录逻辑将在后续实现
    // await saveSecurityActivity(activityData)

    // 可以考虑发送密码更新通知邮件
    // await sendPasswordUpdateNotification(userId)

  } catch (error) {
    console.error('[Profile] Failed to record password update activity:', error)
  }
}

// 获取客户端IP地址的辅助函数
async function getClientIpAddress(): Promise<string | null> {
  try {
    // 在Next.js App Router中获取IP地址
    const { headers } = await import('next/headers')
    const headersList = await headers()

    return headersList.get('x-forwarded-for') ||
           headersList.get('x-real-ip') ||
           headersList.get('remote-addr') ||
           null
  } catch (error) {
    console.warn('[Profile] Failed to get client IP address:', error)
    return null
  }
}

// 获取用户代理的辅助函数
async function getUserAgent(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()

    return headersList.get('user-agent') || null
  } catch (error) {
    console.warn('[Profile] Failed to get user agent:', error)
    return null
  }
}

// 创建一个辅助文件来存放非server action的工具函数