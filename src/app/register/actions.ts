'use server'

import { createClient } from '@/lib/supabase/server'
import { registerSchema } from '@/lib/validations/auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type RegisterActionResult = {
  error?: string
  success?: boolean
  data?: {
    user?: any
    session?: any
    requiresEmailConfirmation?: boolean
  }
}

export async function registerAction(
  formData: FormData
): Promise<RegisterActionResult> {
  console.log('[Registration] Starting user registration process')

  try {
    // 从FormData中提取数据
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    }

    console.log('[Registration] Processing registration for email:', data.email)

    // 验证输入数据格式
    if (!data.email || !data.password || !data.confirmPassword) {
      console.warn('[Registration] Missing required fields')
      return { error: '请填写所有必需字段' }
    }

    // 使用Zod验证数据
    const validatedData = registerSchema.parse(data)
    console.log('[Registration] Input validation passed')

    // 创建Supabase服务器客户端
    const supabase = await createClient()

    // 尝试注册用户
    const { data: authData, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          // 可以添加额外的用户元数据
          created_via: 'registration_form',
          created_at: new Date().toISOString()
        }
      }
    })

    if (error) {
      console.error('[Registration] Supabase auth error:', error.message)

      // 处理常见的Supabase错误
      let errorMessage = error.message
      switch (error.message) {
        case 'User already registered':
          errorMessage = '该邮箱已被注册，请使用其他邮箱或尝试登录'
          break
        case 'Invalid email':
          errorMessage = '邮箱格式无效'
          break
        case 'Password should be at least 6 characters':
          errorMessage = '密码至少需要6个字符'
          break
        case 'Signup is disabled':
          errorMessage = '注册功能暂时关闭，请稍后再试'
          break
        default:
          if (errorMessage.includes('rate limit')) {
            errorMessage = '注册请求过于频繁，请稍后再试'
          }
          break
      }

      return { error: errorMessage }
    }

    console.log('[Registration] User registration successful:', {
      userId: authData?.user?.id,
      email: authData?.user?.email,
      emailConfirmed: authData?.user?.email_confirmed_at
    })

    // 检查是否需要邮箱验证
    if (authData?.user && !authData.user.email_confirmed_at) {
      console.log('[Registration] Email confirmation required for user:', authData.user.id)
      return {
        success: true,
        data: {
          user: authData.user,
          requiresEmailConfirmation: true
        }
      }
    }

    return {
      success: true,
      data: {
        user: authData?.user,
        session: authData?.session
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      console.warn('[Registration] Validation error:', firstError?.message)
      return { error: firstError?.message || '输入数据格式不正确' }
    }

    // 记录未知错误
    console.error('[Registration] Unexpected error:', error)

    return { error: '注册过程中发生未知错误，请稍后重试或联系客服' }
  }
}

// 简化的注册action，直接处理成功情况的重定向
export async function registerAndRedirect(
  formData: FormData
): Promise<never> {
  const result = await registerAction(formData)

  if (result.error) {
    console.log('[Registration] Redirecting to register page with error')
    // 重定向到注册页面并显示错误
    redirect(`/register?error=${encodeURIComponent(result.error)}`)
  }

  if (result.success) {
    console.log('[Registration] Redirecting to login page after successful registration')
    // 成功后重定向到登录页面
    redirect('/login?message=注册成功！请检查您的邮箱以验证账户，然后返回登录')
  }

  // 应该不会到达这里，但作为后备
  redirect('/register?error=注册过程中发生未知错误')
}

// 处理邮箱验证确认的函数
export async function confirmEmail(token: string) {
  console.log('[Registration] Processing email confirmation')

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) {
      console.error('[Registration] Email confirmation error:', error.message)
      return { error: error.message }
    }

    console.log('[Registration] Email confirmation successful for user:', data?.user?.id)
    return { success: true, data }

  } catch (error) {
    console.error('[Registration] Email confirmation unexpected error:', error)
    return { error: '邮箱验证过程中发生错误' }
  }
}