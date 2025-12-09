/**
 * MCP Protocol Package
 * Model Context Protocol implementation for Mango
 */
export { MCPAdapter } from './adapter.js';
export type { MCPAdapterConfig } from './adapter.js';
export { MCPClient, createMCPClient } from './client.js';
export type { MCPClientConfig } from './client.js';
export { ToolRegistry, globalToolRegistry } from './registry.js';
export type { ToolRegistryEntry } from './registry.js';
export type { Tool, Resource, Prompt, CallToolResult, ReadResourceResult, GetPromptResult, TextContent, ImageContent, EmbeddedResource, } from '@modelcontextprotocol/sdk/types.js';
export { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
export type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
//# sourceMappingURL=index.d.ts.map