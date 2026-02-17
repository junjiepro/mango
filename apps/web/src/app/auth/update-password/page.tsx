/**
 * Update Password Page
 * 更新密码页面 - 通过邮件链接访问
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CenteredLayout } from '@/components/layouts/MainLayout'
import { toast } from 'sonner'
import { logger } from '@mango/shared/utils'

/**
 * 更新密码页面
 */
export default function UpdatePasswordPage() {
  const t = useTranslations('auth.updatePassword')
  const router = useRouter()
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
          toast.error(t('sessionInvalid'), {
            description: t('requestNewLink'),
          })
          setTimeout(() => {
            router.push('/auth/reset-password')
          }, 2000)
        }
      } catch (error: any) {
        logger.error('Session check failed', error)
        toast.error(t('verifyFailed'), {
          description: t('requestNewLink'),
        })
        setTimeout(() => {
          router.push('/auth/reset-password')
        }, 2000)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [supabase, router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证输入
    if (!password || !confirmPassword) {
      toast.error(t('fillAllFields'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    if (password.length < 6) {
      toast.error(t('passwordTooShort'))
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

      toast.success(t('updateSuccess'), {
        description: t('canLoginWithNewPassword'),
      })

      // 重定向到登录页
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error: any) {
      logger.error('Password update failed', error)

      toast.error(t('updateFailed'), {
        description: error.message || t('retryLater'),
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
            <p className="text-sm text-muted-foreground">{t('verifying')}</p>
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
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('newPassword')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmNewPassword')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t('confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">{t('passwordRequirements')}</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>{t('minChars')}</li>
              <li>{t('recommendedChars')}</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('updating') : t('updateButton')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
