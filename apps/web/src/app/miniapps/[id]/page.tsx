/**
 * MiniApp Detail Page
 * T093: Create MiniApp detail page
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MiniAppContainer } from '@/components/miniapp/MiniAppContainer'
import { TriggerConfigDialog } from '@/components/miniapp/TriggerConfigDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Settings } from 'lucide-react'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']

interface TriggerConfig {
  id?: string
  type: 'schedule' | 'event' | 'manual'
  enabled: boolean
  interval?: number
  cron?: string
  eventType?: string
  message?: string
  metadata?: Record<string, any>
}

export default function MiniAppDetailPage() {
  const params = useParams()
  const router = useRouter()
  const miniAppId = params.id as string

  const [miniApp, setMiniApp] = useState<MiniApp | null>(null)
  const [installation, setInstallation] = useState<MiniAppInstallation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | null>(null)
  const [showTriggerDialog, setShowTriggerDialog] = useState(false)

  useEffect(() => {
    loadMiniApp()
    loadInstallation()
    loadTriggerConfig()
  }, [miniAppId])

  const loadMiniApp = async () => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}`)
      const result = await response.json()

      if (result.success) {
        setMiniApp(result.data)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to load mini app:', error)
      setError('Failed to load mini app')
    } finally {
      setLoading(false)
    }
  }

  const loadInstallation = async () => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/install`)
      const result = await response.json()

      if (result.success && result.data) {
        setInstallation(result.data)
      }
    } catch (error) {
      console.error('Failed to load installation:', error)
    }
  }

  const loadTriggerConfig = async () => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/trigger`)
      const result = await response.json()

      if (result.success && result.data) {
        setTriggerConfig(result.data)
      }
    } catch (error) {
      console.error('Failed to load trigger config:', error)
    }
  }

  const saveTriggerConfig = async (config: TriggerConfig) => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const result = await response.json()

      if (result.success) {
        setTriggerConfig(config)
      } else {
        throw new Error(result.error || 'Failed to save trigger config')
      }
    } catch (error) {
      console.error('Failed to save trigger config:', error)
      throw error
    }
  }

  const handleMessage = async (message: any) => {
    console.log('Received message from mini app:', message)

    // 处理不同的消息类型
    switch (message.action) {
      case 'storage.get':
        return handleStorageGet(message.payload.key)
      case 'storage.set':
        return handleStorageSet(message.payload.key, message.payload.value)
      case 'storage.remove':
        return handleStorageRemove(message.payload.key)
      case 'notification.send':
        return handleNotificationSend(message.payload)
      case 'user.getInfo':
        return handleGetUserInfo()
      default:
        console.warn('Unknown message action:', message.action)
    }
  }

  const handleStorageGet = async (key: string) => {
    if (!installation) return null

    try {
      const response = await fetch(
        `/api/miniapp-data?installation_id=${installation.id}&key=${key}`
      )
      const result = await response.json()

      if (result.success && result.data) {
        return result.data.value
      }
      return null
    } catch (error) {
      console.error('Failed to get storage:', error)
      return null
    }
  }

  const handleStorageSet = async (key: string, value: any) => {
    if (!installation) return false

    try {
      const response = await fetch('/api/miniapp-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installation_id: installation.id,
          key,
          value,
        }),
      })
      const result = await response.json()

      return result.success
    } catch (error) {
      console.error('Failed to set storage:', error)
      return false
    }
  }

  const handleStorageRemove = async (key: string) => {
    if (!installation) return false

    try {
      const response = await fetch(
        `/api/miniapp-data?installation_id=${installation.id}&key=${key}`,
        { method: 'DELETE' }
      )
      const result = await response.json()

      return result.success
    } catch (error) {
      console.error('Failed to remove storage:', error)
      return false
    }
  }

  const handleNotificationSend = async (payload: any) => {
    // 检查权限
    if (!installation?.granted_permissions?.includes('system:notification')) {
      console.warn('Notification permission not granted')
      return false
    }

    // 发送浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        ...payload.options,
      })
      return true
    }

    return false
  }

  const handleGetUserInfo = async () => {
    // 检查权限
    if (!installation?.granted_permissions?.includes('user:read')) {
      console.warn('User read permission not granted')
      return null
    }

    try {
      const response = await fetch('/api/profile')
      const result = await response.json()

      if (result.success) {
        return {
          id: result.data.id,
          display_name: result.data.display_name,
          avatar_url: result.data.avatar_url,
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get user info:', error)
      return null
    }
  }

  const handleError = (error: Error) => {
    console.error('Mini app error:', error)
    setError(error.message)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    )
  }

  if (error || !miniApp) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground mt-2">{error || 'Mini app not found'}</p>
          <Button onClick={() => router.push('/miniapps')} className="mt-4">
            Back to Gallery
          </Button>
        </div>
      </div>
    )
  }

  if (!installation) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Mini App Not Installed</h2>
          <p className="text-muted-foreground mt-2">
            Please install this mini app from the gallery first
          </p>
          <Button onClick={() => router.push('/miniapps')} className="mt-4">
            Go to Gallery
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{miniApp.display_name}</h1>
          <p className="text-muted-foreground mt-1">{miniApp.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 触发器配置按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTriggerDialog(true)}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            {triggerConfig?.enabled ? '触发器已启用' : '配置触发器'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/miniapps')}>
            Back
          </Button>
        </div>
      </div>

      {/* 触发器状态提示 */}
      {triggerConfig?.enabled && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                触发器已启用
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {triggerConfig.type === 'schedule' && (
                  <>
                    {triggerConfig.interval
                      ? `每 ${triggerConfig.interval} 分钟触发一次`
                      : triggerConfig.cron
                      ? `按 Cron 表达式触发: ${triggerConfig.cron}`
                      : '定时触发'}
                  </>
                )}
                {triggerConfig.type === 'event' && (
                  <>事件触发: {triggerConfig.eventType || '未设置'}</>
                )}
                {triggerConfig.type === 'manual' && <>手动触发</>}
              </p>
              {triggerConfig.message && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  消息: {triggerConfig.message}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTriggerDialog(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 小应用容器 */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <MiniAppContainer
          miniApp={miniApp}
          installation={installation}
          className="h-[600px]"
          onMessage={handleMessage}
          onError={handleError}
        />
      </div>

      {/* 触发器配置对话框 */}
      {installation && (
        <TriggerConfigDialog
          open={showTriggerDialog}
          onOpenChange={setShowTriggerDialog}
          installation={installation}
          existingTrigger={triggerConfig || undefined}
          onSave={saveTriggerConfig}
        />
      )}
    </div>
  )
}
