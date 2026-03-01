/**
 * Device Service Client
 * 通过 tunnel URL 调用设备服务
 */

import { createClient } from '@/lib/supabase/client';

export interface DeviceBinding {
  id: string;
  binding_name: string;
  device_url: string;
  status: 'active' | 'inactive' | 'expired';
  binding_code: string;
  online_urls?: string[];
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
      .select('id, binding_name, device_url, status, binding_code')
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
  async checkDeviceHealth(deviceUrl: string): Promise<DeviceHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${deviceUrl}/health`, {
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
   * 列出设备上的所有 MCP 服务（需要 binding_code 认证）
   */
  async listMCPServices(deviceUrl: string, bindingCode: string): Promise<MCPService[]> {
    try {
      const response = await fetch(`${deviceUrl}/mcp/services`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bindingCode}`,
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
   * 通过 MCP 聚合端点调用工具（需要 binding_code 认证）
   * 使用 MCP 协议的 tools/call 方法
   */
  async callMCPTool(
    deviceUrl: string,
    bindingCode: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${deviceUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bindingCode}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool invocation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Tool error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      throw new Error(
        `Tool invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 列出所有可用的 MCP 工具（需要 binding_code 认证）
   * 使用 MCP 协议的 tools/list 方法
   */
  async listMCPTools(deviceUrl: string, bindingCode: string): Promise<MCPTool[]> {
    try {
      const response = await fetch(`${deviceUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bindingCode}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/list',
          params: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`List tools error: ${data.error.message}`);
      }

      return data.result?.tools || [];
    } catch (error) {
      throw new Error(
        `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 列出所有可用的 MCP 资源（需要 binding_code 认证）
   * 使用 MCP 协议的 resources/list 方法
   */
  async listMCPResources(deviceUrl: string, bindingCode: string): Promise<MCPResource[]> {
    try {
      const response = await fetch(`${deviceUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bindingCode}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'resources/list',
          params: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to list resources: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`List resources error: ${data.error.message}`);
      }

      return data.result?.resources || [];
    } catch (error) {
      throw new Error(
        `Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 读取 MCP 资源（需要 binding_code 认证）
   * 使用 MCP 协议的 resources/read 方法
   */
  async readMCPResource(
    deviceUrl: string,
    bindingCode: string,
    resourceUri: string
  ): Promise<unknown> {
    try {
      const response = await fetch(`${deviceUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bindingCode}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'resources/read',
          params: {
            uri: resourceUri,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to read resource: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Read resource error: ${data.error.message}`);
      }

      return data.result?.contents || [];
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
      deviceUrl: string;
      bindingCode: string;
      tools: MCPTool[];
    }>
  > {
    const devices = await this.getUserDevices();
    const allTools: Array<{
      deviceId: string;
      deviceName: string;
      deviceUrl: string;
      bindingCode: string;
      tools: MCPTool[];
    }> = [];

    for (const device of devices) {
      try {
        // 检查设备是否在线
        await this.checkDeviceHealth(device.device_url);

        // 获取设备上的所有工具（通过 MCP 聚合端点）
        const tools = await this.listMCPTools(device.device_url, device.binding_code);

        allTools.push({
          deviceId: device.id,
          deviceName: device.binding_name,
          deviceUrl: device.device_url,
          bindingCode: device.binding_code,
          tools,
        });
      } catch (error) {
        console.error(`Device ${device.binding_name} is offline or unreachable:`, error);
      }
    }

    return allTools;
  }
}

// 导出单例实例
export const deviceService = new DeviceServiceClient();
