/**
 * Notifications Hook
 * T096: Create notification subscription logic
 *
 * 处理浏览器通知订阅和管理
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: Array<{ action: string; title: string; icon?: string }>
  requireInteraction?: boolean
  silent?: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // 检查浏览器支持
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  // 注册 Service Worker
  useEffect(() => {
    if (!isSupported) return

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js')
        setRegistration(reg)
        console.log('Service Worker registered:', reg)

        // 检查更新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本可用
                console.log('New Service Worker available')
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [isSupported])

  // 请求通知权限
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications not supported')
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      throw error
    }
  }, [isSupported])

  // 显示通知
  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<void> => {
      if (!isSupported) {
        throw new Error('Notifications not supported')
      }

      // 如果没有权限，先请求
      if (permission === 'default') {
        const result = await requestPermission()
        if (result !== 'granted') {
          throw new Error('Notification permission denied')
        }
      }

      if (permission === 'denied') {
        throw new Error('Notification permission denied')
      }

      try {
        if (registration) {
          // 使用 Service Worker 显示通知
          await registration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/icon-192.png',
            badge: options.badge || '/badge-72.png',
            tag: options.tag,
            data: options.data,
            actions: options.actions,
            requireInteraction: options.requireInteraction,
            silent: options.silent,
          })
        } else {
          // 降级到普通通知
          new Notification(options.title, {
            body: options.body,
            icon: options.icon,
            tag: options.tag,
            data: options.data,
            silent: options.silent,
          })
        }
      } catch (error) {
        console.error('Failed to show notification:', error)
        throw error
      }
    },
    [isSupported, permission, registration, requestPermission]
  )

  // 订阅推送通知
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registration) {
      throw new Error('Service Worker not registered')
    }

    try {
      // 检查是否已订阅
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // 创建新订阅
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured')
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })

        // 发送订阅信息到服务器
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        })
      }

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }, [registration])

  // 取消订阅推送通知
  const unsubscribeFromPush = useCallback(async (): Promise<void> => {
    if (!registration) {
      throw new Error('Service Worker not registered')
    }

    try {
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // 通知服务器取消订阅
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      throw error
    }
  }, [registration])

  return {
    isSupported,
    permission,
    registration,
    requestPermission,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
  }
}

// 辅助函数：将 base64 字符串转换为 Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
