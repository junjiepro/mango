/**
 * MCP Tools - 初始化和管理 MCP 工具
 */

import { experimental_createMCPClient as createMCPClient } from 'https://esm.sh/@ai-sdk/mcp';
import { tool } from 'https://esm.sh/ai';
import { z } from 'https://esm.sh/zod@3.23.8';

/**
 * 初始化 MCP 工具
 */
export async function initializeMCPTools(
  supabase: any,
  channel: any,
  messageId: string,
  userId: string,
  deviceId?: string | null,
  abortSignal?: AbortSignal
): Promise<Record<string, any>> {
  const tools: Record<string, any> = {};

  const mcpServerUrl = Deno.env.get('MCP_SERVER_URL');
  const mcpApiKey = Deno.env.get('MCP_SERVER_API_KEY') || '';

  let mcpClient: any | null = null;
  let deviceMcpClient: any | null = null;

  if (abortSignal) {
    abortSignal.onabort = () => {
      mcpClient?.close();
      deviceMcpClient?.close();
    };
  }

  // 1. 加载全局 MCP 服务器工具
  if (mcpServerUrl) {
    try {
      console.log(`Connecting to global MCP server: ${mcpServerUrl}`);
      mcpClient = await createMCPClient({
        transport: {
          type: 'http',
          url: mcpServerUrl,
          headers: mcpApiKey ? { Authorization: `Bearer ${mcpApiKey}` } : undefined,
        },
      });

      const mcpTools = await mcpClient.tools();
      console.log(`Loaded ${Object.keys(mcpTools).length} global MCP tools`);

      for (const [name, mcpTool] of Object.entries(mcpTools)) {
        tools[`global_${name}`] = mcpTool;
      }
    } catch (error) {
      console.error('Failed to load global MCP tools:', error);
    }
  }

  // 2. 加载用户设备 MCP 工具
  if (!deviceId) {
    console.log('No device ID specified, skipping device MCP tool loading');
    return tools;
  }

  try {
    await loadDeviceMCPTools(
      supabase,
      channel,
      messageId,
      userId,
      deviceId,
      tools
    );
  } catch (error) {
    console.error('Failed to load device MCP tools:', error);
  }

  return tools;
}

/**
 * 加载设备 MCP 工具
 */
async function loadDeviceMCPTools(
  supabase: any,
  channel: any,
  messageId: string,
  userId: string,
  deviceId: string,
  tools: Record<string, any>
): Promise<void> {
  console.log(`Loading MCP tools from device: ${deviceId}`);

  const { data: bindings, error: bindingsError } = await supabase
    .from('device_bindings')
    .select('*')
    .eq('user_id', userId)
    .eq('id', deviceId)
    .eq('status', 'active');

  if (bindingsError) {
    console.error('Failed to fetch device bindings:', bindingsError);
    return;
  }

  if (!bindings?.length) {
    console.log('No active device bindings found');
    return;
  }

  console.log(`Found ${bindings.length} active device bindings`);

  for (const binding of bindings) {
    await loadToolsFromDevice(binding, channel, messageId, tools);
  }

  console.log(`Total MCP tools loaded: ${Object.keys(tools).length}`);
}

/**
 * 从单个设备加载工具
 */
async function loadToolsFromDevice(
  binding: any,
  channel: any,
  messageId: string,
  tools: Record<string, any>
): Promise<void> {
  if (!binding.device_url) {
    console.log(`Skipping binding ${binding.id}: no device URL`);
    return;
  }

  // 按优先级构建候选 URL 列表（包含 tailscale_url）
  const urlsToTry = [
    binding.device_url.cloudflare_url,
    binding.device_url.tailscale_url,
    binding.device_url.hostname_url,
    binding.device_url.localhost_url,
  ].filter(Boolean) as string[];

  if (!urlsToTry.length) {
    console.log(`Skipping binding ${binding.id}: no valid URL`);
    return;
  }

  // 逐个尝试健康检查，找到第一个可达的 URL
  let reachableUrl: string | null = null;
  for (const candidateUrl of urlsToTry) {
    const ok = await checkDeviceHealth(candidateUrl, binding, channel, messageId);
    if (ok) { reachableUrl = candidateUrl; break; }
  }
  if (!reachableUrl) return;

  try {
    // 连接 MCP 并加载工具
    const { experimental_createMCPClient } = await import('https://esm.sh/@ai-sdk/mcp');
    const mcpClient = await experimental_createMCPClient({
      transport: {
        type: 'http',
        url: `${reachableUrl}/mcp`,
        headers: { Authorization: `Bearer ${binding.binding_code}` },
      },
    });

    const deviceTools = await mcpClient.tools();
    console.log(`Loaded ${Object.keys(deviceTools).length} tools from ${binding.device_name}`);

    for (const [name, deviceTool] of Object.entries(deviceTools)) {
      tools[`${binding.device_name}_${name}`] = deviceTool;
    }
  } catch (error) {
    await handleDeviceError(error, binding, channel, messageId);
  }
}

/**
 * 检查设备健康状态
 */
async function checkDeviceHealth(
  url: string,
  binding: any,
  channel: any,
  messageId: string
): Promise<boolean> {
  console.log(`Checking device health: ${binding.device_name}`);

  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      await channel.send({
        type: 'broadcast',
        event: 'device_status',
        payload: {
          messageId,
          deviceId: binding.id,
          deviceName: binding.device_name,
          status: 'offline',
          error: `Health check failed: ${response.status}`,
        },
      });
      return false;
    }

    console.log(`Device ${binding.device_name} is online`);
    return true;
  } catch (error) {
    await handleDeviceError(error, binding, channel, messageId);
    return false;
  }
}

/**
 * 处理设备错误
 */
async function handleDeviceError(
  error: unknown,
  binding: any,
  channel: any,
  messageId: string
): Promise<void> {
  console.error(`Device ${binding.device_name} error:`, error);

  let errorMessage = 'Unknown error';
  let errorType = 'connection_error';

  if (error instanceof Error) {
    errorMessage = error.message;

    if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
      errorType = 'timeout';
      errorMessage = 'Connection timeout (5s)';
    } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      errorType = 'network_error';
      errorMessage = 'Network error - device may be offline';
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      errorType = 'auth_error';
      errorMessage = 'Authentication failed';
    }
  }

  await channel.send({
    type: 'broadcast',
    event: 'device_status',
    payload: {
      messageId,
      deviceId: binding.id,
      deviceName: binding.device_name,
      status: 'error',
      errorType,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    },
  });
}
