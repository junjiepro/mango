/**
 * Extract Learning Rules Edge Function
 * T177: 从反馈中提取学习规则
 */

import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const app = new Hono().basePath('/extract-learning-rules');

interface FeedbackRecord {
  id: string;
  user_id: string;
  message_id: string;
  rating: 'positive' | 'negative';
  category?: string;
  comment?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

interface LearningRule {
  rule_type: string;
  rule_content: Record<string, unknown>;
  confidence_score: number;
  source_feedback_ids: string[];
}

app.post('/extract', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user_id } = await c.req.json();

  if (!user_id) {
    return c.json({ error: 'user_id is required' }, 400);
  }

  // 获取用户最近的反馈
  const { data: feedbacks, error } = await supabase
    .from('feedback_records')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!feedbacks?.length) {
    return c.json({ rules: [], message: 'No feedback found' });
  }

  // 提取规则
  const rules = extractRules(feedbacks as FeedbackRecord[]);

  // 保存规则
  for (const rule of rules) {
    await supabase.from('learning_records').upsert({
      user_id,
      rule_type: rule.rule_type,
      rule_content: rule.rule_content,
      confidence_score: rule.confidence_score,
      updated_at: new Date().toISOString(),
    });
  }

  return c.json({ rules, count: rules.length });
});

function extractRules(feedbacks: FeedbackRecord[]): LearningRule[] {
  const rules: LearningRule[] = [];

  // 按类别分组
  const byCategory = groupBy(feedbacks, (f) => f.category || 'general');

  for (const [category, items] of Object.entries(byCategory)) {
    const positive = items.filter((f) => f.rating === 'positive');
    const negative = items.filter((f) => f.rating === 'negative');

    // 计算置信度
    const total = items.length;
    const positiveRatio = positive.length / total;

    if (total >= 3) {
      rules.push({
        rule_type: `preference_${category}`,
        rule_content: {
          category,
          preference: positiveRatio > 0.6 ? 'positive' : 'negative',
          patterns: extractPatterns(items),
        },
        confidence_score: Math.min(total / 10, 1),
        source_feedback_ids: items.map((f) => f.id),
      });
    }
  }

  return rules;
}

function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

function extractPatterns(feedbacks: FeedbackRecord[]): string[] {
  return feedbacks
    .filter((f) => f.comment)
    .map((f) => f.comment!)
    .slice(0, 5);
}

Deno.serve(app.fetch);
