/**
 * MiniApp List Component
 * T091: Create MiniAppList component
 *
 * 展示小应用列表
 */

'use client'

import React, { useState } from 'react'
import { MiniAppCard } from './MiniAppCard'
import { PermissionDialog } from './PermissionDialog'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']

interface MiniAppListProps {
  miniApps: MiniApp[]
  installedIds?: Set<string>
  loading?: boolean
  className?: string
  onInstall?: (miniApp: MiniApp, permissions: string[]) => Promise<void>
  onUninstall?: (miniApp: MiniApp) => Promise<void>
  onOpen?: (miniApp: MiniApp) => void
  onShare?: (miniApp: MiniApp) => void
  onChatWithAgent?: (miniApp: MiniApp) => void
}

/**
 * MiniAppList 组件
 * 展示小应用列表并处理安装/卸载操作
 */
export function MiniAppList({
  miniApps,
  installedIds = new Set(),
  loading = false,
  className,
  onInstall,
  onUninstall,
  onOpen,
  onShare,
  onChatWithAgent,
}: MiniAppListProps) {
  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean
    miniApp: MiniApp | null
  }>({
    open: false,
    miniApp: null,
  })

  const handleInstallClick = (miniApp: MiniApp) => {
    const manifest = miniApp.manifest as any || {}
    const requiredPermissions = manifest.required_permissions || []

    if (requiredPermissions.length > 0) {
      // 显示权限对话框
      setPermissionDialog({
        open: true,
        miniApp,
      })
    } else {
      // 直接安装
      onInstall?.(miniApp, [])
    }
  }

  const handlePermissionApprove = async (grantedPermissions: string[]) => {
    if (permissionDialog.miniApp) {
      await onInstall?.(permissionDialog.miniApp, grantedPermissions)
      setPermissionDialog({ open: false, miniApp: null })
    }
  }

  const handlePermissionDeny = () => {
    setPermissionDialog({ open: false, miniApp: null })
  }

  if (loading) {
    return (
      <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-6 shadow-sm animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="h-6 bg-muted rounded-full w-16" />
              <div className="h-6 bg-muted rounded-full w-16" />
            </div>
            <div className="flex gap-2 mt-6">
              <div className="h-9 bg-muted rounded flex-1" />
              <div className="h-9 bg-muted rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (miniApps.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
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
        <h3 className="mt-4 text-lg font-semibold">No mini apps found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {miniApps.map((miniApp) => (
          <MiniAppCard
            key={miniApp.id}
            miniApp={miniApp}
            installed={installedIds.has(miniApp.id)}
            onInstall={handleInstallClick}
            onUninstall={onUninstall}
            onOpen={onOpen}
            onShare={onShare}
            onChatWithAgent={onChatWithAgent}
          />
        ))}
      </div>

      {/* 权限对话框 */}
      {permissionDialog.miniApp && (
        <PermissionDialog
          open={permissionDialog.open}
          onOpenChange={(open) =>
            setPermissionDialog({ open, miniApp: open ? permissionDialog.miniApp : null })
          }
          miniAppName={permissionDialog.miniApp.display_name}
          requiredPermissions={
            (permissionDialog.miniApp.manifest as any)?.required_permissions || []
          }
          onApprove={handlePermissionApprove}
          onDeny={handlePermissionDeny}
        />
      )}
    </>
  )
}
