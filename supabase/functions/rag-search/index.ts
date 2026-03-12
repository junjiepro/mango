/**
 * RAG Search Edge Function (Keyword-based)
 * T183: 基于关键词的 RAG 搜索
 */

import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const app = new Hono().basePath('/rag-search');

app.post('/search', async (c) => {
  const supabaseKey =
    Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey);

  const { query, user_id, limit = 5 } = await c.req.json();

  if (!query) {
    return c.json({ error: 'query is required' }, 400);
  }

  // 基于关键词搜索学习记录
  const { data } = await supabase
    .from('learning_records')
    .select('rule_type, rule_content, confidence_score')
    .eq('user_id', user_id)
    .textSearch('rule_content', query)
    .limit(limit);

  return c.json({ results: data || [] });
});

Deno.serve(app.fetch);
