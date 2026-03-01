/**
 * Skill Keywords Extractor Edge Function
 * T166: 提取 Skill 关键词（替代 embedding）
 */

import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const app = new Hono().basePath('/generate-skill-embedding');

app.post('/extract', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { skill_id, name, description } = await c.req.json();

  if (!skill_id) {
    return c.json({ error: 'skill_id is required' }, 400);
  }

  // 提取关键词
  const keywords = extractKeywords(name, description);
  const triggers = extractTriggers(description);

  // 更新 skill_registry
  const { error } = await supabase
    .from('skill_registry')
    .update({ keywords, triggers })
    .eq('id', skill_id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, keywords, triggers });
});

function extractKeywords(name: string, description: string): string[] {
  const text = `${name || ''} ${description || ''}`.toLowerCase();
  const words = text.split(/[\s,，。.!！?？]+/).filter(w => w.length > 1);
  return [...new Set(words)].slice(0, 20);
}

function extractTriggers(description: string): string[] {
  const triggers: string[] = [];
  const patterns = [
    /当.*时/g, /如果.*则/g, /用于.*/g,
    /可以.*/g, /帮助.*/g, /生成.*/g
  ];

  for (const p of patterns) {
    const matches = description?.match(p) || [];
    triggers.push(...matches.map(m => m.slice(0, 20)));
  }

  return [...new Set(triggers)].slice(0, 10);
}

Deno.serve(app.fetch);
