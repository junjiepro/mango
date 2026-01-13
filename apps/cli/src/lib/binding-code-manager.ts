/**
 * Binding Code Manager
 * 正式绑定码管理器
 *
 * 管理正式绑定码的生成、存储和读取
 * 正式绑定码用于长期 API 认证
 */

import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { MCPServiceConfig } from '../types/mcp-config.js';
import { mcpConnector } from './connectors/mcp-connector.js';

/**
 * 绑定码配置对象
 */
export interface BindingConfig {
  /** 绑定码 */
  bindingCode: string;
  /** 设备 ID */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
  /** 绑定时间 */
  boundAt: string;
  /** 最后使用时间 */
  lastUsedAt: string;
  /** 用户 ID（可选） */
  userId?: string;
  /** 工作空间目录（可选） */
  workspaceDir?: string;
  /** 其他元数据 */
  metadata?: {
    platform: string;
    hostname: string;
    arch: string;
  };
  /** MCP 服务配置列表 */
  mcpServices?: Record<string, MCPServiceConfig>;
}

/**
 * 正式绑定码管理器类
 */
export class BindingCodeManager {
  private bindingConfigPath: string;
  private configDir: string;
  private bindingCodes: Set<string> = new Set();

  constructor() {
    // 存储在用户目录下的隐藏文件
    this.configDir = join(homedir(), '.mango');
    this.bindingConfigPath = join(this.configDir, 'binding_config.json');
  }

  /**
   * 获取配置目录
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * 获取默认工作空间
   * @param bindingCode
   * @returns
   */
  private getDefaultWorkspaceDir(bindingCode: string): string {
    const defaultWorkspaceDir = join(this.configDir, 'workspace', bindingCode);

    return defaultWorkspaceDir;
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 生成绑定码（256位）
   */
  generateBindingCode(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * 生成并保存绑定码（简化接口）
   * 注意：此方法仅生成绑定码并返回，不保存完整配置
   * 完整配置需要在绑定成功后通过 saveConfig 保存
   */
  generateAndSave(): string {
    const code = this.generateBindingCode();
    this.bindingCodes.add(code);
    return code;
  }

  /**
   * 保存绑定配置
   * @param bindingCode 绑定码
   * @param config 配置信息
   * @param initConfig 初始配置（用于首次设置时的默认值）
   *
   * @throws Error 当绑定码不在允许列表中时抛出异常
   */
  saveConfig(
    bindingCode: string,
    config: Partial<BindingConfig>,
    initConfig?: BindingConfig
  ): void {
    this.ensureConfigDir();

    // 更新最后使用时间
    config.lastUsedAt = new Date().toISOString();

    const prevConfig = this.readConfig() || {};
    const existing = !!prevConfig[bindingCode];
    const canUpdate = (this.bindingCodes.has(bindingCode) && initConfig) || existing;

    if (canUpdate) {
      // 安全存储（仅当前用户可读）
      const configJson = JSON.stringify(
        {
          ...prevConfig,
          [bindingCode]: existing ? { ...prevConfig[bindingCode], ...config } : initConfig,
        },
        null,
        2
      );
      writeFileSync(this.bindingConfigPath, configJson, { mode: 0o600 });

      this.bindingCodes.delete(bindingCode);

      // 对 MCP 服务进行更新
      if (config.mcpServices) {
        const nextMcpServices = config.mcpServices;
        const prevMcpServices = prevConfig[bindingCode]?.mcpServices || {};

        const updatedMcpServices: MCPServiceConfig[] = [];
        const removedMcpServices: MCPServiceConfig[] = [];

        // TODO: 比较 mcpServices 和 prevConfig[bindingCode].mcpServices，找出新增和删除的服务
        Object.keys(nextMcpServices).forEach((key) => {
          if (!prevMcpServices[key]) {
            updatedMcpServices.push(nextMcpServices[key]);
          } else if (
            JSON.stringify(nextMcpServices[key]) !== JSON.stringify(prevMcpServices[key])
          ) {
            updatedMcpServices.push(nextMcpServices[key]);
          }
        });
        Object.keys(prevMcpServices).forEach((key) => {
          if (!nextMcpServices[key]) {
            removedMcpServices.push(prevMcpServices[key]);
          }
        });

        removedMcpServices.forEach((service) => {
          mcpConnector.removeService(bindingCode, service.name);
        });
        updatedMcpServices.forEach((service) => {
          mcpConnector.addService(bindingCode, service);
        });
      }
    } else {
      throw new Error(
        `Cannot update binding code: ${bindingCode} not found in active codes or existing config`
      );
    }
  }

  /**
   * 读取绑定配置
   */
  readConfig(): Record<string, BindingConfig> | null {
    if (!existsSync(this.bindingConfigPath)) {
      return null;
    }

    try {
      const configJson = readFileSync(this.bindingConfigPath, 'utf-8');
      const raw = JSON.parse(configJson) as Record<string, BindingConfig>;
      const next: Record<string, BindingConfig> = {};

      Object.keys(raw).forEach((k) => {
        next[k] = {
          ...raw[k],
          workspaceDir: raw[k].workspaceDir || this.getDefaultWorkspaceDir(k),
        };

        const workingDir = next[k].workspaceDir;
        if (workingDir && !existsSync(workingDir)) {
          mkdirSync(workingDir, { recursive: true });
        }
      });

      return next;
    } catch (error) {
      return null;
    }
  }

  /**
   * 读取绑定码（兼容旧接口）
   */
  read(): string[] {
    const config = this.readConfig();
    return Object.keys(config || {});
  }

  /**
   * 检查绑定配置是否存在
   */
  exists(): boolean {
    return existsSync(this.bindingConfigPath);
  }

  /**
   * 更新最后使用时间
   */
  updateLastUsedAt(): boolean {
    const config = this.readConfig();
    if (!config) {
      return false;
    }

    const lastUsedAt = new Date().toISOString();
    Object.values(config).forEach((value) => {
      this.saveConfig(value.bindingCode, { lastUsedAt });
    });

    return true;
  }

  /**
   * 删除绑定配置（解绑时调用）
   */
  delete(): boolean {
    if (!existsSync(this.bindingConfigPath)) {
      return false;
    }

    try {
      unlinkSync(this.bindingConfigPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取绑定配置文件路径
   */
  getBindingConfigPath(): string {
    return this.bindingConfigPath;
  }

  /**
   * 获取绑定码文件路径（兼容旧接口）
   */
  getBindingCodePath(): string {
    return this.bindingConfigPath;
  }

  /**
   * 获取指定 binding code 的 MCP 服务配置
   */
  getMCPServices(bindingCode: string): Record<string, MCPServiceConfig> {
    const config = this.readConfig();
    if (!config || !config[bindingCode]) {
      return {};
    }
    return config[bindingCode].mcpServices || {};
  }

  /**
   * 更新指定 binding code 的 MCP 服务配置
   */
  updateMCPServices(bindingCode: string, services: Record<string, MCPServiceConfig>): void {
    const config = this.readConfig();
    if (!config || !config[bindingCode]) {
      throw new Error(`Binding code not found: ${bindingCode}`);
    }

    config[bindingCode].mcpServices = services;
    config[bindingCode].lastUsedAt = new Date().toISOString();

    this.ensureConfigDir();
    const configJson = JSON.stringify(config, null, 2);
    writeFileSync(this.bindingConfigPath, configJson, { mode: 0o600 });
  }
}

// 导出单例实例
export const bindingCodeManager = new BindingCodeManager();
