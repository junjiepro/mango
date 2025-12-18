/**
 * Signup Page
 * T072: Create signup page
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CenteredLayout } from '@/components/layouts/MainLayout'
import { toast } from 'sonner'
import { logger } from '@mango/shared/utils'

/**
 * 注册页面
 */
export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证输入
    if (!email || !password || !confirmPassword) {
      toast.error('请填写所有必填字段')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      toast.error('密码至少需要6个字符')
      return
    }

    setIsLoading(true)

    try {
      // 注册用户
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })

      if (error) {
        throw error
      }

      logger.info('User signed up', { userId: data.user?.id })

      toast.success('注册成功', {
        description: '请检查您的邮箱以验证账号',
      })

      // 重定向到登录页
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error: any) {
      logger.error('Signup failed', error)

      toast.error('注册失败', {
        description: error.message || '请稍后重试',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CenteredLayout maxWidth="sm">
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">注册 Mango</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            创建您的账号开始使用
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              邮箱 <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              显示名称
            </label>
            <Input
              id="displayName"
              type="text"
              placeholder="您的名字"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              可选,默认使用邮箱前缀
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码 <span className="text-destructive">*</span>
            </label>
            <Input
              id="password"
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认密码 <span className="text-destructive">*</span>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注册'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">已有账号? </span>
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            立即登录
          </Link>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          注册即表示您同意我们的
          <Link href="/terms" className="underline hover:text-foreground">
            服务条款
          </Link>
          和
          <Link href="/privacy" className="underline hover:text-foreground">
            隐私政策
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
