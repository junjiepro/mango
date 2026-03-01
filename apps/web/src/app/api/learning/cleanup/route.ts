/**
 * Learning Cleanup API
 * T187: 删除学习数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get('ruleId');

  if (ruleId) {
    // 删除单条规则
    const { error } = await supabase
      .from('learning_records')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // 删除所有学习数据
  const { error: rulesError } = await supabase
    .from('learning_records')
    .delete()
    .eq('user_id', user.id);

  const { error: feedbackError } = await supabase
    .from('feedback_records')
    .delete()
    .eq('user_id', user.id);

  if (rulesError || feedbackError) {
    return NextResponse.json(
      { error: rulesError?.message || feedbackError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: 'All learning data deleted' });
}
