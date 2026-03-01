/**
 * User MCP Tools API
 * 获取用户所有设备的 MCP 工具（从设备实时获取，配置保存在设备本地）
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * GET /api/mcp/tools
 * 获取当前用户所有设备的 MCP 工具
 *
 * 查询参数:
 * - include_offline: 是否包含离线设备 (默认 false)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeOffline = searchParams.get('include_offline') === 'true';

    // 获取用户的所有设备绑定
    let query = supabase
      .from('device_bindings')
      .select('*')
      .eq('user_id', user.id);

    if (!includeOffline) {
      query = query.eq('status', 'active');
    }

    const { data: bindings, error: bindingsError } = await query;

    if (bindingsError) {
      throw new AppError(
        `Failed to fetch device bindings: ${bindingsError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    // 获取每个设备的 MCP 服务和工具
    const devicesWithTools = await Promise.all(
      (bindings || []).map(async (binding) => {
        // 如果设备离线或没有 URL，返回空工具列表
        if (!binding.device_url || binding.status !== 'active') {
          return {
            binding_id: binding.id,
            device_name: binding.device_name,
            device_id: binding.device_id,
            platform: binding.platform,
            status: binding.status,
            device_url: binding.device_url,
            services: [],
            total_tools: 0,
            is_online: false,
          };
        }

        // 尝试从设备获取 MCP 服务列表
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const servicesResponse = await fetch(`${binding.device_url}/mcp/services`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${binding.binding_code}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!servicesResponse.ok) {
            return {
              binding_id: binding.id,
              device_name: binding.device_name,
              device_id: binding.device_id,
              platform: binding.platform,
              status: binding.status,
              device_url: binding.device_url,
              services: [],
              total_tools: 0,
              is_online: false,
            };
          }

          const servicesData = await servicesResponse.json();
          const services = servicesData.services || [];

          // 获取每个服务的工具列表
          const servicesWithTools = await Promise.all(
            services.map(async (service: any) => {
              try {
                const toolsController = new AbortController();
                const toolsTimeoutId = setTimeout(() => toolsController.abort(), 5000);

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
                  return {
                    service_name: service.name,
                    service_status: service.status,
                    tools: toolsData.tools || [],
                    is_online: true,
                  };
                }
              } catch (error) {
                // 服务离线或无法访问
              }

              return {
                service_name: service.name,
                service_status: service.status,
                tools: [],
                is_online: false,
              };
            })
          );

          return {
            binding_id: binding.id,
            device_name: binding.device_name,
            device_id: binding.device_id,
            platform: binding.platform,
            status: binding.status,
            device_url: binding.device_url,
            services: servicesWithTools,
            total_tools: servicesWithTools.reduce((sum, s) => sum + s.tools.length, 0),
            is_online: true,
          };
        } catch (error) {
          // 设备离线或无法访问
          return {
            binding_id: binding.id,
            device_name: binding.device_name,
            device_id: binding.device_id,
            platform: binding.platform,
            status: binding.status,
            device_url: binding.device_url,
            services: [],
            total_tools: 0,
            is_online: false,
          };
        }
      })
    );

    // 统计信息
    const totalDevices = devicesWithTools.length;
    const onlineDevices = devicesWithTools.filter((d) => d.is_online).length;
    const totalServices = devicesWithTools.reduce((sum, d) => sum + d.services.length, 0);
    const totalTools = devicesWithTools.reduce((sum, d) => sum + d.total_tools, 0);

    return NextResponse.json({
      devices: devicesWithTools,
      summary: {
        total_devices: totalDevices,
        online_devices: onlineDevices,
        total_services: totalServices,
        total_tools: totalTools,
      },
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/mcp/tools failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
