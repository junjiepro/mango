/**
 * Message Service
 * T043: Create Message service
 */

import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorType } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']

/**
 * MessageService 类
 * 处理消息的 CRUD 操作
 */
export class MessageService {
  private supabase = createClient()

  /**
   * 发送消息
   * 通过 API 路由发送，以触发 Agent 响应
   */
  async sendMessage(data: {
    conversationId: string
    content: string
    contentType?: string
    attachments?: any[]
    replyToMessageId?: string
  }): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 通过 API 路由发送消息，以触发 Agent 响应
    const response = await fetch(`/api/conversations/${data.conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: data.content,
        contentType: data.contentType,
        attachments: data.attachments,
        replyToMessageId: data.replyToMessageId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new AppError(
        `Failed to send message: ${errorData.error || response.statusText}`,
        ErrorType.NETWORK_ERROR,
        response.status
      )
    }

    const message = await response.json()
    return message
  }

  /**
   * 获取对话的消息列表
   */
  async getMessages(
    conversationId: string,
    options?: {
      limit?: number
      offset?: number
      beforeSequence?: number
      afterSequence?: number
    }
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    let query = this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true })

    // 支持分页和游标查询
    if (options?.beforeSequence) {
      query = query.lt('sequence_number', options.beforeSequence)
    }
    if (options?.afterSequence) {
      query = query.gt('sequence_number', options.afterSequence)
    }

    query = query.range(offset, offset + limit)

    const { data: messages, error } = await query

    if (error) {
      throw new AppError(
        `Failed to fetch messages: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return {
      messages: messages || [],
      hasMore: (messages?.length || 0) === limit + 1,
    }
  }

  /**
   * 获取单条消息
   */
  async getMessage(messageId: string): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: message, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError(
          'Message not found',
          ErrorType.RESOURCE_NOT_FOUND,
          404
        )
      }
      throw new AppError(
        `Failed to fetch message: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return message
  }

  /**
   * 更新消息
   */
  async updateMessage(
    messageId: string,
    updates: {
      content?: string
      status?: string
      edited_at?: string
    }
  ): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: message, error } = await this.supabase
      .from('messages')
      .update({
        ...updates,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update message: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return message
  }

  /**
   * 删除消息 (软删除)
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { error } = await this.supabase
      .from('messages')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)

    if (error) {
      throw new AppError(
        `Failed to delete message: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }
  }

  /**
   * 创建 Agent 响应消息
   */
  async createAgentMessage(data: {
    conversationId: string
    content: string
    agentMetadata?: Record<string, any>
    replyToMessageId?: string
  }): Promise<Message> {
    // 获取下一个序列号
    const { data: lastMessage } = await this.supabase
      .from('messages')
      .select('sequence_number')
      .eq('conversation_id', data.conversationId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single()

    const sequenceNumber = (lastMessage?.sequence_number || 0) + 1

    const messageData: MessageInsert = {
      conversation_id: data.conversationId,
      sender_type: 'agent',
      sender_id: null,
      content: data.content,
      content_type: 'text/markdown',
      agent_metadata: data.agentMetadata,
      reply_to_message_id: data.replyToMessageId,
      sequence_number: sequenceNumber,
      status: 'sent',
    }

    const { data: message, error } = await this.supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to create agent message: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return message
  }

  /**
   * 搜索消息
   */
  async searchMessages(
    conversationId: string,
    query: string
  ): Promise<Message[]> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'simple',
      })
      .order('sequence_number', { ascending: true })
      .limit(50)

    if (error) {
      throw new AppError(
        `Failed to search messages: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return messages || []
  }
}

/**
 * 导出单例实例
 */
export const messageService = new MessageService()
