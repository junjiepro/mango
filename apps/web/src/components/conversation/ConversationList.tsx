/**
 * ConversationList Component
 * T047: Create ConversationList component
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { conversationService } from '@/services/ConversationService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'
import { DeviceCache } from '@/lib/deviceCache'

type Conversation = Database['public']['Tables']['conversations']['Row']

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void
  selectedConversationId?: string
  className?: string
}

/**
 * ConversationList 组件
 * 显示用户的对话列表
 */
export function ConversationList({
  onSelectConversation,
  selectedConversationId,
  className = '',
}: ConversationListProps) {
  const t = useTranslations('conversations')
  const tc = useTranslations('common')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { conversations: loadedConversations } = await conversationService.getConversations({
        limit: 50,
        status: 'active',
      })
      setConversations(loadedConversations)
    } catch (err) {
      logger.error('Failed to load conversations', err as Error)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateConversation = async () => {
    try {
      // 从缓存获取默认设备ID
      const defaultDeviceId = DeviceCache.getDefaultDeviceId()

      const newConversation = await conversationService.createConversation({
        title: t('newConversation'),
        device_id: defaultDeviceId || undefined,
      })
      setConversations((prev) => [newConversation, ...prev])
      onSelectConversation?.(newConversation)
    } catch (err) {
      logger.error('Failed to create conversation', err as Error)
      setError(err as Error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return tc('time.justNow')
    if (diffMins < 60) return tc('time.minutesAgo', { count: diffMins })
    if (diffHours < 24) return tc('time.hoursAgo', { count: diffHours })
    if (diffDays < 7) return tc('time.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-destructive/50 bg-destructive/10 p-4 ${className}`}>
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConversations}
          className="mt-2"
        >
          {tc('actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 创建新对话按钮 */}
      <Button
        onClick={handleCreateConversation}
        className="w-full"
        variant="outline"
      >
        {t('newConversationButton')}
      </Button>

      {/* 对话列表 */}
      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('emptyState')}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation?.(conversation)}
              className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                selectedConversationId === conversation.id
                  ? 'border-primary bg-accent'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate font-medium text-sm">
                    {conversation.title}
                  </h3>
                  {conversation.description && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {conversation.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(conversation.updated_at || conversation.created_at)}
                </span>
              </div>

              {/* 统计信息 */}
              {conversation.stats && (
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>{t('messageCount', { count: conversation.stats.message_count || 0 })}</span>
                  <span>{t('taskCount', { count: conversation.stats.task_count || 0 })}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
