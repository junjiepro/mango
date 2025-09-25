'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from './LanguageSwitcher';
import {
  Bot,
  MessageSquare,
  Settings,
  User,
  LogOut,
  Sparkles,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentNavigation() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('navigation');

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      router.push('/login');
    } else {
      console.error('Logout error:', error);
    }
  };

  // Don't show navbar on auth pages - check for locale-aware paths
  const authPaths = ['/login', '/register', '/forgot-password'];
  const shouldHideNavbar = authPaths.some(path =>
    pathname === path || pathname.endsWith(path)
  );

  if (shouldHideNavbar) {
    return null;
  }

  // Check if current path is AI Agent related
  const isAgentPath = pathname.includes('/agent') || pathname.includes('/chat');
  const isDashboard = pathname.includes('/dashboard');

  if (loading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Mango AI</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <div className="animate-pulse h-8 w-24 bg-muted rounded-md"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Mango AI</span>
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          </button>

          {/* Main Navigation - Only show for authenticated users */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              <Button
                variant={isAgentPath ? 'default' : 'ghost'}
                size="sm"
                onClick={() => router.push('/agent')}
                className="flex items-center space-x-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t('aiAgent', 'AI Assistant')}</span>
              </Button>
              <Button
                variant={isDashboard ? 'default' : 'ghost'}
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>{t('dashboard')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chat')}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{t('chat', 'Chat')}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                    <AvatarFallback>
                      {user.email?.slice(0, 2).toUpperCase() || 'ME'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('userRole', 'AI User')}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />

                {/* Mobile Navigation Items */}
                <div className="md:hidden">
                  <DropdownMenuItem
                    onClick={() => router.push('/agent')}
                    className={cn(
                      "flex items-center space-x-2",
                      isAgentPath && "bg-accent"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t('aiAgent', 'AI Assistant')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard')}
                    className={cn(
                      "flex items-center space-x-2",
                      isDashboard && "bg-accent"
                    )}
                  >
                    <Activity className="h-4 w-4" />
                    <span>{t('dashboard')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/chat')}
                    className="flex items-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{t('chat', 'Chat')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>{t('profile', 'Profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/settings')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>{t('settings', 'Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
              >
                {t('login')}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
                className="flex items-center space-x-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t('getStarted', 'Get Started')}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}