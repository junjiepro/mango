/**
 * MiniApp Trigger Configuration Dialog
 * T097: Add MiniApp trigger configuration UI in MiniApp settings
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('miniapps');
  const tc = useTranslations('common');
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
          throw new Error(t('trigger.intervalOrCronRequired'))
        }
        if (trigger.interval && trigger.interval < 1) {
          throw new Error(t('trigger.intervalMinError'))
        }
      }

      if (trigger.type === 'event' && !trigger.eventType) {
        throw new Error(t('trigger.eventTypeRequired'))
      }

      await onSave(trigger)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save trigger:', err)
      setError(err instanceof Error ? err.message : t('trigger.saveFailed'))
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
          <DialogTitle>{t('trigger.configTitle')}</DialogTitle>
          <DialogDescription>
            {t('trigger.configDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 启用开关 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">{t('trigger.enableTrigger')}</Label>
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
            <Label htmlFor="type">{t('trigger.triggerType')}</Label>
            <Select
              value={trigger.type}
              onValueChange={(value: 'schedule' | 'event' | 'manual') =>
                setTrigger({ ...trigger, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder={t('trigger.selectTriggerType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">{t('trigger.schedule')}</SelectItem>
                <SelectItem value="event">{t('trigger.event')}</SelectItem>
                <SelectItem value="manual">{t('trigger.manual')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 定时触发配置 */}
          {trigger.type === 'schedule' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="interval">{t('trigger.intervalMinutes')}</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={trigger.interval || ''}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  placeholder={t('trigger.intervalPlaceholder')}
                  disabled={!!trigger.cron}
                />
                <p className="text-xs text-muted-foreground">
                  {t('trigger.intervalHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cron">{t('trigger.orUseCron')}</Label>
                <Select
                  value={trigger.cron || 'custom'}
                  onValueChange={handleCronPresetChange}
                  disabled={!!trigger.interval}
                >
                  <SelectTrigger id="cron">
                    <SelectValue placeholder={t('trigger.selectPresetTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{t('trigger.customInterval')}</SelectItem>
                    <SelectItem value="0 * * * *">{t('trigger.everyHour')}</SelectItem>
                    <SelectItem value="0 0 * * *">{t('trigger.dailyMidnight')}</SelectItem>
                    <SelectItem value="0 9 * * *">{t('trigger.daily9am')}</SelectItem>
                    <SelectItem value="0 12 * * *">{t('trigger.dailyNoon')}</SelectItem>
                    <SelectItem value="0 18 * * *">{t('trigger.daily6pm')}</SelectItem>
                    <SelectItem value="0 0 * * 1">{t('trigger.weeklyMonday')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('trigger.cronHint')}
                </p>
              </div>
            </>
          )}

          {/* 事件触发配置 */}
          {trigger.type === 'event' && (
            <div className="space-y-2">
              <Label htmlFor="eventType">{t('trigger.eventType')}</Label>
              <Select
                value={trigger.eventType || ''}
                onValueChange={(value) =>
                  setTrigger({ ...trigger, eventType: value })
                }
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder={t('trigger.selectEventType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message.received">{t('trigger.eventMessageReceived')}</SelectItem>
                  <SelectItem value="task.completed">{t('trigger.eventTaskCompleted')}</SelectItem>
                  <SelectItem value="conversation.created">{t('trigger.eventConversationCreated')}</SelectItem>
                  <SelectItem value="user.login">{t('trigger.eventUserLogin')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('trigger.eventHint')}
              </p>
            </div>
          )}

          {/* 触发消息 */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('trigger.triggerMessage')}</Label>
            <Textarea
              id="message"
              value={trigger.message || ''}
              onChange={(e) =>
                setTrigger({ ...trigger, message: e.target.value })
              }
              placeholder={t('trigger.messagePlaceholder')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t('trigger.messageHint')}
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
            {tc('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc('actions.saving') : tc('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
