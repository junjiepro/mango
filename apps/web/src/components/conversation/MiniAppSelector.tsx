/**
 * MiniApp Selector Component
 * T102: Integrate MiniApp invocation in MessageInput component
 *
 * 小应用选择器,用于在对话中调用小应用
 */

'use client'

import React, { useEffect, useState } from 'react'
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
 * 显示已安装的小应用列表供用户选择
 */
export function MiniAppSelector({ onSelect, disabled = false }: MiniAppSelectorProps) {
  const [open, setOpen] = useState(false)
  const [installations, setInstallations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open) {
      loadInstallations()
    }
  }, [open])

  const loadInstallations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/miniapps/installations')
      const result = await response.json()

      if (result.success) {
        setInstallations(result.data)
      }
    } catch (error) {
      console.error('Failed to load installations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (installation: any) => {
    onSelect(installation.mini_app, installation)
    setOpen(false)
    setSearchQuery('')
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

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="h-8 w-8 p-0"
        title="调用小应用"
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
            <DialogTitle>选择小应用</DialogTitle>
            <DialogDescription>
              选择一个已安装的小应用在对话中调用
            </DialogDescription>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="mb-4">
            <Input
              type="search"
              placeholder="搜索小应用..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            ) : filteredInstallations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '未找到匹配的小应用' : '暂无已安装的小应用'}
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
            )}
          </div>

          {/* 底部提示 */}
          {!loading && installations.length === 0 && (
            <div className="text-center py-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                还没有安装任何小应用
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  window.location.href = '/miniapps'
                }}
              >
                前往小应用商店
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
