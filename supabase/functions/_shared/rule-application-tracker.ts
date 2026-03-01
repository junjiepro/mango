/**
 * Rule Application Tracker
 * T184: 规则应用追踪
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RuleApplication {
  taskId: string;
  ruleId: string;
  ruleType: string;
  appliedAt: string;
  outcome?: 'success' | 'failure' | 'neutral';
}

export class RuleApplicationTracker {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async trackApplication(
    taskId: string,
    ruleId: string,
    ruleType: string
  ): Promise<void> {
    await this.supabase.from('skill_execution_logs').insert({
      skill_id: ruleId,
      execution_type: 'rule_application',
      context: { taskId, ruleType },
      started_at: new Date().toISOString(),
    });
  }

  async recordOutcome(
    taskId: string,
    ruleId: string,
    outcome: 'success' | 'failure' | 'neutral'
  ): Promise<void> {
    await this.supabase
      .from('skill_execution_logs')
      .update({
        success: outcome === 'success',
        completed_at: new Date().toISOString(),
      })
      .eq('skill_id', ruleId)
      .eq('context->>taskId', taskId);
  }
}
