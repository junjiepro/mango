/**
 * MCP Service Configuration Types
 */

import { z } from 'zod';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

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

export interface ServerClient {
  id: string;
  name: string;
  client: Client;
}
