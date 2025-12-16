/**
 * Service Worker for MiniApp Notifications
 * T095: Implement Service Worker for MiniApp notifications
 *
 * 处理推送通知和后台同步
 */

const CACHE_NAME = 'mango-miniapp-v1'
const NOTIFICATION_TAG = 'miniapp-notification'

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  return self.clients.claim()
})

// 处理推送通知
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    console.error('Failed to parse push data:', error)
    data = { title: 'New Notification', body: event.data?.text() || '' }
  }

  const title = data.title || 'Mango'
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || NOTIFICATION_TAG,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 检查是否已有打开的窗口
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }

      // 打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// 处理通知关闭
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)

  // 可以在这里记录用户关闭通知的行为
  const data = event.notification.data || {}
  if (data.trackClose) {
    // 发送关闭事件到服务器
    fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close',
        notification_id: data.id,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      console.error('Failed to track notification close:', error)
    })
  }
})

// 处理后台同步
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event)

  if (event.tag === 'sync-miniapp-data') {
    event.waitUntil(syncMiniAppData())
  }
})

// 同步小应用数据
async function syncMiniAppData() {
  try {
    // 获取待同步的数据
    const cache = await caches.open(CACHE_NAME)
    const pendingData = await cache.match('/miniapp-pending-data')

    if (pendingData) {
      const data = await pendingData.json()

      // 发送到服务器
      const response = await fetch('/api/miniapp-data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // 清除缓存
        await cache.delete('/miniapp-pending-data')
        console.log('MiniApp data synced successfully')
      } else {
        console.error('Failed to sync miniapp data:', response.statusText)
      }
    }
  } catch (error) {
    console.error('Error syncing miniapp data:', error)
  }
}

// 处理消息
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, options)
  }

  if (event.data && event.data.type === 'CACHE_MINIAPP_DATA') {
    const { data } = event.data
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(
        '/miniapp-pending-data',
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  }
})

// 处理 fetch 请求（可选：添加缓存策略）
self.addEventListener('fetch', (event) => {
  // 对于 API 请求，使用网络优先策略
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request)
      })
    )
    return
  }

  // 对于静态资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
