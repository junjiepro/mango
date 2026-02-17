/**
 * MiniApp Selector Component
 * T102: Integrate MiniApp invocation in MessageInput component
 *
 * 小应用选择器,用于在对话中调用小应用
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']

interface MiniAppSelectorProps {
  onSelect: (miniApp: MiniApp, installation: MiniAppInstallation) => void
  disabled?: boolean
}

/**
 * MiniAppSelector 组件
 * 显示已安装的小应用列表供用户选择,支持切换到应用商店
 */
export function MiniAppSelector({ onSelect, disabled = false }: MiniAppSelectorProps) {
  const t = useTranslations('conversations')
  const [open, setOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'installed' | 'discover'>('installed')
  const [installations, setInstallations] = useState<any[]>([])
  const [publicApps, setPublicApps] = useState<any[]>([])
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open) {
      loadInstallations()
      if (viewMode === 'discover') {
        loadPublicApps()
      }
    }
  }, [open, viewMode])

  const loadInstallations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/miniapps/installations')
      const result = await response.json()

      if (result.success) {
        setInstallations(result.data)
        const ids = new Set(result.data.map((inst: any) => inst.mini_app_id))
        setInstalledIds(ids)
      }
    } catch (error) {
      console.error('Failed to load installations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPublicApps = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'public',
        limit: '50',
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/miniapps?${params}`)
      const result = await response.json()

      if (result.success) {
        setPublicApps(result.data)
      }
    } catch (error) {
      console.error('Failed to load public apps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (installation: any) => {
    onSelect(installation.mini_app, installation)
    setOpen(false)
    setSearchQuery('')
  }

  const handleInstall = async (miniApp: any) => {
    try {
      const permissions = miniApp.manifest?.required_permissions || ['storage']
      const response = await fetch(`/api/miniapps/${miniApp.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: permissions }),
      })

      const result = await response.json()

      if (result.success) {
        // 重新加载已安装列表
        await loadInstallations()
        alert(t('miniAppSelector.installSuccess'))
      } else {
        alert(t('miniAppSelector.installFailed', { error: result.error }))
      }
    } catch (error) {
      console.error('Failed to install mini app:', error)
      alert(t('miniAppSelector.installError'))
    }
  }

  const filteredInstallations = installations.filter((inst) => {
    const miniApp = inst.mini_app
    if (!miniApp) return false

    const query = searchQuery.toLowerCase()
    return (
      miniApp.display_name.toLowerCase().includes(query) ||
      miniApp.description.toLowerCase().includes(query) ||
      (miniApp.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    )
  })

  const filteredPublicApps = publicApps.filter((app) => {
    const query = searchQuery.toLowerCase()
    return (
      app.display_name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      (app.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    )
  })

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="h-8 w-8 p-0"
        title={t('miniAppSelector.invokeMiniApp')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('miniAppSelector.selectMiniApp')}</DialogTitle>
            <DialogDescription>
              {viewMode === 'installed'
                ? t('miniAppSelector.installedDesc')
                : t('miniAppSelector.discoverDesc')}
            </DialogDescription>
          </DialogHeader>

          {/* 视图切换按钮 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'installed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('installed')}
              className="flex-1"
            >
              {t('miniAppSelector.installed')}
            </Button>
            <Button
              variant={viewMode === 'discover' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('discover')}
              className="flex-1"
            >
              {t('miniAppSelector.appStore')}
            </Button>
          </div>

          {/* 搜索框 */}
          <div className="mb-4">
            <Input
              type="search"
              placeholder={t('miniAppSelector.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (viewMode === 'discover') {
                  loadPublicApps()
                }
              }}
            />
          </div>

          {/* 小应用列表 */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border animate-pulse"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'installed' ? (
              // 已安装视图
              filteredInstallations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('miniAppSelector.noMatchInstalled') : t('miniAppSelector.noInstalledApps')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInstallations.map((installation) => {
                    const miniApp = installation.mini_app
                    if (!miniApp) return null

                    return (
                      <button
                        key={installation.id}
                        onClick={() => handleSelect(installation)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border',
                          'hover:bg-accent hover:border-primary transition-colors',
                          'text-left'
                        )}
                      >
                        {miniApp.icon_url ? (
                          <img
                            src={miniApp.icon_url}
                            alt={miniApp.display_name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {installation.custom_name || miniApp.display_name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {miniApp.description}
                          </p>
                        </div>

                        <svg
                          className="h-5 w-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              // 应用商店视图
              filteredPublicApps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('miniAppSelector.noMatchPublic') : t('miniAppSelector.noPublicApps')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPublicApps.map((miniApp) => {
                    const isInstalled = installedIds.has(miniApp.id)

                    return (
                      <div
                        key={miniApp.id}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border',
                          'text-left'
                        )}
                      >
                        {miniApp.icon_url ? (
                          <img
                            src={miniApp.icon_url}
                            alt={miniApp.display_name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {miniApp.display_name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {miniApp.description}
                          </p>
                        </div>

                        {isInstalled ? (
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                            {t('miniAppSelector.alreadyInstalled')}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInstall(miniApp)}
                          >
                            {t('miniAppSelector.install')}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>

          {/* 底部提示 */}
          {!loading && viewMode === 'installed' && installations.length === 0 && (
            <div className="text-center py-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {t('miniAppSelector.noAppsHint')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('discover')}
              >
                {t('miniAppSelector.browseStore')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
