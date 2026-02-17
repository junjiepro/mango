/**
 * Signup Page
 * T072: Create signup page
 */

'use client'

import React, { useState } from 'react'
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
 * 注册页面
 */
export default function SignupPage() {
  const t = useTranslations('auth.signup')
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

      toast.success(t('signupSuccess'), {
        description: t('checkEmailToVerify'),
      })

      // 重定向到登录页
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error: any) {
      logger.error('Signup failed', error)

      toast.error(t('signupFailed'), {
        description: error.message || t('retryLater'),
      })
    } finally {
      setIsLoading(false)
    }
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

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')} <span className="text-destructive">*</span>
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
              {t('displayName')}
            </label>
            <Input
              id="displayName"
              type="text"
              placeholder={t('displayNamePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t('displayNameHint')}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmPassword')} <span className="text-destructive">*</span>
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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('signingUp') : t('signupButton')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">{t('hasAccount')} </span>
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            {t('loginLink')}
          </Link>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          {t('agreeToTermsPrefix')}
          <Link href="/terms" className="underline hover:text-foreground">
            {t('termsOfService')}
          </Link>
          {t('and')}
          <Link href="/privacy" className="underline hover:text-foreground">
            {t('privacyPolicy')}
          </Link>
        </div>
      </div>
    </CenteredLayout>
  )
}
