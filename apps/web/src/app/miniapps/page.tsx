/**
 * MiniApp Gallery Page
 * T092: Create MiniApp gallery page
 */

'use client'

import React, { useEffect, useState } from 'react'
import { MiniAppList } from '@/components/miniapp/MiniAppList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']

export default function MiniAppsPage() {
  const [miniApps, setMiniApps] = useState<MiniApp[]>([])
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'public' | 'user'>('public')

  // 加载小应用列表
  useEffect(() => {
    loadMiniApps()
    loadInstalledApps()
  }, [viewMode, searchQuery, selectedTags])

  const loadMiniApps = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: viewMode,
        limit: '50',
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','))
      }

      const response = await fetch(`/api/miniapps?${params}`)
      const result = await response.json()

      if (result.success) {
        setMiniApps(result.data)
      }
    } catch (error) {
      console.error('Failed to load mini apps:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInstalledApps = async () => {
    try {
      const response = await fetch('/api/miniapps/installations')
      const result = await response.json()

      if (result.success) {
        const ids = new Set(result.data.map((inst: any) => inst.mini_app_id))
        setInstalledIds(ids)
      }
    } catch (error) {
      console.error('Failed to load installed apps:', error)
    }
  }

  const handleInstall = async (miniApp: MiniApp, permissions: string[]) => {
    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: permissions }),
      })

      const result = await response.json()

      if (result.success) {
        setInstalledIds((prev) => new Set(prev).add(miniApp.id))
        alert('Mini app installed successfully!')
      } else {
        alert(`Failed to install: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to install mini app:', error)
      alert('Failed to install mini app')
    }
  }

  const handleUninstall = async (miniApp: MiniApp) => {
    if (!confirm(`Are you sure you want to uninstall ${miniApp.display_name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}/install`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setInstalledIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(miniApp.id)
          return newSet
        })
        alert('Mini app uninstalled successfully!')
      } else {
        alert(`Failed to uninstall: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to uninstall mini app:', error)
      alert('Failed to uninstall mini app')
    }
  }

  const handleOpen = (miniApp: MiniApp) => {
    window.location.href = `/miniapps/${miniApp.id}`
  }

  const handleShare = async (miniApp: MiniApp) => {
    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}/share`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        const shareUrl = `${window.location.origin}/miniapps/import/${result.data.shareToken}`
        await navigator.clipboard.writeText(shareUrl)
        alert('Share link copied to clipboard!')
      } else {
        alert(`Failed to generate share link: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to share mini app:', error)
      alert('Failed to share mini app')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mini Apps</h1>
        <p className="text-muted-foreground mt-2">
          Discover and install mini apps to enhance your experience
        </p>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search mini apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'public' ? 'default' : 'outline'}
            onClick={() => setViewMode('public')}
          >
            Discover
          </Button>
          <Button
            variant={viewMode === 'user' ? 'default' : 'outline'}
            onClick={() => setViewMode('user')}
          >
            My Apps
          </Button>
        </div>
      </div>

      {/* 小应用列表 */}
      <MiniAppList
        miniApps={miniApps}
        installedIds={installedIds}
        loading={loading}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onOpen={handleOpen}
        onShare={handleShare}
      />
    </div>
  )
}
