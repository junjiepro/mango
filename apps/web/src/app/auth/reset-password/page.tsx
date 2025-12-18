/**
 * Reset Password Request Page
 * 忘记密码 - 请求重置密码页面
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CenteredLayout } from '@/components/layouts/MainLayout'
import { toast } from 'sonner'
import { logger } from '@mango/shared/utils'

/**
 * 忘记密码页面 - 请求重置
 */
export default function ResetPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('请输入您的邮箱地址')
      return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('请输入有效的邮箱地址')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) {
        throw error
      }

      logger.info('Password reset email sent', { email })

      setIsEmailSent(true)

      toast.success('邮件已发送', {
        description: '请检查您的邮箱，点击链接重置密码',
      })
    } catch (error: any) {
      logger.error('Password reset request failed', error)

      toast.error('发送失败', {
        description: error.message || '请稍后重试',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <CenteredLayout maxWidth="sm">
        <div className="rounded-lg border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">检查您的邮箱</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              我们已向 <span className="font-medium text-foreground">{email}</span> 发送了密码重置链接
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="mb-2 font-medium">接下来的步骤：</p>
              <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                <li>打开您的邮箱</li>
                <li>查找来自 Mango 的邮件</li>
                <li>点击邮件中的重置密码链接</li>
                <li>设置您的新密码</li>
              </ol>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>没有收到邮件？</p>
              <button
                onClick={() => setIsEmailSent(false)}
                className="mt-1 font-medium text-primary hover:underline"
              >
                重新发送
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              返回登录
            </Link>
          </div>
        </div>
      </CenteredLayout>
    )
  }

  return (
    <CenteredLayout maxWidth="sm">
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            输入您的邮箱地址，我们将发送重置密码的链接
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              邮箱地址
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '发送中...' : '发送重置链接'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">记起密码了? </span>
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            返回登录
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
