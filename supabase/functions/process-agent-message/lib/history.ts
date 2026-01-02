/**
 * History Module
 * 对话历史管理
 */

import type { Message } from '../types.ts';
import { CONTEXT_WINDOW_SIZE } from '../config.ts';

/**
 * 获取对话历史
 */
export async function getConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = CONTEXT_WINDOW_SIZE
): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}

/**
 * 获取下一个序列号
 */
export async function getNextSequenceNumber(
  supabase: any,
  conversationId: string
): Promise<number> {
  const { data } = await supabase
    .from('messages')
    .select('sequence_number')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single();

  return (data?.sequence_number || 0) + 1;
}
