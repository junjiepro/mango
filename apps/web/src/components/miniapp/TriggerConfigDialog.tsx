/**
 * MiniApp Trigger Configuration Dialog
 * T097: Add MiniApp trigger configuration UI in MiniApp settings
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { Database } from '@/types/database.types'

type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']

interface TriggerConfig {
  id?: string
  type: 'schedule' | 'event' | 'manual'
  enabled: boolean
  // Schedule trigger
  interval?: number // 分钟
  cron?: string
  // Event trigger
  eventType?: string
  // Common
  message?: string
  metadata?: Record<string, any>
}

interface TriggerConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installation: MiniAppInstallation
  existingTrigger?: TriggerConfig
  onSave: (trigger: TriggerConfig) => Promise<void>
}

export function TriggerConfigDialog({
  open,
  onOpenChange,
  installation,
  existingTrigger,
  onSave,
}: TriggerConfigDialogProps) {
  const [trigger, setTrigger] = useState<TriggerConfig>({
    type: 'schedule',
    enabled: true,
    interval: 60,
    message: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化触发器配置
  useEffect(() => {
    if (existingTrigger) {
      setTrigger(existingTrigger)
    } else {
      setTrigger({
        type: 'schedule',
        enabled: true,
        interval: 60,
        message: '',
      })
    }
  }, [existingTrigger, open])

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    try {
      // 验证配置
      if (trigger.type === 'schedule') {
        if (!trigger.interval && !trigger.cron) {
          throw new Error('请设置触发间隔或 Cron 表达式')
        }
        if (trigger.interval && trigger.interval < 1) {
          throw new Error('触发间隔必须大于 0 分钟')
        }
      }

      if (trigger.type === 'event' && !trigger.eventType) {
        throw new Error('请选择事件类型')
      }

      await onSave(trigger)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save trigger:', err)
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value, 10)
    if (!isNaN(interval)) {
      setTrigger({ ...trigger, interval, cron: undefined })
    }
  }

  const handleCronPresetChange = (value: string) => {
    setTrigger({ ...trigger, cron: value, interval: undefined })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>配置触发器</DialogTitle>
          <DialogDescription>
            设置小应用的自动触发规则,支持定时触发和事件触发
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 启用开关 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用触发器</Label>
            <Switch
              id="enabled"
              checked={trigger.enabled}
              onCheckedChange={(checked) =>
                setTrigger({ ...trigger, enabled: checked })
              }
            />
          </div>

          {/* 触发器类型 */}
          <div className="space-y-2">
            <Label htmlFor="type">触发器类型</Label>
            <Select
              value={trigger.type}
              onValueChange={(value: 'schedule' | 'event' | 'manual') =>
                setTrigger({ ...trigger, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="选择触发器类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">定时触发</SelectItem>
                <SelectItem value="event">事件触发</SelectItem>
                <SelectItem value="manual">手动触发</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 定时触发配置 */}
          {trigger.type === 'schedule' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="interval">触发间隔 (分钟)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={trigger.interval || ''}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  placeholder="例如: 60 (每小时)"
                  disabled={!!trigger.cron}
                />
                <p className="text-xs text-muted-foreground">
                  设置触发间隔,单位为分钟。例如 60 表示每小时触发一次
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cron">或使用 Cron 表达式</Label>
                <Select
                  value={trigger.cron || 'custom'}
                  onValueChange={handleCronPresetChange}
                  disabled={!!trigger.interval}
                >
                  <SelectTrigger id="cron">
                    <SelectValue placeholder="选择预设时间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">自定义间隔</SelectItem>
                    <SelectItem value="0 * * * *">每小时</SelectItem>
                    <SelectItem value="0 0 * * *">每天 00:00</SelectItem>
                    <SelectItem value="0 9 * * *">每天 09:00</SelectItem>
                    <SelectItem value="0 12 * * *">每天 12:00</SelectItem>
                    <SelectItem value="0 18 * * *">每天 18:00</SelectItem>
                    <SelectItem value="0 0 * * 1">每周一 00:00</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  使用 Cron 表达式可以设置更精确的触发时间
                </p>
              </div>
            </>
          )}

          {/* 事件触发配置 */}
          {trigger.type === 'event' && (
            <div className="space-y-2">
              <Label htmlFor="eventType">事件类型</Label>
              <Select
                value={trigger.eventType || ''}
                onValueChange={(value) =>
                  setTrigger({ ...trigger, eventType: value })
                }
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="选择事件类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message.received">收到新消息</SelectItem>
                  <SelectItem value="task.completed">任务完成</SelectItem>
                  <SelectItem value="conversation.created">创建新对话</SelectItem>
                  <SelectItem value="user.login">用户登录</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                当指定事件发生时,自动触发小应用
              </p>
            </div>
          )}

          {/* 触发消息 */}
          <div className="space-y-2">
            <Label htmlFor="message">触发消息</Label>
            <Textarea
              id="message"
              value={trigger.message || ''}
              onChange={(e) =>
                setTrigger({ ...trigger, message: e.target.value })
              }
              placeholder="触发时显示的消息内容"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              触发时会通过通知显示此消息
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
