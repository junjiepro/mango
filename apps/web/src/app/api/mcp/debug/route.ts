/**
 * MCP Service Debug API Route
 * 用于调试设备的MCP服务
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * POST /api/mcp/debug
 * 调试MCP服务 - 列出工具或调用工具
 *
 * Body:
 * {
 *   device_id: string,
 *   action: 'list_tools' | 'call_tool',
 *   tool_name?: string,
 *   arguments?: Record<string, any>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_id, action, tool_name, arguments: toolArgs } = body;

    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'device_id and action are required' },
        { status: 400 }
      );
    }

    // 获取设备信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('id, user_id, device_url, binding_code, status')
      .eq('id', device_id)
      .single();

    if (bindingError || !binding) {
      throw new AppError('Device not found', ErrorType.RESOURCE_NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError('Forbidden', ErrorType.AUTH_FORBIDDEN, 403);
    }

    if (binding.status !== 'active') {
      throw new AppError('Device is not active', ErrorType.VALIDATION_FAILED, 400);
    }

    if (!binding.device_url) {
      throw new AppError('Device URL not available', ErrorType.VALIDATION_FAILED, 400);
    }

    // 根据action执行不同操作
    if (action === 'list_tools') {
      // 列出所有可用工具
      const response = await fetch(`${binding.device_url}/mcp/tools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${binding.binding_code}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new AppError(
          `Failed to list tools: ${response.statusText}`,
          ErrorType.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      const tools = await response.json();
      return NextResponse.json({ tools });
    } else if (action === 'call_tool') {
      // 调用指定工具
      if (!tool_name) {
        return NextResponse.json(
          { error: 'tool_name is required for call_tool action' },
          { status: 400 }
        );
      }

      const response = await fetch(`${binding.device_url}/mcp/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${binding.binding_code}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: tool_name,
          arguments: toolArgs || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          `Failed to call tool: ${errorText}`,
          ErrorType.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      const result = await response.json();
      return NextResponse.json({ result });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be list_tools or call_tool' },
        { status: 400 }
      );
    }
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('POST /api/mcp/debug failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
