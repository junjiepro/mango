/**
 * User Profile Page
 * T076: Create user profile page
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { userService } from '@/services/UserService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppHeader } from '@/components/layouts/AppHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

/**
 * 用户配置页面
 */
export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<{
    conversationCount: number
    messageCount: number
    taskCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 表单状态
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const userProfile = await userService.getCurrentUserProfile()
      if (userProfile) {
        setProfile(userProfile)
        setDisplayName(userProfile.display_name || '')
        setBio(userProfile.bio || '')
      }
    } catch (error) {
      logger.error('Failed to load profile', error as Error)
      toast({
        title: '加载失败',
        description: '无法加载用户配置',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const userStats = await userService.getUserStats()
      setStats(userStats)
    } catch (error) {
      logger.error('Failed to load stats', error as Error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await userService.updateUserProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })

      toast({
        title: '保存成功',
        description: '您的配置已更新',
      })

      loadProfile()
    } catch (error) {
      logger.error('Failed to save profile', error as Error)
      toast({
        title: '保存失败',
        description: '无法保存配置,请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      logger.error('Logout failed', error as Error)
      toast({
        title: '登出失败',
        description: '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* 统计信息 */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-2xl font-bold">{stats.conversationCount}</div>
                  <div className="text-sm text-muted-foreground">对话</div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-2xl font-bold">{stats.messageCount}</div>
                  <div className="text-sm text-muted-foreground">消息</div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <div className="text-2xl font-bold">{stats.taskCount}</div>
                  <div className="text-sm text-muted-foreground">任务</div>
                </div>
              </div>
            )}

            {/* 配置表单 */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">个人信息</h2>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="displayName" className="text-sm font-medium">
                    显示名称
                  </label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="您的名字"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-medium">
                    个人简介
                  </label>
                  <textarea
                    id="bio"
                    placeholder="介绍一下自己..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存更改'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadProfile}
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </div>

            {/* 账号操作 */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">账号操作</h2>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full"
                >
                  登出
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
