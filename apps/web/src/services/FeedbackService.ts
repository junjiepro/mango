/**
 * FeedbackService - 用户反馈服务
 */

import { createClient } from '@/lib/supabase/client';

export type FeedbackType = 'satisfaction' | 'accuracy' | 'usefulness' | 'safety';
export type FeedbackRating = 'positive' | 'negative' | 'neutral';

export interface FeedbackRecord {
  id: string;
  user_id: string;
  conversation_id?: string;
  message_id?: string;
  task_id?: string;
  feedback_type: FeedbackType;
  rating: FeedbackRating;
  comment?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export interface CreateFeedbackInput {
  conversation_id?: string;
  message_id?: string;
  task_id?: string;
  feedback_type: FeedbackType;
  rating: FeedbackRating;
  comment?: string;
  context?: Record<string, unknown>;
}

class FeedbackService {
  private supabase = createClient();

  async createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('feedback_records')
      .insert({
        user_id: user.id,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFeedbackByConversation(conversationId: string): Promise<FeedbackRecord[]> {
    const { data, error } = await this.supabase
      .from('feedback_records')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserFeedback(limit = 50): Promise<FeedbackRecord[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('feedback_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async deleteFeedback(feedbackId: string): Promise<void> {
    const { error } = await this.supabase
      .from('feedback_records')
      .delete()
      .eq('id', feedbackId);

    if (error) throw error;
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
