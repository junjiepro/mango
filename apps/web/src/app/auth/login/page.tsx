/**
 * Login Page
 * T073: Create login page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CenteredLayout } from '@/components/layouts/MainLayout';
import { toast } from 'sonner';
import { logger } from '@mango/shared/utils';

/**
 * 登录页面
 */
export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('fillEmailPassword'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      logger.info('User logged in', { userId: data.user?.id });

      toast.success(t('loginSuccess'), {
        description: t('welcomeBack'),
      });

      // 重定向到对话列表
      router.push('/conversations');
      router.refresh();
    } catch (error: any) {
      logger.error('Login failed', error);

      toast.error(t('loginFailed'), {
        description: error.message || t('checkCredentials'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CenteredLayout maxWidth="sm">
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')}
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
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')}
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('loggingIn') : t('loginButton')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">{t('noAccount')} </span>
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            {t('signupLink')}
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/auth/reset-password"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>
      </div>
    </CenteredLayout>
  );
}
