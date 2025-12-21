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
  /** 其他元数据 */
  metadata?: {
    platform: string;
    hostname: string;
    arch: string;
  };
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
      return JSON.parse(configJson) as Record<string, BindingConfig>;
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
      value.lastUsedAt = lastUsedAt;
      this.saveConfig(value.bindingCode, value);
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
}

// 导出单例实例
export const bindingCodeManager = new BindingCodeManager();
