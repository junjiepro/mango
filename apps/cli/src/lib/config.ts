/**
 * CLI Configuration Manager
 * 管理CLI配置的加载、验证和存储
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { deviceSecretManager } from './device-secret.js';
import type { CLIConfig, MCPServiceConfig, StartCommandOptions } from '../types/index.js';

// 加载 .env 文件
loadEnv();

// 配置验证 schema
const configSchema = z.object({
  appUrl: z.string().url(),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  deviceSecret: z.string().optional(),
  port: z.number().int().min(1024).max(65535),
});

/**
 * 配置管理器类
 */
export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = join(deviceSecretManager.getConfigDir(), 'config.json');
  }

  /**
   * 加载配置
   */
  async loadConfig(options: StartCommandOptions): Promise<CLIConfig> {
    const rawConfig = {
      appUrl: options.appUrl || process.env.MANGO_APP_URL || 'http://localhost:3000',
      supabaseUrl: options.supabaseUrl || process.env.SUPABASE_URL,
      supabaseAnonKey: options.supabaseAnonKey || process.env.SUPABASE_ANON_KEY,
      deviceSecret: options.deviceSecret || process.env.DEVICE_SECRET,
      port: parseInt(options.port || process.env.PORT || '3001'),
    };

    try {
      return configSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map((err) => err.path.join('.')).join(', ');
        throw new Error(
          `Configuration validation failed. Missing or invalid fields: ${missingFields}\n\n` +
            'Please provide configuration via:\n' +
            '  1. Command line options (--supabase-url, --supabase-anon-key)\n' +
            '  2. Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)\n' +
            '  3. .env file in current directory'
        );
      }
      throw error;
    }
  }

  /**
   * 保存配置到文件
   */
  saveConfig(config: Partial<CLIConfig>): void {
    let existingConfig: Partial<CLIConfig> = {};

    // 读取现有配置
    if (existsSync(this.configPath)) {
      try {
        const content = readFileSync(this.configPath, 'utf-8');
        existingConfig = JSON.parse(content);
      } catch (error) {
        // 忽略解析错误，使用空配置
      }
    }

    // 合并配置
    const mergedConfig = {
      ...existingConfig,
      ...config,
    };

    // 写入配置文件
    writeFileSync(this.configPath, JSON.stringify(mergedConfig, null, 2), { mode: 0o600 });
  }

  /**
   * 读取配置文件
   */
  readConfig(): Partial<CLIConfig> | null {
    if (!existsSync(this.configPath)) {
      return null;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取MCP服务配置文件路径
   */
  getMCPConfigPath(): string {
    return join(deviceSecretManager.getConfigDir(), 'mcp_services.json');
  }

  /**
   * 加载MCP服务配置
   */
  loadMCPServices(): MCPServiceConfig[] {
    const mcpConfigPath = this.getMCPConfigPath();

    if (!existsSync(mcpConfigPath)) {
      return [];
    }

    try {
      const content = readFileSync(mcpConfigPath, 'utf-8');
      const data = JSON.parse(content);
      return data.services || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 保存MCP服务配置
   */
  saveMCPServices(services: MCPServiceConfig[]): void {
    const mcpConfigPath = this.getMCPConfigPath();
    const data = {
      services,
      updatedAt: new Date().toISOString(),
    };

    writeFileSync(mcpConfigPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  /**
   * 添加MCP服务
   */
  addMCPService(service: MCPServiceConfig): void {
    const services = this.loadMCPServices();

    // 检查是否已存在同名服务
    const existingIndex = services.findIndex((s) => s.name === service.name);

    if (existingIndex >= 0) {
      // 更新现有服务
      services[existingIndex] = service;
    } else {
      // 添加新服务
      services.push(service);
    }

    this.saveMCPServices(services);
  }

  /**
   * 删除MCP服务
   */
  removeMCPService(serviceName: string): boolean {
    const services = this.loadMCPServices();
    const filteredServices = services.filter((s) => s.name !== serviceName);

    if (filteredServices.length === services.length) {
      return false; // 服务不存在
    }

    this.saveMCPServices(filteredServices);
    return true;
  }

  /**
   * 获取MCP服务
   */
  getMCPService(serviceName: string): MCPServiceConfig | null {
    const services = this.loadMCPServices();
    return services.find((s) => s.name === serviceName) || null;
  }
}

// 导出单例实例
export const configManager = new ConfigManager();
