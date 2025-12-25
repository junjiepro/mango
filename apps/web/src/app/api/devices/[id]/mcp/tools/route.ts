/**
 * MCP Tools Discovery API
 * 从设备获取所有可用的 MCP 工具（配置保存在设备本地）
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * GET /api/devices/[id]/mcp/tools
 * 获取设备的所有可用 MCP 工具（从设备实时获取）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bindingId = params.id;

    // 验证绑定是否属于当前用户
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('id, user_id, device_url, binding_code, status, device_name')
      .eq('id', bindingId)
      .single();

    if (bindingError || !binding) {
      throw new AppError('Binding not found', ErrorType.NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError(
        'Forbidden: You do not own this binding',
        ErrorType.FORBIDDEN,
        403
      );
    }

    if (binding.status !== 'active') {
      throw new AppError(
        'Device binding is not active',
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (!binding.device_url) {
      throw new AppError(
        'Device URL not available',
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // 从设备获取 MCP 服务列表
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const servicesResponse = await fetch(`${binding.device_url}/mcp/services`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${binding.binding_code}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!servicesResponse.ok) {
        throw new AppError(
          `Failed to fetch services from device: HTTP ${servicesResponse.status}`,
          ErrorType.EXTERNAL_SERVICE_ERROR,
          servicesResponse.status
        );
      }

      const servicesData = await servicesResponse.json();
      const services = servicesData.services || [];

      // 获取每个服务的工具列表
      const allTools: Array<{
        service_name: string;
        tools: any[];
        error?: string;
      }> = [];

      for (const service of services) {
        try {
          const toolsController = new AbortController();
          const toolsTimeoutId = setTimeout(() => toolsController.abort(), 10000);

          const toolsResponse = await fetch(
            `${binding.device_url}/mcp/${service.name}/tools`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${binding.binding_code}`,
              },
              signal: toolsController.signal,
            }
          );

          clearTimeout(toolsTimeoutId);

          if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            allTools.push({
              service_name: service.name,
              tools: toolsData.tools || [],
            });
          } else {
            allTools.push({
              service_name: service.name,
              tools: [],
              error: `HTTP ${toolsResponse.status}: ${toolsResponse.statusText}`,
            });
          }
        } catch (error) {
          allTools.push({
            service_name: service.name,
            tools: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // 统计信息
      const totalTools = allTools.reduce((sum, s) => sum + s.tools.length, 0);
      const successfulServices = allTools.filter((s) => !s.error).length;
      const failedServices = allTools.filter((s) => s.error).length;

      return NextResponse.json({
        binding_id: bindingId,
        device_name: binding.device_name,
        device_url: binding.device_url,
        services: allTools,
        summary: {
          total_services: allTools.length,
          successful_services: successfulServices,
          failed_services: failedServices,
          total_tools: totalTools,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to communicate with device: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorType.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/devices/[id]/mcp/tools failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}

/**
 * POST /api/devices/[id]/mcp/tools/invoke
 * 调用设备的 MCP 工具
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bindingId = params.id;

    // 验证绑定是否属于当前用户
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('id, user_id, device_url, binding_code, status')
      .eq('id', bindingId)
      .single();

    if (bindingError || !binding) {
      throw new AppError('Binding not found', ErrorType.NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError(
        'Forbidden: You do not own this binding',
        ErrorType.FORBIDDEN,
        403
      );
    }

    if (binding.status !== 'active') {
      throw new AppError(
        'Device binding is not active',
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (!binding.device_url) {
      throw new AppError(
        'Device URL not available',
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // 解析请求体
    const body = await request.json();
    const { service_name, tool_name, arguments: toolArgs } = body;

    if (!service_name || !tool_name) {
      return NextResponse.json(
        { error: 'service_name and tool_name are required' },
        { status: 400 }
      );
    }

    // 调用设备的 MCP 工具
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(
        `${binding.device_url}/mcp/${service_name}/tools/${tool_name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${binding.binding_code}`,
          },
          body: JSON.stringify(toolArgs || {}),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(
          `Tool invocation failed: HTTP ${response.status}`,
          ErrorType.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      const result = await response.json();

      logger.info('MCP tool invoked successfully', {
        bindingId,
        serviceName: service_name,
        toolName: tool_name,
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        service: service_name,
        tool: tool_name,
        result: result.result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to invoke tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorType.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('POST /api/devices/[id]/mcp/tools/invoke failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
