'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface SessionInfoProps {
  sessionId?: string
  userMode: 'simple' | 'advanced'
}

export function SessionInfo({ sessionId, userMode }: SessionInfoProps) {
  const t = useTranslations('aiAgent')

  if (!sessionId || userMode === 'simple') {
    return null
  }

  const handleViewDetails = () => {
    // Handle session details view
    console.log(`View details for session: ${sessionId}`)
  }

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription>
        {t('session.current')}: {sessionId.slice(0, 8)}...
        <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={handleViewDetails}>
          {t('session.viewDetails')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}