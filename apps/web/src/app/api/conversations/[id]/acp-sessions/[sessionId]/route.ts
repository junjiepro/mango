import { createClient } from '@/lib/supabase/server';
import { getBrowserSafeDeviceUrls } from '@/lib/device-urls';
import type { DeviceUrls } from '@/hooks/useDeviceBinding';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/conversations/[id]/acp-sessions/[sessionId]
 * 更新 ACP 会话状态和最后活跃时间
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, lastActiveAt } = body;

    // 构建更新数据
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (lastActiveAt) {
      updateData.last_active_at = lastActiveAt;
    } else {
      // 默认更新为当前时间
      updateData.last_active_at = new Date().toISOString();
    }

    // 更新会话
    const { data: session, error } = await supabase
      .from('acp_sessions')
      .update(updateData)
      .eq('id', params.sessionId)
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update ACP session:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error updating ACP session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/acp-sessions/[sessionId]
 * 删除持久化的 ACP 会话记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 先查询会话及设备信息，用于同步删除 CLI 会话
    const { data: session, error: sessionError } = await supabase
      .from('acp_sessions')
      .select(
        `
        id,
        acp_session_id,
        device_binding_id,
        device_bindings (
          id,
          device_url,
          binding_code,
          status
        )
      `
      )
      .eq('id', params.sessionId)
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      console.error('Failed to load ACP session before delete:', sessionError);
      return NextResponse.json(
        { success: false, error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const binding = Array.isArray(session.device_bindings)
      ? session.device_bindings[0]
      : session.device_bindings;

    if (!binding?.binding_code || !binding?.device_url) {
      return NextResponse.json(
        { success: false, error: 'Device binding is missing CLI connection info' },
        { status: 409 }
      );
    }

    const candidateUrls = getBrowserSafeDeviceUrls(binding.device_url as unknown as DeviceUrls);
    if (candidateUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No reachable device URL is available for CLI session deletion' },
        { status: 409 }
      );
    }

    // 先同步删除 CLI 端会话，避免两端状态不一致
    {
      let cliDeleted = false;
      let lastCliError: string | null = null;

      for (const deviceUrl of candidateUrls) {
        try {
          const response = await fetch(`${deviceUrl}/acp/sessions/${session.acp_session_id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${binding.binding_code}`,
            },
          });

          if (response.ok || response.status === 404) {
            cliDeleted = true;
            break;
          }

          const errorText = await response.text().catch(() => response.statusText);
          lastCliError = errorText || `HTTP ${response.status}`;
        } catch (error) {
          lastCliError = error instanceof Error ? error.message : 'Unknown CLI delete error';
        }
      }

      if (!cliDeleted) {
        console.error('Failed to delete ACP session from CLI:', {
          acpSessionId: session.acp_session_id,
          deviceBindingId: session.device_binding_id,
          error: lastCliError,
        });
        return NextResponse.json(
          {
            success: false,
            error: lastCliError || 'Failed to delete ACP session from device CLI',
          },
          { status: 502 }
        );
      }
    }

    // 删除数据库会话记录
    const { error } = await supabase
      .from('acp_sessions')
      .delete()
      .eq('id', params.sessionId)
      .eq('conversation_id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete ACP session:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ACP session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
