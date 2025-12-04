/**
 * Update Password Page
 * 更新密码页面 - 通过邮件链接访问
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CenteredLayout } from '@/components/layouts/MainLayout'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@mango/shared/utils'

/**
 * 更新密码页面
 */
export default function UpdatePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // 检查是否有有效的重置密码会话
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (session) {
          setIsValidSession(true)
        } else {
          toast({
            title: '会话无效',
            description: '请重新请求密码重置链接',
            variant: 'destructive',
          })
          setTimeout(() => {
            router.push('/auth/reset-password')
          }, 2000)
        }
      } catch (error: any) {
        logger.error('Session check failed', error)
        toast({
          title: '验证失败',
          description: '请重新请求密码重置链接',
          variant: 'destructive',
        })
        setTimeout(() => {
          router.push('/auth/reset-password')
        }, 2000)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [supabase, router, toast])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证输入
    if (!password || !confirmPassword) {
      toast({
        title: '错误',
        description: '请填写所有字段',
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: '错误',
        description: '两次输入的密码不一致',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: '错误',
        description: '密码至少需要6个字符',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        throw error
      }

      logger.info('Password updated successfully')

      toast({
        title: '密码更新成功',
        description: '您现在可以使用新密码登录',
      })

      // 重定向到登录页
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error: any) {
      logger.error('Password update failed', error)

      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 显示加载状态
  if (isCheckingSession) {
    return (
      <CenteredLayout maxWidth="sm">
        <div className="rounded-lg border bg-card p-8 shadow-lg">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">验证中...</p>
          </div>
        </div>
      </CenteredLayout>
    )
  }

  // 如果会话无效，不显示表单
  if (!isValidSession) {
    return null
  }

  return (
    <CenteredLayout maxWidth="sm">
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">设置新密码</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            请输入您的新密码
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              新密码 <span className="text-destructive">*</span>
            </label>
            <Input
              id="password"
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认新密码 <span className="text-destructive">*</span>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">密码要求：</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>至少6个字符</li>
              <li>建议包含大小写字母、数字和特殊字符</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '更新中...' : '更新密码'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            返回登录
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
