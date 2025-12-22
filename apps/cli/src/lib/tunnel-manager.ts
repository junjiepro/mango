/**
 * Cloudflare Tunnel Manager
 * 管理Cloudflare Tunnel的创建和生命周期
 */

import { spawn, ChildProcess } from 'child_process';
import { formatter } from './formatter.js';

export class TunnelManager {
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;
  private urlChangeCallback: ((newUrl: string) => void) | null = null;

  /**
   * 创建Cloudflare Tunnel
   */
  async createTunnel(localPort: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // 启动 cloudflared tunnel
      this.process = spawn('cloudflared', [
        'tunnel',
        '--url',
        `http://localhost:${localPort}`,
        '--no-autoupdate',
        '--metrics',
        'localhost:0', // 禁用 metrics 端口
      ]);

      // 解析输出获取公网 URL
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        formatter.debug(`Tunnel output: ${output}`);

        // 匹配 Cloudflare Tunnel URL
        const match = output.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (match) {
          const url = match[0];

          // 检测 URL 变化
          if (this.tunnelUrl && this.tunnelUrl !== url) {
            formatter.warning(`Tunnel URL changed: ${this.tunnelUrl} -> ${url}`);
            this.tunnelUrl = url;

            // 触发回调
            if (this.urlChangeCallback) {
              this.urlChangeCallback(url);
            }
          } else if (!this.tunnelUrl) {
            // 首次获取 URL
            this.tunnelUrl = url;
            resolve(url);
          }
        }
      });

      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        formatter.debug(`Tunnel error: ${output}`);
      });

      this.process.on('error', (error) => {
        reject(new Error(`Failed to start tunnel: ${error.message}`));
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Tunnel process exited with code ${code}`));
        }
      });

      // 超时处理（30秒）
      setTimeout(() => {
        if (!this.tunnelUrl) {
          this.cleanup();
          reject(
            new Error(
              'Tunnel creation timeout. Please check:\n' +
                '  1. cloudflared is installed: cloudflared --version\n' +
                '  2. Network connection is available\n' +
                '  3. Firewall settings allow cloudflared'
            )
          );
        }
      }, 30000);
    });
  }

  /**
   * 获取Tunnel URL
   */
  getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  /**
   * 设置 URL 变化回调
   */
  onUrlChange(callback: (newUrl: string) => void): void {
    this.urlChangeCallback = callback;
  }

  /**
   * 清理Tunnel进程
   */
  cleanup(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.tunnelUrl = null;
      this.urlChangeCallback = null;
    }
  }

  /**
   * 检查cloudflared是否已安装
   */
  async checkCloudflared(): Promise<boolean> {
    return new Promise((resolve) => {
      const check = spawn('cloudflared', ['--version']);

      check.on('error', () => {
        resolve(false);
      });

      check.on('exit', (code) => {
        resolve(code === 0);
      });

      // 超时处理
      setTimeout(() => {
        check.kill();
        resolve(false);
      }, 5000);
    });
  }
}

// 导出单例实例
export const tunnelManager = new TunnelManager();
