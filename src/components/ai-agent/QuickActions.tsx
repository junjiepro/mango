'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MessageSquare,
  Brain,
  Settings,
  History,
  Zap,
  Sparkles
} from 'lucide-react'

interface QuickActionsProps {
  userMode: 'simple' | 'advanced'
}

export function QuickActions({ userMode }: QuickActionsProps) {
  const t = useTranslations('aiAgent')

  const simpleActions = [
    { key: 'help', icon: MessageSquare, label: t('quickActions.askQuestion') },
    { key: 'analyze', icon: Brain, label: t('quickActions.analyzeContent') },
    { key: 'create', icon: Sparkles, label: t('quickActions.createContent') }
  ]

  const advancedActions = [
    ...simpleActions,
    { key: 'tools', icon: Zap, label: t('quickActions.manageMCP') },
    { key: 'sessions', icon: History, label: t('quickActions.viewSessions') },
    { key: 'settings', icon: Settings, label: t('quickActions.configure') }
  ]

  const actions = userMode === 'simple' ? simpleActions : advancedActions

  const handleQuickAction = (actionKey: string) => {
    // Handle quick action
    console.log(`Quick action: ${actionKey}`)
    // You can implement specific actions here
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{t('quickActions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleQuickAction(action.key)}
            >
              <action.icon className="h-4 w-4 mr-2" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}