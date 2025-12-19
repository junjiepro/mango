/**
 * Device Service Client
 * 通过 tunnel URL 调用设备服务
 */

import { createClient } from '@/lib/supabase/client';

export interface DeviceBinding {
  id: string;
  binding_name: string;
  tunnel_url: string;
  status: 'active' | 'inactive' | 'expired';
  binding_token: string;
}

export interface MCPService {
  name: string;
  status: 'active' | 'inactive';
  command: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

export interface DeviceHealthStatus {
  status: 'ok' | 'error';
  timestamp: number;
  version?: string;
}

/**
 * 设备服务客户端类
 */
export class DeviceServiceClient {
  private supabase = createClient();

  /**
   * 获取用户的所有活跃设备绑定
   */
  async getUserDevices(): Promise<DeviceBinding[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.supabase
      .from('device_bindings')
      .select('id, binding_name, tunnel_url, status, binding_token')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 检查设备健康状态
   */
  async checkDeviceHealth(tunnelUrl: string): Promise<DeviceHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${tunnelUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(
        `Device unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 列出设备上的所有 MCP 服务
   */
  async listMCPServices(tunnelUrl: string): Promise<MCPService[]> {
    try {
      const response = await fetch(`${tunnelUrl}/mcp/services`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list MCP services: ${response.status}`);
      }

      const data = await response.json();
      return data.services || [];
    } catch (error) {
      throw new Error(
        `Failed to list MCP services: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 列出指定 MCP 服务的所有工具
   */
  async listMCPTools(tunnelUrl: string, serviceName: string): Promise<MCPTool[]> {
    try {
      const response = await fetch(`${tunnelUrl}/mcp/${serviceName}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      throw new Error(
        `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 调用 MCP 工具
   */
  async callMCPTool(
    tunnelUrl: string,
    serviceName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${tunnelUrl}/mcp/${serviceName}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        throw new Error(`Tool invocation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(
        `Tool invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 列出指定 MCP 服务的所有资源
   */
  async listMCPResources(tunnelUrl: string, serviceName: string): Promise<MCPResource[]> {
    try {
      const response = await fetch(`${tunnelUrl}/mcp/${serviceName}/resources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list resources: ${response.status}`);
      }

      const data = await response.json();
      return data.resources || [];
    } catch (error) {
      throw new Error(
        `Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 读取 MCP 资源
   */
  async readMCPResource(
    tunnelUrl: string,
    serviceName: string,
    resourceUri: string
  ): Promise<unknown> {
    try {
      const response = await fetch(
        `${tunnelUrl}/mcp/${serviceName}/resources/${encodeURIComponent(resourceUri)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to read resource: ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      throw new Error(
        `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 获取所有设备的所有可用工具
   */
  async getAllAvailableTools(): Promise<
    Array<{
      deviceId: string;
      deviceName: string;
      tunnelUrl: string;
      serviceName: string;
      tools: MCPTool[];
    }>
  > {
    const devices = await this.getUserDevices();
    const allTools: Array<{
      deviceId: string;
      deviceName: string;
      tunnelUrl: string;
      serviceName: string;
      tools: MCPTool[];
    }> = [];

    for (const device of devices) {
      try {
        // 检查设备是否在线
        await this.checkDeviceHealth(device.tunnel_url);

        // 获取设备上的所有 MCP 服务
        const services = await this.listMCPServices(device.tunnel_url);

        // 获取每个服务的工具
        for (const service of services) {
          if (service.status === 'active') {
            try {
              const tools = await this.listMCPTools(device.tunnel_url, service.name);
              allTools.push({
                deviceId: device.id,
                deviceName: device.binding_name,
                tunnelUrl: device.tunnel_url,
                serviceName: service.name,
                tools,
              });
            } catch (error) {
              console.error(
                `Failed to list tools for service ${service.name} on device ${device.binding_name}:`,
                error
              );
            }
          }
        }
      } catch (error) {
        console.error(`Device ${device.binding_name} is offline or unreachable:`, error);
      }
    }

    return allTools;
  }
}

// 导出单例实例
export const deviceService = new DeviceServiceClient();
