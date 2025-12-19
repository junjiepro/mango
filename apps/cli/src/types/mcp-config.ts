/**
 * MCP Service Configuration Types
 */

import { z } from 'zod';

/**
 * MCP服务配置Schema
 */
export const mcpServiceConfigSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type MCPServiceConfig = z.infer<typeof mcpServiceConfigSchema>;

/**
 * MCP工具定义
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP资源定义
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP工具调用结果
 */
export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

/**
 * MCP资源内容
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}
