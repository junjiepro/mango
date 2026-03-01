/**
 * File Watcher Service
 * 文件监听服务 - 监听工作目录文件变化并通知订阅者
 */

import { watch, FSWatcher, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { readdirSync } from 'fs';

/**
 * 文件变化事件类型
 */
export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

/**
 * 文件变化事件
 */
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  relativePath: string;
  timestamp: number;
}

/**
 * 文件变化回调
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * 监听器实例
 */
interface WatcherInstance {
  watcher: FSWatcher;
  callbacks: Set<FileChangeCallback>;
  watchPath: string;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

/**
 * 文件监听管理器
 */
class FileWatcherManager {
  private watchers: Map<string, WatcherInstance> = new Map();
  private debounceDelay = 100; // 防抖延迟 ms

  /**
   * 订阅目录变化
   */
  subscribe(watchPath: string, callback: FileChangeCallback): () => void {
    const key = watchPath;

    let instance = this.watchers.get(key);

    if (!instance) {
      instance = this.createWatcher(watchPath);
      this.watchers.set(key, instance);
    }

    instance.callbacks.add(callback);

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(watchPath, callback);
    };
  }

  /**
   * 取消订阅
   */
  unsubscribe(watchPath: string, callback: FileChangeCallback): void {
    const key = watchPath;
    const instance = this.watchers.get(key);

    if (!instance) return;

    instance.callbacks.delete(callback);

    // 如果没有订阅者了，关闭监听器
    if (instance.callbacks.size === 0) {
      this.closeWatcher(key);
    }
  }

  /**
   * 创建监听器
   */
  private createWatcher(watchPath: string): WatcherInstance {
    const callbacks = new Set<FileChangeCallback>();
    const debounceTimers = new Map<string, NodeJS.Timeout>();

    // 递归监听目录
    const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = join(watchPath, filename);
      const relativePath = filename;

      // 防抖处理
      const timerKey = `${eventType}:${fullPath}`;
      const existingTimer = debounceTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      debounceTimers.set(timerKey, setTimeout(() => {
        debounceTimers.delete(timerKey);

        // 判断变化类型
        let changeType: FileChangeType;
        try {
          const stat = statSync(fullPath);
          if (eventType === 'rename') {
            changeType = stat.isDirectory() ? 'addDir' : 'add';
          } else {
            changeType = 'change';
          }
        } catch {
          // 文件不存在，说明被删除
          changeType = eventType === 'rename' ? 'unlink' : 'unlink';
        }

        const event: FileChangeEvent = {
          type: changeType,
          path: fullPath,
          relativePath,
          timestamp: Date.now(),
        };

        // 通知所有订阅者
        callbacks.forEach(cb => {
          try {
            cb(event);
          } catch (err) {
            console.error('[FileWatcher] Callback error:', err);
          }
        });
      }, this.debounceDelay));
    });

    watcher.on('error', (err) => {
      console.error('[FileWatcher] Watcher error:', err);
    });

    console.log(`[FileWatcher] Started watching: ${watchPath}`);

    return {
      watcher,
      callbacks,
      watchPath,
      debounceTimers,
    };
  }

  /**
   * 关闭监听器
   */
  private closeWatcher(key: string): void {
    const instance = this.watchers.get(key);
    if (!instance) return;

    // 清理所有防抖定时器
    instance.debounceTimers.forEach(timer => clearTimeout(timer));
    instance.debounceTimers.clear();

    // 关闭监听器
    instance.watcher.close();
    this.watchers.delete(key);

    console.log(`[FileWatcher] Stopped watching: ${instance.watchPath}`);
  }

  /**
   * 关闭所有监听器
   */
  closeAll(): void {
    this.watchers.forEach((_, key) => {
      this.closeWatcher(key);
    });
  }
}

// 导出单例
export const fileWatcherManager = new FileWatcherManager();
