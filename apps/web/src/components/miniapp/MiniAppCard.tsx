/**
 * MiniApp Card Component
 * T089: Create MiniAppCard component
 *
 * 展示小应用的卡片组件
 */

'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']

interface MiniAppCardProps {
  miniApp: MiniApp
  installed?: boolean
  className?: string
  onInstall?: (miniApp: MiniApp) => void
  onUninstall?: (miniApp: MiniApp) => void
  onOpen?: (miniApp: MiniApp) => void
  onShare?: (miniApp: MiniApp) => void
  onChatWithAgent?: (miniApp: MiniApp) => void
}

/**
 * MiniAppCard 组件
 * 展示小应用的基本信息和操作按钮
 */
export const MiniAppCard = React.memo(function MiniAppCard({
  miniApp,
  installed = false,
  className,
  onInstall,
  onUninstall,
  onOpen,
  onShare,
  onChatWithAgent,
}: MiniAppCardProps) {
  const t = useTranslations('miniapps')
  const stats = miniApp.stats as any || {}
  const manifest = miniApp.manifest as any || {}

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      {/* 图标和标题 */}
      <div className="flex items-start gap-4">
        {miniApp.icon_url ? (
          <img
            src={miniApp.icon_url}
            alt={miniApp.display_name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg
              className="h-6 w-6"
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
          <h3 className="font-semibold text-lg truncate">{miniApp.display_name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {miniApp.description}
          </p>
        </div>
      </div>

      {/* 标签 */}
      {miniApp.tags && miniApp.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {miniApp.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {miniApp.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              +{miniApp.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span>{stats.active_users || 0} {t('stats.users')}</span>
        </div>

        <div className="flex items-center gap-1">
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>{stats.install_count || 0} {t('stats.installs')}</span>
        </div>

        {stats.avg_rating > 0 && (
          <div className="flex items-center gap-1">
            <svg
              className="h-4 w-4 fill-yellow-400"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{stats.avg_rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-6">
        {installed ? (
          <>
            <Button
              onClick={() => onOpen?.(miniApp)}
              className="flex-1"
            >
              {t('actions.open')}
            </Button>
            <Button
              variant="outline"
              onClick={() => onUninstall?.(miniApp)}
            >
              {t('actions.uninstall')}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => onInstall?.(miniApp)}
            className="flex-1"
          >
            {t('actions.install')}
          </Button>
        )}

        {miniApp.is_shareable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare?.(miniApp)}
            title={t('actions.share')}
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </Button>
        )}

        {installed && onChatWithAgent && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChatWithAgent(miniApp)}
            title={t('actions.chatWithAgent')}
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </Button>
        )}
      </div>

      {/* 状态标识 */}
      {(miniApp.status === 'draft' || !installed) && (
        <div className="absolute top-4 right-4 flex gap-1.5">
          {miniApp.status === 'draft' && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {t('status.draft')}
            </span>
          )}
          {!installed && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t('notInstalled')}
            </span>
          )}
        </div>
      )}
    </div>
  )
});
