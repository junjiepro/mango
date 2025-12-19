/**
 * Port Utilities
 * 端口可用性检查和自动分配工具
 */

import { createServer } from 'net';

/**
 * 检查端口是否可用
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * 查找可用端口
 * @param preferredPort 首选端口
 * @param maxRetries 最大重试次数
 */
export async function findAvailablePort(
  preferredPort: number,
  maxRetries: number = 10
): Promise<number> {
  // 首先尝试首选端口
  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  // 如果首选端口不可用，尝试随机端口
  for (let i = 0; i < maxRetries; i++) {
    const randomPort = Math.floor(Math.random() * (65535 - 3000) + 3000);
    if (await isPortAvailable(randomPort)) {
      return randomPort;
    }
  }

  throw new Error(`Failed to find available port after ${maxRetries} attempts`);
}

/**
 * 获取随机可用端口（使用系统分配）
 */
export function getRandomAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', (err) => {
      reject(err);
    });

    server.once('listening', () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        server.close(() => {
          resolve(port);
        });
      } else {
        server.close();
        reject(new Error('Failed to get port from server address'));
      }
    });

    // 监听端口 0 会让系统自动分配一个可用端口
    server.listen(0);
  });
}
