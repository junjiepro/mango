/**
 * Binding Code Manager
 * 正式绑定码管理器
 *
 * 管理正式绑定码的生成、存储和读取
 * 正式绑定码用于长期 API 认证
 */

import { randomBytes } from 'crypto';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  readdirSync,
  statSync,
  cpSync,
  rmSync,
} from 'fs';
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
  /** 绑定数据目录（可选，用于自定义数据存储位置） */
  bindingDataDir?: string;
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
   * 获取 binding 目录前缀（前8位）
   */
  private getBindingPrefix(bindingCode: string): string {
    return bindingCode.substring(0, 8);
  }

  /**
   * 获取 binding 根目录
   * @param bindingCode 绑定码
   * @returns binding 根目录路径
   */
  getBindingDir(bindingCode: string): string {
    const prefix = this.getBindingPrefix(bindingCode);
    return join(this.configDir, 'bindings', prefix);
  }

  /**
   * 获取 binding 的工作空间目录
   * @param bindingCode 绑定码
   * @returns workspace 子目录路径
   */
  getBindingWorkspaceDir(bindingCode: string): string {
    return join(this.getBindingDir(bindingCode), 'workspace');
  }

  /**
   * 获取 binding 的数据目录
   * @param bindingCode 绑定码
   * @returns data 子目录路径
   */
  getBindingDataDir(bindingCode: string): string {
    return join(this.getBindingDir(bindingCode), 'data');
  }

  /**
   * 获取默认工作空间（使用新的目录结构）
   * @param bindingCode
   * @returns
   */
  private getDefaultWorkspaceDir(bindingCode: string): string {
    return this.getBindingWorkspaceDir(bindingCode);
  }

  /**
   * 获取旧版工作空间目录路径（用于迁移检测）
   */
  private getOldWorkspaceDir(bindingCode: string): string {
    const prefix = this.getBindingPrefix(bindingCode);
    return join(this.configDir, 'workspaces', prefix);
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
      const prevBindingConfig = prevConfig[bindingCode];

      // 检查目录是否变化，需要迁移
      if (existing && prevBindingConfig) {
        this.handleDirectoryMigration(bindingCode, prevBindingConfig, config);
      }

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
      let needsSave = false;

      Object.keys(raw).forEach((k) => {
        // 检查是否需要迁移旧目录结构
        const migrated = this.migrateOldStructureIfNeeded(k);
        if (migrated) {
          needsSave = true;
        }

        // 确保 binding 数据目录存在
        const dataDir = this.getBindingDataDir(k);
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true });
        }

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

  /**
   * 处理目录迁移（仅当 bindingDataDir 变化时迁移内容）
   */
  private handleDirectoryMigration(
    bindingCode: string,
    prevConfig: BindingConfig,
    newConfig: Partial<BindingConfig>
  ): void {
    const defaultDataDir = this.getBindingDataDir(bindingCode);

    // 仅当 bindingDataDir 变化时，迁移内容并删除旧目录
    if (newConfig.bindingDataDir && newConfig.bindingDataDir !== prevConfig.bindingDataDir) {
      const oldDir = prevConfig.bindingDataDir || defaultDataDir;
      const newDir = newConfig.bindingDataDir;

      if (existsSync(oldDir) && oldDir !== newDir) {
        console.log(`Migrating data dir: ${oldDir} -> ${newDir}`);
        this.migrateDirectory(oldDir, newDir, true);
      } else if (!existsSync(newDir)) {
        mkdirSync(newDir, { recursive: true });
      }
    }

    // workspaceDir 变化时，仅确保新目录存在，不迁移内容
    if (newConfig.workspaceDir && newConfig.workspaceDir !== prevConfig.workspaceDir) {
      const newDir = newConfig.workspaceDir;
      if (!existsSync(newDir)) {
        mkdirSync(newDir, { recursive: true });
      }
    }
  }

  /**
   * 迁移目录（复制内容到新位置，可选删除旧目录）
   */
  private migrateDirectory(srcDir: string, destDir: string, deleteOld: boolean = false): void {
    if (!existsSync(srcDir)) return;

    // 确保目标目录存在
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    // 复制内容
    this.copyDirContents(srcDir, destDir);
    console.log(`Directory migration completed: ${srcDir} -> ${destDir}`);

    // 删除旧目录
    if (deleteOld) {
      try {
        rmSync(srcDir, { recursive: true, force: true });
        console.log(`Old directory removed: ${srcDir}`);
      } catch (err) {
        console.error(`Failed to remove old directory: ${srcDir}`, err);
      }
    }
  }

  /**
   * 检查并迁移旧目录结构到新结构
   * @param bindingCode 绑定码
   * @returns 是否执行了迁移
   */
  private migrateOldStructureIfNeeded(bindingCode: string): boolean {
    const oldWorkspaceDir = this.getOldWorkspaceDir(bindingCode);
    const newBindingDir = this.getBindingDir(bindingCode);
    const newWorkspaceDir = this.getBindingWorkspaceDir(bindingCode);
    const newDataDir = this.getBindingDataDir(bindingCode);

    // 如果旧目录存在且新目录不存在，执行迁移
    if (existsSync(oldWorkspaceDir) && !existsSync(newBindingDir)) {
      console.log(`Migrating binding directory: ${oldWorkspaceDir} -> ${newBindingDir}`);

      try {
        // 创建新目录结构
        mkdirSync(newWorkspaceDir, { recursive: true });
        mkdirSync(newDataDir, { recursive: true });

        // 复制旧工作空间内容到新位置
        this.copyDirContents(oldWorkspaceDir, newWorkspaceDir);

        console.log(`Migration completed for binding: ${bindingCode.substring(0, 8)}...`);
        return true;
      } catch (error) {
        console.error(`Migration failed for binding ${bindingCode.substring(0, 8)}:`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * 复制目录内容（合并策略：不覆盖已存在的文件）
   */
  private copyDirContents(srcDir: string, destDir: string): void {
    if (!existsSync(srcDir)) return;

    const entries = readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);

      // 如果目标已存在，跳过（合并策略）
      if (existsSync(destPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        cpSync(srcPath, destPath, { recursive: true });
      } else {
        cpSync(srcPath, destPath);
      }
    }
  }

  /**
   * 迁移 binding 目录到新位置
   * @param bindingCode 绑定码
   * @param newBaseDir 新的基础目录
   */
  async migrateBindingDir(bindingCode: string, newBaseDir: string): Promise<void> {
    const oldDir = this.getBindingDir(bindingCode);

    if (!existsSync(oldDir)) {
      // 如果旧目录不存在，直接创建新目录结构
      mkdirSync(join(newBaseDir, 'workspace'), { recursive: true });
      mkdirSync(join(newBaseDir, 'data'), { recursive: true });
      return;
    }

    // 合并目录内容
    this.mergeDirectories(oldDir, newBaseDir);

    // 更新配置
    this.updateBindingDataDir(bindingCode, newBaseDir);
  }

  /**
   * 合并两个目录（目标目录已有文件保留）
   */
  private mergeDirectories(srcDir: string, destDir: string): void {
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    const entries = readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);

      if (entry.isDirectory()) {
        this.mergeDirectories(srcPath, destPath);
      } else if (!existsSync(destPath)) {
        cpSync(srcPath, destPath);
      }
    }
  }

  /**
   * 更新 binding 的数据目录配置
   */
  private updateBindingDataDir(bindingCode: string, newDataDir: string): void {
    if (!existsSync(this.bindingConfigPath)) return;

    try {
      const configJson = readFileSync(this.bindingConfigPath, 'utf-8');
      const config = JSON.parse(configJson) as Record<string, BindingConfig>;

      if (config[bindingCode]) {
        config[bindingCode].bindingDataDir = newDataDir;
        config[bindingCode].workspaceDir = join(newDataDir, 'workspace');
        config[bindingCode].lastUsedAt = new Date().toISOString();

        writeFileSync(this.bindingConfigPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      }
    } catch (error) {
      console.error('Failed to update binding data dir:', error);
    }
  }
}

// 导出单例实例
export const bindingCodeManager = new BindingCodeManager();
