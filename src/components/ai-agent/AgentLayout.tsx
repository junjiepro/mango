/**
 * AI Agent 主布局组件
 * 提供简单和高级用户模式的切换界面
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Icons (using simple SVGs for now)
const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const SimpleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const AdvancedIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2M7 7l2-2m0 0l2 2m-2-2l-2 2m2-2V3m0 18l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
)

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const PluginIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

/**
 * 用户模式类型
 */
export type UserMode = 'simple' | 'advanced'

/**
 * 侧边栏项目接口
 */
interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType
  path: string
  badge?: string
  visible: {
    simple: boolean
    advanced: boolean
  }
}

/**
 * Agent 布局属性
 */
interface AgentLayoutProps {
  children: React.ReactNode
  defaultMode?: UserMode
  className?: string
}

/**
 * AI Agent 布局组件
 */
export default function AgentLayout({
  children,
  defaultMode = 'simple',
  className
}: AgentLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('aiAgent')

  // 状态管理
  const [currentMode, setCurrentMode] = useState<UserMode>(defaultMode)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // 侧边栏项目配置
  const sidebarItems: SidebarItem[] = [
    {
      id: 'chat',
      label: t('sidebar.chat'),
      icon: ChatIcon,
      path: '/ai-agent',
      visible: { simple: true, advanced: true }
    },
    {
      id: 'history',
      label: t('sidebar.history'),
      icon: HistoryIcon,
      path: '/ai-agent/history',
      visible: { simple: true, advanced: true }
    },
    {
      id: 'plugins',
      label: t('sidebar.plugins'),
      icon: PluginIcon,
      path: '/ai-agent/plugins',
      badge: 'Beta',
      visible: { simple: false, advanced: true }
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: SettingsIcon,
      path: '/ai-agent/settings',
      visible: { simple: false, advanced: true }
    }
  ]

  // 初始化用户模式偏好
  useEffect(() => {
    if (!user || isInitialized) return

    try {
      // 从 localStorage 读取用户偏好
      const savedMode = localStorage.getItem(`agent-mode-${user.id}`) as UserMode
      if (savedMode && (savedMode === 'simple' || savedMode === 'advanced')) {
        setCurrentMode(savedMode)
      }
    } catch (error) {
      console.warn('Failed to load user mode preference:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [user, isInitialized])

  // 保存用户模式偏好
  const handleModeChange = useCallback((newMode: UserMode) => {
    setCurrentMode(newMode)

    if (user) {
      try {
        localStorage.setItem(`agent-mode-${user.id}`, newMode)
      } catch (error) {
        console.warn('Failed to save user mode preference:', error)
      }
    }
  }, [user])

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  // 导航到指定路径
  const navigateTo = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // 检查当前路径是否激活
  const isPathActive = useCallback((path: string) => {
    if (path === '/ai-agent') {
      return pathname === path || pathname === '/ai-agent/'
    }
    return pathname.startsWith(path)
  }, [pathname])

  // 获取当前可见的侧边栏项目
  const visibleSidebarItems = sidebarItems.filter(item =>
    item.visible[currentMode]
  )

  // 如果用户未认证，重定向到登录页
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // 加载状态
  if (loading || !user || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      <Navbar />

      <div className="flex">
        {/* 侧边栏 */}
        <aside
          className={cn(
            "bg-white shadow-sm border-r border-gray-200 transition-all duration-200",
            sidebarOpen ? "w-64" : "w-16"
          )}
        >
          {/* 侧边栏头部 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('title')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('subtitle')}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>

          {/* 模式切换器 */}
          {sidebarOpen && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={currentMode === 'simple' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeChange('simple')}
                  className="flex-1 text-xs"
                >
                  <SimpleIcon />
                  {t('modes.simple')}
                </Button>
                <Button
                  variant={currentMode === 'advanced' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeChange('advanced')}
                  className="flex-1 text-xs"
                >
                  <AdvancedIcon />
                  {t('modes.advanced')}
                </Button>
              </div>
              {currentMode === 'advanced' && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('modes.advancedDescription')}
                </p>
              )}
            </div>
          )}

          {/* 导航菜单 */}
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              {visibleSidebarItems.map((item) => {
                const isActive = isPathActive(item.path)
                const ItemIcon = item.icon

                return (
                  <li key={item.id}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        "w-full justify-start",
                        !sidebarOpen && "justify-center",
                        isActive && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      )}
                      onClick={() => navigateTo(item.path)}
                    >
                      <ItemIcon />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* 侧边栏底部信息 */}
          {sidebarOpen && currentMode === 'advanced' && (
            <div className="p-4 border-t border-gray-200">
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-blue-900">
                      {t('status.connected')}
                    </p>
                    <p className="text-xs text-blue-700">
                      {t('status.plugins')} • {t('status.tools')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* 主内容 */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * 页面头部组件
 */
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("bg-white border-b border-gray-200 px-6 py-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 快速操作栏组件
 */
interface QuickActionsProps {
  mode: UserMode
  onModeChange: (mode: UserMode) => void
  className?: string
}

export function QuickActions({ mode, onModeChange, className }: QuickActionsProps) {
  const t = useTranslations('aiAgent')

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-gray-500">{t('quickActions.mode')}:</span>
      <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
        <Button
          variant={mode === 'simple' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('simple')}
          className="text-xs"
        >
          {t('modes.simple')}
        </Button>
        <Button
          variant={mode === 'advanced' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('advanced')}
          className="text-xs"
        >
          {t('modes.advanced')}
        </Button>
      </div>
    </div>
  )
}