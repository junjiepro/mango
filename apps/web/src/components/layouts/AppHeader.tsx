/**
 * App Header Component
 * 统一的应用导航栏组件
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { User } from '@supabase/supabase-js';
import { Bot, UserIcon, Laptop } from 'lucide-react';

interface AppHeaderProps {
  className?: string;
}

/**
 * AppHeader 组件
 * 提供统一的导航栏，包含 Logo、导航链接和用户菜单
 */
export function AppHeader({ className = '' }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo 和品牌 */}
        <div className="flex items-center gap-6">
          <Link href={user ? '/conversations' : '/'} className="flex items-center gap-2">
            <span className="text-xl font-bold">Mango</span>
          </Link>

          {/* 导航链接 (仅登录用户可见) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/conversations">
                <Button variant={isActive('/conversations') ? 'secondary' : 'ghost'} size="sm">
                  <Bot className="h-4 w-4" />
                  对话
                </Button>
              </Link>
              <Link href="/miniapps">
                <Button
                  variant={isActive('/miniapps') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  小应用
                </Button>
              </Link>
              <Link href="/settings/devices">
                <Button variant={isActive('/settings/devices') ? 'secondary' : 'ghost'} size="sm">
                  <Laptop className="h-4 w-4" />
                  设备管理
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant={isActive('/profile') ? 'secondary' : 'ghost'} size="sm">
                  <UserIcon className="h-4 w-4" />
                  个人信息
                </Button>
              </Link>
            </nav>
          )}
        </div>

        {/* 用户操作区 */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                登出
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
