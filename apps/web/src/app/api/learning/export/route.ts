/**
 * Learning Export API
 * T188: 导出学习数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 获取学习规则
  const { data: rules } = await supabase
    .from('learning_records')
    .select('*')
    .eq('user_id', user.id);

  // 获取反馈记录
  const { data: feedbacks } = await supabase
    .from('feedback_records')
    .select('*')
    .eq('user_id', user.id);

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    learningRules: rules || [],
    feedbackRecords: feedbacks || [],
  };

  return NextResponse.json(exportData);
}
