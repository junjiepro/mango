/**
 * CLI Configuration Manager
 * 管理CLI配置的加载、验证和存储
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { deviceSecretManager } from './device-secret.js';
import axios from 'axios';
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
    const appUrl = options.appUrl || process.env.MANGO_APP_URL || 'http://localhost:3000';
    let supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
    let supabaseAnonKey = options.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;

    // 如果未提供 Supabase 配置或指定了 appUrl，尝试从缓存或 API 获取
    if (!supabaseUrl || !supabaseAnonKey || options.appUrl) {
      const cached = this.readConfig();
      if (!options.appUrl && cached?.supabaseUrl && cached?.supabaseAnonKey) {
        supabaseUrl = supabaseUrl || cached.supabaseUrl;
        supabaseAnonKey = supabaseAnonKey || cached.supabaseAnonKey;
      } else {
        // 从 API 获取配置
        try {
          const response = await axios.get(`${appUrl}/api/config`, { timeout: 5000 });
          // 指定 appUrl，则需从 APII 获取
          if (options.appUrl) {
            supabaseUrl = response.data.supabaseUrl;
            supabaseAnonKey = response.data.supabaseAnonKey;
          } else {
            supabaseUrl = supabaseUrl || response.data.supabaseUrl;
            supabaseAnonKey = supabaseAnonKey || response.data.supabaseAnonKey;
          }

          // 缓存配置
          this.saveConfig({ appUrl, supabaseUrl, supabaseAnonKey });
        } catch (error) {
          throw new Error(
            `Failed to fetch configuration from ${appUrl}/api/config\n` +
              'Please ensure the web application is running or provide configuration manually.'
          );
        }
      }
    }

    const rawConfig = {
      appUrl,
      supabaseUrl,
      supabaseAnonKey,
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
            '  1. Command line option --app-url (auto-fetch from web)\n' +
            '  2. Command line options (--supabase-url, --supabase-anon-key)\n' +
            '  3. Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)'
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
}

// 导出单例实例
export const configManager = new ConfigManager();
