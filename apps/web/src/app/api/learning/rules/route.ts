/**
 * Learning Rules API Route
 * GET /api/learning/rules - 获取学习规则
 * POST /api/learning/rules - 创建学习规则
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('learning_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Learning rules fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { record_type, content, confidence = 0.5 } = body;

    const { data, error } = await supabase
      .from('learning_records')
      .insert({
        user_id: user.id,
        record_type,
        content,
        confidence,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Learning rule creation error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
