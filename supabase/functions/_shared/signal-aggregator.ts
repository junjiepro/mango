/**
 * Signal Aggregator
 * T178: 信号聚合逻辑 (feedback, behavior, implicit signals)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Signal {
  type: 'feedback' | 'behavior' | 'implicit';
  source: string;
  value: number;
  timestamp: string;
  context?: Record<string, unknown>;
}

interface AggregatedSignal {
  category: string;
  signals: Signal[];
  score: number;
  confidence: number;
}

export class SignalAggregator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async collectSignals(userId: string): Promise<Signal[]> {
    const signals: Signal[] = [];

    // 收集反馈信号
    const feedbackSignals = await this.collectFeedbackSignals(userId);
    signals.push(...feedbackSignals);

    // 收集行为信号
    const behaviorSignals = await this.collectBehaviorSignals(userId);
    signals.push(...behaviorSignals);

    // 收集隐式信号
    const implicitSignals = await this.collectImplicitSignals(userId);
    signals.push(...implicitSignals);

    return signals;
  }

  private async collectFeedbackSignals(userId: string): Promise<Signal[]> {
    const { data } = await this.supabase
      .from('feedback_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    return (data || []).map((f) => ({
      type: 'feedback' as const,
      source: f.category || 'general',
      value: f.rating === 'positive' ? 1 : -1,
      timestamp: f.created_at,
      context: { comment: f.comment },
    }));
  }

  private async collectBehaviorSignals(userId: string): Promise<Signal[]> {
    const { data } = await this.supabase
      .from('tasks')
      .select('task_type, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return (data || []).map((t) => ({
      type: 'behavior' as const,
      source: t.task_type,
      value: t.status === 'completed' ? 1 : 0,
      timestamp: t.created_at,
    }));
  }

  private async collectImplicitSignals(userId: string): Promise<Signal[]> {
    const { data } = await this.supabase
      .from('messages')
      .select('sender_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // 计算用户参与度
    const userMessages = (data || []).filter((m) => m.sender_type === 'user');
    return [{
      type: 'implicit' as const,
      source: 'engagement',
      value: userMessages.length / (data?.length || 1),
      timestamp: new Date().toISOString(),
    }];
  }

  aggregate(signals: Signal[]): AggregatedSignal[] {
    const byCategory = new Map<string, Signal[]>();

    for (const signal of signals) {
      const key = signal.source;
      if (!byCategory.has(key)) {
        byCategory.set(key, []);
      }
      byCategory.get(key)!.push(signal);
    }

    return Array.from(byCategory.entries()).map(([category, sigs]) => {
      const score = sigs.reduce((sum, s) => sum + s.value, 0) / sigs.length;
      const confidence = Math.min(sigs.length / 10, 1);

      return { category, signals: sigs, score, confidence };
    });
  }
}
