/**
 * Reset Password Request Page
 * 忘记密码 - 请求重置密码页面
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('auth.resetPassword')
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('enterEmail'))
      return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t('invalidEmail'))
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

      toast.success(t('emailSent'), {
        description: t('checkEmailForLink'),
      })
    } catch (error: any) {
      logger.error('Password reset request failed', error)

      toast.error(t('sendFailed'), {
        description: error.message || t('retryLater'),
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
            <h1 className="text-2xl font-bold">{t('checkYourEmail')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('sentResetLinkTo')} <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="mb-2 font-medium">{t('nextSteps')}</p>
              <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
                <li>{t('step4')}</li>
              </ol>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>{t('noEmailReceived')}</p>
              <button
                onClick={() => setIsEmailSent(false)}
                className="mt-1 font-medium text-primary hover:underline"
              >
                {t('resend')}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t('backToLogin')}
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
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('emailLabel')}
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
            {isLoading ? t('sending') : t('sendResetLink')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">{t('rememberPassword')} </span>
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
