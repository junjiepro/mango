/**
 * Conversations List Page
 * T054: Create conversations list page
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ConversationList } from '@/components/conversation/ConversationList'
import { AppHeader } from '@/components/layouts/AppHeader'
import type { Database } from '@/types/database.types'

type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * 对话列表页面
 */
export default function ConversationsPage() {
  const router = useRouter()
  const t = useTranslations('conversations')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    router.push(`/conversations/${conversation.id}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{t('pageTitle')}</h2>
              <p className="mt-2 text-muted-foreground">
                {t('pageDescription')}
              </p>
            </div>

            <ConversationList
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
