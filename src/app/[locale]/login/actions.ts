'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validations/auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { cookies } from 'next/headers'

type LoginActionResult = {
  error?: string
  success?: boolean
  data?: {
    user?: any
    session?: any
    redirectTo?: string
  }
}

export async function loginAction(
  formData: FormData
): Promise<LoginActionResult> {
  console.log('[Login] Starting user login process')

  try {
    // 从FormData中提取数据
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    console.log('[Login] Processing login for email:', data.email)

    // 验证输入数据格式
    if (!data.email || !data.password) {
      console.warn('[Login] Missing required fields')
      return { error: '请填写邮箱和密码' }
    }

    // 使用Zod验证数据
    const validatedData = loginSchema.parse(data)
    console.log('[Login] Input validation passed')

    // 创建Supabase服务器客户端
    const supabase = await createClient()

    // 尝试登录用户
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password
    })

    if (error) {
      console.error('[Login] Supabase auth error:', error.message)

      // 处理常见的登录错误
      let errorMessage = error.message
      switch (error.message) {
        case 'Invalid login credentials':
        case 'Invalid email or password':
          errorMessage = '邮箱或密码错误，请检查后重试'
          break
        case 'Email not confirmed':
          errorMessage = '请先验证您的邮箱地址，然后再登录'
          break
        case 'Too many requests':
          errorMessage = '登录尝试过于频繁，请稍后再试'
          break
        case 'Account temporarily locked':
          errorMessage = '账户已临时锁定，请稍后再试或联系客服'
          break
        case 'User not found':
          errorMessage = '用户不存在，请检查邮箱地址或先注册'
          break
        case 'Signup is disabled':
          errorMessage = '登录功能暂时关闭，请稍后再试'
          break
        default:
          if (errorMessage.includes('rate limit')) {
            errorMessage = '登录请求过于频繁，请稍后再试'
          } else if (errorMessage.includes('network')) {
            errorMessage = '网络连接错误，请检查网络后重试'
          }
          break
      }

      return { error: errorMessage }
    }

    if (!authData?.user) {
      console.error('[Login] No user data returned from Supabase')
      return { error: '登录失败，请稍后重试' }
    }

    console.log('[Login] User login successful:', {
      userId: authData.user.id,
      email: authData.user.email,
      emailConfirmed: authData.user.email_confirmed_at,
      lastSignIn: authData.user.last_sign_in_at
    })

    // 检查邮箱是否已验证
    if (!authData.user.email_confirmed_at) {
      console.warn('[Login] User email not confirmed:', authData.user.id)

      // 用户邮箱未验证，需要先验证
      await supabase.auth.signOut()
      return {
        error: '请先验证您的邮箱地址。如果没有收到验证邮件，请重新注册。'
      }
    }

    // 记录登录成功的用户活动
    console.log('[Login] Recording successful login activity')

    // 可以在这里添加用户活动记录逻辑
    // 例如：记录登录时间、IP地址、设备信息等

    return {
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
        redirectTo: '/dashboard'
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      console.warn('[Login] Validation error:', firstError?.message)
      return { error: firstError?.message || '输入数据格式不正确' }
    }

    // 记录未知错误
    console.error('[Login] Unexpected error:', error)

    return { error: '登录过程中发生未知错误，请稍后重试或联系客服' }
  }
}

// 简化的登录action，直接处理成功情况的重定向
export async function loginAndRedirect(
  formData: FormData,
  rememberMe?: boolean
): Promise<never> {
  const result = await loginAction(formData)

  if (result.error) {
    console.log('[Login] Redirecting to login page with error')
    // 重定向到登录页面并显示错误
    redirect(`/login?error=${encodeURIComponent(result.error)}`)
  }

  if (result.success && result.data?.redirectTo) {
    console.log('[Login] Redirecting to dashboard after successful login')

    // 如果选择了记住我，设置更长的cookie过期时间
    if (rememberMe) {
      try {
        const cookieStore = await cookies()
        // 这里可以设置记住我的相关cookie
        console.log('[Login] Remember me option selected')
      } catch (error) {
        console.warn('[Login] Failed to set remember me cookie:', error)
      }
    }

    // 成功后重定向到控制台
    redirect(result.data.redirectTo)
  }

  // 应该不会到达这里，但作为后备
  redirect('/login?error=登录过程中发生未知错误')
}

// 检查用户登录状态的函数
export async function checkAuthStatus() {
  console.log('[Login] Checking authentication status')

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('[Login] Error checking auth status:', error.message)
      return { authenticated: false, user: null }
    }

    if (!user) {
      console.log('[Login] No authenticated user found')
      return { authenticated: false, user: null }
    }

    console.log('[Login] Authenticated user found:', user.id)
    return { authenticated: true, user }

  } catch (error) {
    console.error('[Login] Failed to check auth status:', error)
    return { authenticated: false, user: null }
  }
}

// 记录用户活动的函数
export async function recordUserActivity(
  userId: string,
  activity: string,
  details?: Record<string, any>
) {
  console.log(`[Login] Recording user activity: ${activity} for user:`, userId)

  try {
    // 这里可以实现用户活动记录逻辑
    // 例如：保存到数据库、发送到分析服务等

    const activityData = {
      user_id: userId,
      activity,
      details,
      timestamp: new Date().toISOString(),
      // 可以添加更多元数据：IP地址、用户代理等
    }

    console.log('[Login] Activity recorded:', activityData)

    // 实际的记录逻辑将在后续实现
    // await saveUserActivity(activityData)

  } catch (error) {
    console.error('[Login] Failed to record user activity:', error)
  }
}