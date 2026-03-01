/**
 * Message Module
 * 消息创建和更新逻辑
 */

import type { Message } from '../types.ts';

/**
 * 创建 Agent 消息占位符
 */
export async function createAgentMessage(
  supabase: any,
  conversationId: string,
  messageId: string,
  sequenceNumber: number
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      content: '思考中...',
      content_type: 'text/markdown',
      sequence_number: sequenceNumber,
      status: 'sending',
      reply_to_message_id: messageId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to create agent message');
  }

  return data;
}

/**
 * 更新消息内容
 */
export async function updateMessageContent(
  supabase: any,
  messageId: string,
  content: string,
  status: string = 'sent',
  metadata?: any
): Promise<void> {
  const updateData: any = { content, status };
  if (metadata) {
    updateData.metadata = metadata;
  }

  await supabase
    .from('messages')
    .update(updateData)
    .eq('id', messageId);
}
