/**
 * ACP Service Configuration Types
 * ACP (Agent Communication Protocol) 服务配置类型定义
 *
 * 注意: ACP协议目前处于预留状态,具体实现待协议规范确定后补充
 */

/**
 * ACP服务配置
 */
export interface ACPServiceConfig {
  /** 服务名称 */
  name: string;

  /** 服务描述 */
  description?: string;

  /** 启动命令 */
  command: string;

  /** 命令参数 */
  args?: string[];

  /** 环境变量 */
  env?: Record<string, string>;

  /** 工作目录 */
  cwd?: string;

  /** 服务类型 */
  type: 'stdio' | 'http' | 'websocket';

  /** HTTP/WebSocket 配置 */
  endpoint?: {
    /** 服务地址 */
    url: string;

    /** 认证方式 */
    auth?: {
      type: 'bearer' | 'basic' | 'api-key';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
    };

    /** 超时时间(ms) */
    timeout?: number;
  };

  /** 自动重启配置 */
  autoRestart?: boolean;

  /** 最大重启次数 */
  maxRestarts?: number;

  /** 健康检查间隔(ms) */
  healthCheckInterval?: number;

  /** 服务状态 */
  status?: 'running' | 'stopped' | 'error';

  /** 最后错误信息 */
  lastError?: string;

  /** 创建时间 */
  createdAt?: string;

  /** 更新时间 */
  updatedAt?: string;
}

/**
 * ACP服务列表配置
 */
export interface ACPServicesConfig {
  /** 服务列表 */
  services: ACPServiceConfig[];

  /** 全局配置 */
  global?: {
    /** 默认超时时间(ms) */
    defaultTimeout?: number;

    /** 默认健康检查间隔(ms) */
    defaultHealthCheckInterval?: number;

    /** 是否启用自动重启 */
    enableAutoRestart?: boolean;
  };
}

/**
 * ACP协议消息类型
 */
export interface ACPMessage {
  /** 消息ID */
  id: string;

  /** 消息类型 */
  type: 'request' | 'response' | 'notification' | 'error';

  /** 方法名 */
  method?: string;

  /** 参数 */
  params?: unknown;

  /** 结果 */
  result?: unknown;

  /** 错误信息 */
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };

  /** 时间戳 */
  timestamp: number;
}

/**
 * ACP服务能力
 */
export interface ACPCapabilities {
  /** 支持的方法列表 */
  methods: string[];

  /** 支持的通知类型 */
  notifications?: string[];

  /** 协议版本 */
  version: string;

  /** 服务元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 验证ACP服务配置
 */
export function validateACPConfig(config: ACPServiceConfig): string[] {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Service name is required');
  }

  if (!config.command || config.command.trim() === '') {
    errors.push('Command is required');
  }

  if (!['stdio', 'http', 'websocket'].includes(config.type)) {
    errors.push('Invalid service type. Must be: stdio, http, or websocket');
  }

  if ((config.type === 'http' || config.type === 'websocket') && !config.endpoint?.url) {
    errors.push(`Endpoint URL is required for ${config.type} type`);
  }

  if (config.maxRestarts !== undefined && config.maxRestarts < 0) {
    errors.push('maxRestarts must be >= 0');
  }

  if (config.healthCheckInterval !== undefined && config.healthCheckInterval < 1000) {
    errors.push('healthCheckInterval must be >= 1000ms');
  }

  return errors;
}

/**
 * ACP会话配置（用于 @mcpc-tech/acp-ai-provider）
 */
export interface ACPSessionConfig {
  /** 会话ID */
  sessionId: string;

  /** 绑定码 */
  bindingCode: string;

  /** Agent配置 */
  agent: {
    /** Agent命令 */
    command: string;
    /** 命令参数 */
    args?: string[];
    /** 环境变量 */
    env?: Record<string, string>;
    /** 认证方法ID */
    authMethodId?: string;
  };

  /** 会话配置 */
  session: {
    /** 工作目录 */
    cwd: string;
    /** MCP服务器列表 */
    mcpServers: Array<{
      name: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
    }>;
  };

  /** 会话创建时间 */
  createdAt: string;

  /** 最后活跃时间 */
  lastActiveAt: string;

  /** 会话状态 */
  status: 'active' | 'idle' | 'closed' | 'error';

  /** 空闲超时时间（毫秒） */
  idleTimeout?: number;
}

/**
 * 创建默认ACP配置
 */
export function createDefaultACPConfig(name: string, command: string): ACPServiceConfig {
  return {
    name,
    command,
    type: 'stdio',
    autoRestart: true,
    maxRestarts: 3,
    healthCheckInterval: 30000,
    status: 'stopped',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
