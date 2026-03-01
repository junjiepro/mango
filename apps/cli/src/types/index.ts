/**
 * CLI Configuration Types
 */

export interface CLIConfig {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceSecret?: string;
  port: number;
  mcpServices?: MCPServiceConfig[];
}

export interface DeviceInfo {
  deviceId: string;
  deviceSecret: string;
  platform: 'windows' | 'macos' | 'linux';
}

export interface DeviceBinding {
  id: string;
  deviceId: string;
  userId: string;
  bindingName: string;
  tunnelUrl: string;
  bindingToken: string;
  status: 'active' | 'inactive' | 'expired';
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MCPServiceConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status: 'active' | 'inactive';
}

export interface StartCommandOptions {
  port?: string;
  ignoreOpenBindUrl?: boolean;
  appUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  deviceSecret?: string;
}
