/**
 * MiniApp Storage API Implementation
 * T081: Implement isolated storage for MiniApps
 */

import { StorageAPI, Permission } from './types';
import { PermissionManager } from '../core/permissions';

/**
 * Storage backend type
 */
export enum StorageBackend {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  INDEXED_DB = 'indexedDB',
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  appId: string;
  backend: StorageBackend;
  quota?: number; // in bytes (alias for maxSize)
  maxSize?: number; // in bytes (deprecated, use quota)
  permissionManager?: PermissionManager; // optional
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  used: number;
  available: number;
  total: number;
}

/**
 * MiniApp Storage Implementation
 * Provides isolated storage with quota management
 */
export class MiniAppStorage implements StorageAPI {
  private config: StorageConfig;
  private prefix: string;
  private memoryStore: Map<string, string>;

  constructor(config: StorageConfig) {
    const quota = config.quota || config.maxSize || 5 * 1024 * 1024; // 5MB default
    this.config = {
      ...config,
      quota,
      maxSize: quota,
    };
    this.prefix = `miniapp:${config.appId}:`;
    this.memoryStore = new Map();
  }

  /**
   * Get item from storage
   */
  async getItem(key: string): Promise<string | null> {
    this.validateKey(key);
    await this.checkPermission();

    const fullKey = this.getFullKey(key);

    switch (this.config.backend) {
      case StorageBackend.MEMORY:
        return this.getFromMemory(fullKey);

      case StorageBackend.LOCAL_STORAGE:
        return this.getFromLocalStorage(fullKey);

      case StorageBackend.INDEXED_DB:
        return this.getFromIndexedDB(fullKey);

      default:
        throw new Error(`Unsupported storage backend: ${this.config.backend}`);
    }
  }

  /**
   * Set item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    await this.checkPermission();

    const fullKey = this.getFullKey(key);

    // Check quota
    await this.checkQuota(value.length);

    switch (this.config.backend) {
      case StorageBackend.MEMORY:
        this.memoryStore.set(fullKey, value);
        break;

      case StorageBackend.LOCAL_STORAGE:
        this.setToLocalStorage(fullKey, value);
        break;

      case StorageBackend.INDEXED_DB:
        await this.setToIndexedDB(fullKey, value);
        break;

      default:
        throw new Error(`Unsupported storage backend: ${this.config.backend}`);
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    this.validateKey(key);
    await this.checkPermission();

    const fullKey = this.getFullKey(key);

    switch (this.config.backend) {
      case StorageBackend.MEMORY:
        this.memoryStore.delete(fullKey);
        break;

      case StorageBackend.LOCAL_STORAGE:
        this.removeFromLocalStorage(fullKey);
        break;

      case StorageBackend.INDEXED_DB:
        await this.removeFromIndexedDB(fullKey);
        break;

      default:
        throw new Error(`Unsupported storage backend: ${this.config.backend}`);
    }
  }

  /**
   * Clear all storage for this MiniApp
   */
  async clear(): Promise<void> {
    await this.checkPermission();

    switch (this.config.backend) {
      case StorageBackend.MEMORY:
        this.clearMemory();
        break;

      case StorageBackend.LOCAL_STORAGE:
        this.clearLocalStorage();
        break;

      case StorageBackend.INDEXED_DB:
        await this.clearIndexedDB();
        break;

      default:
        throw new Error(`Unsupported storage backend: ${this.config.backend}`);
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    await this.checkPermission();

    let fullKeys: string[];

    switch (this.config.backend) {
      case StorageBackend.MEMORY:
        fullKeys = Array.from(this.memoryStore.keys());
        break;

      case StorageBackend.LOCAL_STORAGE:
        fullKeys = this.getKeysFromLocalStorage();
        break;

      case StorageBackend.INDEXED_DB:
        fullKeys = await this.getKeysFromIndexedDB();
        break;

      default:
        throw new Error(`Unsupported storage backend: ${this.config.backend}`);
    }

    // Remove prefix from keys
    return fullKeys.map(key => key.substring(this.prefix.length));
  }

  /**
   * Get storage quota information
   */
  async getQuota(): Promise<StorageQuota> {
    const used = await this.getUsedSpace();
    const total = this.config.maxSize!;
    const available = total - used;

    return {
      used,
      available,
      total,
    };
  }

  /**
   * Get used storage space
   */
  private async getUsedSpace(): Promise<number> {
    const keys = await this.keys();
    let total = 0;

    for (const key of keys) {
      const value = await this.getItem(key);
      if (value) {
        total += value.length;
      }
    }

    return total;
  }

  /**
   * Check storage quota
   */
  private async checkQuota(additionalSize: number): Promise<void> {
    const quota = await this.getQuota();

    if (quota.available < additionalSize) {
      throw new Error('Storage quota exceeded');
    }
  }

  /**
   * Check storage permission
   */
  private async checkPermission(): Promise<void> {
    // Permission check is optional
    if (!this.config.permissionManager) {
      return;
    }

    const permission = this.config.backend === StorageBackend.MEMORY
      ? Permission.STORAGE_LOCAL
      : Permission.STORAGE_PERSISTENT;

    if (!this.config.permissionManager.isGranted(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  /**
   * Validate key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key');
    }

    if (key.length > 256) {
      throw new Error('Key too long (max 256 characters)');
    }
  }

  /**
   * Validate value
   */
  private validateValue(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }

    if (value.length > 1024 * 1024) { // 1MB per item
      throw new Error('Value too large (max 1MB per item)');
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return this.prefix + key;
  }

  // Memory storage methods
  private clearMemory(): void {
    const keysToDelete: string[] = [];
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(this.prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.memoryStore.delete(key));
  }

  /**
   * Get item from memory (handles empty strings correctly)
   */
  private getFromMemory(key: string): string | null {
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key) || '';
    }
    return null;
  }

  // LocalStorage methods
  private getFromLocalStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    }
  }

  private setToLocalStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
    }
  }

  private clearLocalStorage(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  private getKeysFromLocalStorage(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  // IndexedDB methods
  private async getFromIndexedDB(key: string): Promise<string | null> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async setToIndexedDB(key: string, value: string): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getKeysFromIndexedDB(): Promise<string[]> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        resolve(keys.filter(key => key.startsWith(this.prefix)));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MiniAppStorage', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

/**
 * Create a storage instance
 */
export function createStorage(config: StorageConfig): MiniAppStorage {
  return new MiniAppStorage(config);
}
