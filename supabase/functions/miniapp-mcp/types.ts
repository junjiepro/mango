/**
 * MiniApp MCP Types
 * 类型定义
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// MiniApp 定义
export interface MiniApp {
  id: string;
  name: string;
  description: string;
  code: string;
  html?: Record<string, string>;
  manifest?: {
    version?: string;
    permissions?: string[];
  };
  ui_bundle?: string;
  installation_id?: string;
}

// 用户信息
export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

// Storage API
export interface StorageAPI {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (prefix?: string) => Promise<string[]>;
}

// Notification API
export interface NotificationAPI {
  send: (title: string, body?: string) => Promise<void>;
}

// HTTP API
export interface HttpAPI {
  get: (url: string, options?: HttpOptions) => Promise<HttpResponse>;
  post: (url: string, body?: unknown, options?: HttpOptions) => Promise<HttpResponse>;
  put: (url: string, body?: unknown, options?: HttpOptions) => Promise<HttpResponse>;
  delete: (url: string, options?: HttpOptions) => Promise<HttpResponse>;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

// MiniApp 沙箱上下文
export interface MiniAppSandboxContext {
  // 用户信息
  user: UserInfo;

  // 存储 API
  storage: StorageAPI;

  // 通知 API
  notification: NotificationAPI;

  // HTTP API
  http: HttpAPI;

  // MiniApp 元数据
  miniAppId: string;
  miniAppName: string;
}

// MCP Tool 定义
export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: unknown; // Zod schema
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

// UI Resource 内容类型
export interface UIResourceContent {
  type: string;
  props?: Record<string, unknown>;
  children?: UIResourceContent[];
  id?: string;
  events?: UIEvent[];
}

export interface UIEvent {
  event: string;
  action: string;
  payload?: Record<string, unknown>;
}
