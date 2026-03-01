/**
 * Realtime Subscription Hook
 * T045: Create Realtime subscription hook
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logger } from '@mango/shared/utils'

/**
 * 订阅配置
 */
interface SubscriptionConfig<T = any> {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  schema?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** 防抖延迟(ms)，批量处理高频事件。0 表示不防抖 */
  debounceMs?: number
}

/**
 * 订阅状态
 */
type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * useRealtimeSubscription Hook
 * 管理 Supabase Realtime 订阅的生命周期
 */
export function useRealtimeSubscription<T = any>(
  channelName: string,
  config: SubscriptionConfig<T>,
  enabled: boolean = true
) {
  const supabase = createClient()
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPayloadsRef = useRef<RealtimePostgresChangesPayload<T>[]>([])

  // 用 ref 保存最新回调，避免 effect 因回调变化而重新订阅
  const callbacksRef = useRef(config)
  useEffect(() => {
    callbacksRef.current = config
  })

  const flushPayloads = useCallback(() => {
    const payloads = pendingPayloadsRef.current
    pendingPayloadsRef.current = []
    for (const payload of payloads) {
      if (payload.eventType === 'INSERT' && callbacksRef.current.onInsert) {
        callbacksRef.current.onInsert(payload)
      } else if (payload.eventType === 'UPDATE' && callbacksRef.current.onUpdate) {
        callbacksRef.current.onUpdate(payload)
      } else if (payload.eventType === 'DELETE' && callbacksRef.current.onDelete) {
        callbacksRef.current.onDelete(payload)
      }
      if (callbacksRef.current.onChange) {
        callbacksRef.current.onChange(payload)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      // 如果禁用,清理现有订阅
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setStatus('disconnected')
      }
      return
    }

    const debounceMs = config.debounceMs ?? 0

    // 创建频道
    setStatus('connecting')
    const channel = supabase.channel(channelName)

    // 配置 Postgres 变更监听
    const event = config.event || '*'
    const schema = config.schema || 'public'

    channel.on(
      'postgres_changes',
      {
        event,
        schema,
        table: config.table,
        ...(config.filter && { filter: config.filter }),
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        logger.debug('Realtime event received', {
          channel: channelName,
          event: payload.eventType,
          table: config.table,
        })

        if (debounceMs <= 0) {
          // 无防抖，通过 ref 调用最新回调
          if (payload.eventType === 'INSERT' && callbacksRef.current.onInsert) {
            callbacksRef.current.onInsert(payload)
          } else if (payload.eventType === 'UPDATE' && callbacksRef.current.onUpdate) {
            callbacksRef.current.onUpdate(payload)
          } else if (payload.eventType === 'DELETE' && callbacksRef.current.onDelete) {
            callbacksRef.current.onDelete(payload)
          }
          if (callbacksRef.current.onChange) {
            callbacksRef.current.onChange(payload)
          }
        } else {
          // 防抖：缓冲事件，延迟批量处理
          pendingPayloadsRef.current.push(payload)
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = setTimeout(flushPayloads, debounceMs)
        }
      }
    )

    // 订阅频道
    channel
      .subscribe((status) => {
        logger.debug('Realtime subscription status', {
          channel: channelName,
          status,
        })

        if (status === 'SUBSCRIBED') {
          setStatus('connected')
          setError(null)
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('error')
          setError(new Error('Channel subscription error'))
        } else if (status === 'TIMED_OUT') {
          setStatus('error')
          setError(new Error('Channel subscription timed out'))
        } else if (status === 'CLOSED') {
          setStatus('disconnected')
        }
      })

    channelRef.current = channel

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      pendingPayloadsRef.current = []
      if (channelRef.current) {
        logger.debug('Cleaning up realtime subscription', {
          channel: channelName,
        })
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelName, config.table, config.filter, config.debounceMs, enabled, supabase, flushPayloads])

  return {
    status,
    error,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error',
  }
}

/**
 * useRealtimePresence Hook
 * 管理用户在线状态
 */
export function useRealtimePresence(
  channelName: string,
  userId: string,
  metadata?: Record<string, any>,
  enabled: boolean = true
) {
  const supabase = createClient()
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const channel = supabase.channel(channelName)

    // 监听 presence 变化
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPresenceState(state)

        // 提取在线用户 ID
        const users = Object.keys(state)
        setOnlineUsers(users)

        logger.debug('Presence synced', {
          channel: channelName,
          onlineUsers: users.length,
        })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('User joined', {
          channel: channelName,
          userId: key,
          presences: newPresences,
        })
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('User left', {
          channel: channelName,
          userId: key,
          presences: leftPresences,
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 追踪当前用户的在线状态
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...metadata,
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelName, userId, enabled])

  return {
    presenceState,
    onlineUsers,
    isOnline: onlineUsers.includes(userId),
  }
}
