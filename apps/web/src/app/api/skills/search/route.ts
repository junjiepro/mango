/**
 * Skill Search API (Keyword-based)
 * T167: 基于关键词的搜索 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { query, limit = 10 } = await request.json();

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  // 使用全文搜索
  const { data, error } = await supabase.rpc('search_skills_by_keywords', {
    query_text: query,
    match_count: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
