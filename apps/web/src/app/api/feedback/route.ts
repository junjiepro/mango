/**
 * Feedback API Route
 * POST /api/feedback - 提交反馈
 * GET /api/feedback - 获取用户反馈列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, message_id, task_id, feedback_type, rating, comment, context } = body;

    const { data, error } = await supabase
      .from('feedback_records')
      .insert({
        user_id: user.id,
        conversation_id,
        message_id,
        task_id,
        feedback_type,
        rating,
        comment,
        context,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Feedback creation error:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('feedback_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
