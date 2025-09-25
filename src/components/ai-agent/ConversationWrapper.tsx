'use client'

import { useState, useCallback } from 'react'
import ConversationInterface from './ConversationInterface'

interface ConversationWrapperProps {
  mode: 'simple' | 'advanced'
  sessionId?: string
  className?: string
}

export function ConversationWrapper({ mode, sessionId, className }: ConversationWrapperProps) {
  const [currentSessionId, setCurrentSessionId] = useState(sessionId)

  const handleSessionChange = useCallback((newSessionId: string | undefined) => {
    setCurrentSessionId(newSessionId)

    // Update URL with new session
    const url = new URL(window.location.href)
    if (newSessionId) {
      url.searchParams.set('session', newSessionId)
    } else {
      url.searchParams.delete('session')
    }
    window.history.pushState(null, '', url.toString())
  }, [])

  return (
    <ConversationInterface
      mode={mode}
      sessionId={currentSessionId}
      onSessionChange={handleSessionChange}
      className={className}
    />
  )
}