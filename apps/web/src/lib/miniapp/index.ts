/**
 * MiniApp 通信模块统一导出
 */

export { AppBridge } from './app-bridge';
export { buildCSP } from './csp-builder';
export { generateViewSDKScript } from './view-sdk';

export { MINIAPP_TEMPLATES } from './templates';
export type { MiniAppTemplate } from './templates';
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  ToolInput,
  ToolResult,
  ToolCancelled,
  HostContext,
  CSPConfig,
  ToolDefinition,
  ToolDefinitionMeta,
  ResourceDefinition,
  AppBridgeCallbacks,
} from './types';
