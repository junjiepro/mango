/**
 * useRealtimeMessages Hook
 * 订阅数据库消息变化（INSERT, UPDATE, DELETE）
 */

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@mango/shared/utils'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']

interface UseRealtimeMessagesOptions {
  conversationId: string | null
  onInsert?: (message: Message) => void
  onUpdate?: (message: Message) => void
  onDelete?: (messageId: string) => void
}

/**
 * useRealtimeMessages Hook
 * 订阅特定对话的数据库消息变化
 */
export function useRealtimeMessages({
  conversationId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeMessagesOptions) {
  const supabase = createClient()

  // 处理消息插入
  const handleInsert = useCallback(
    (payload: any) => {
      const newMessage = payload.new as Message
      logger.debug('Message inserted', { messageId: newMessage.id })
      onInsert?.(newMessage)
    },
    [onInsert]
  )

  // 处理消息更新
  const handleUpdate = useCallback(
    (payload: any) => {
      const updatedMessage = payload.new as Message
      logger.debug('Message updated', { messageId: updatedMessage.id })
      onUpdate?.(updatedMessage)
    },
    [onUpdate]
  )

  // 处理消息删除
  const handleDelete = useCallback(
    (payload: any) => {
      const deletedMessage = payload.old as Message
      logger.debug('Message deleted', { messageId: deletedMessage.id })
      onDelete?.(deletedMessage.id)
    },
    [onDelete]
  )

  useEffect(() => {
    if (!conversationId) {
      return
    }

    // 创建 Realtime Channel 订阅消息表变化
    const channel: RealtimeChannel = supabase
      .channel(`messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleDelete
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to messages realtime', { conversationId })
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Failed to subscribe to messages realtime', { conversationId })
        }
      })

    // 清理函数
    return () => {
      supabase.removeChannel(channel)
      logger.info('Unsubscribed from messages realtime', { conversationId })
    }
  }, [conversationId, supabase, handleInsert, handleUpdate, handleDelete])
}
