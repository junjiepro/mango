/**
 * LearningService - 学习规则服务
 */

import { createClient } from '@/lib/supabase/client';

export type RecordType = 'preference' | 'correction' | 'pattern' | 'skill';

export interface LearningRecord {
  id: string;
  user_id: string;
  record_type: RecordType;
  content: Record<string, unknown>;
  confidence: number;
  is_active: boolean;
  applied_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLearningInput {
  record_type: RecordType;
  content: Record<string, unknown>;
  confidence?: number;
}

class LearningService {
  private supabase = createClient();

  async createRecord(input: CreateLearningInput): Promise<LearningRecord> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('learning_records')
      .insert({
        user_id: user.id,
        confidence: 0.5,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveRecords(): Promise<LearningRecord[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('learning_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deactivateRecord(recordId: string): Promise<void> {
    const { error } = await this.supabase
      .from('learning_records')
      .update({ is_active: false })
      .eq('id', recordId);

    if (error) throw error;
  }

  async deleteRecord(recordId: string): Promise<void> {
    const { error } = await this.supabase
      .from('learning_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;
  }
}

export const learningService = new LearningService();
export default learningService;
