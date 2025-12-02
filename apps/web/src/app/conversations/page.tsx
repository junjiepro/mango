/**
 * Conversations List Page
 * T054: Create conversations list page
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationList } from '@/components/conversation/ConversationList'
import { MainLayout } from '@/components/layouts/MainLayout'
import type { Database } from '@/types/database.types'

type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * 对话列表页面
 */
export default function ConversationsPage() {
  const router = useRouter()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    router.push(`/conversations/${conversation.id}`)
  }

  return (
    <MainLayout
      header={
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Mango - 智能对话平台</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">欢迎回来</span>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">我的对话</h2>
          <p className="mt-2 text-muted-foreground">
            选择一个对话继续,或创建新的对话
          </p>
        </div>

        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversation?.id}
        />
      </div>
    </MainLayout>
  )
}
