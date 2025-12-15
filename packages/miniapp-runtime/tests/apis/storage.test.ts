import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MiniAppStorage, StorageConfig } from '../../src/apis/storage';
import { StorageBackend } from '../../src/apis/types';

describe('MiniAppStorage', () => {
  describe('Memory Backend', () => {
    let storage: MiniAppStorage;

    beforeEach(() => {
      storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 5 * 1024 * 1024, // 5MB
      });
    });

    it('应该正确存储和读取数据', async () => {
      await storage.setItem('key1', 'value1');
      const value = await storage.getItem('key1');
      expect(value).toBe('value1');
    });

    it('应该在键不存在时返回null', async () => {
      const value = await storage.getItem('nonexistent');
      expect(value).toBeNull();
    });

    it('应该正确删除数据', async () => {
      await storage.setItem('key1', 'value1');
      await storage.removeItem('key1');
      const value = await storage.getItem('key1');
      expect(value).toBeNull();
    });

    it('应该正确清空所有数据', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.clear();

      const value1 = await storage.getItem('key1');
      const value2 = await storage.getItem('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('应该正确返回所有键', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.setItem('key3', 'value3');

      const keys = await storage.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('应该正确计算配额使用情况', async () => {
      const data = 'x'.repeat(1024); // 1KB
      await storage.setItem('key1', data);

      const quota = await storage.getQuota();
      expect(quota.used).toBeGreaterThan(0);
      expect(quota.total).toBe(5 * 1024 * 1024);
      expect(quota.available).toBe(quota.total - quota.used);
    });

    it('应该在超出配额时抛出错误', async () => {
      const largeData = 'x'.repeat(6 * 1024 * 1024); // 6MB (超过5MB配额)

      await expect(
        storage.setItem('large', largeData)
      ).rejects.toThrow('Storage quota exceeded');
    });

    it('应该支持更新已存在的键', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key1', 'value2');

      const value = await storage.getItem('key1');
      expect(value).toBe('value2');
    });

    it('应该正确处理空字符串值', async () => {
      await storage.setItem('empty', '');
      const value = await storage.getItem('empty');
      expect(value).toBe('');
    });

    it('应该正确处理包含特殊字符的键', async () => {
      const specialKey = 'key:with:colons';
      await storage.setItem(specialKey, 'value');
      const value = await storage.getItem(specialKey);
      expect(value).toBe('value');
    });
  });

  describe('LocalStorage Backend', () => {
    let storage: MiniAppStorage;

    beforeEach(() => {
      // 清空 localStorage mock
      vi.clearAllMocks();
      (global.localStorage.getItem as any).mockReturnValue(null);
      (global.localStorage.setItem as any).mockImplementation(() => {});
      (global.localStorage.removeItem as any).mockImplementation(() => {});
      (global.localStorage.clear as any).mockImplementation(() => {});

      storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.LOCAL_STORAGE,
        quota: 5 * 1024 * 1024,
      });
    });

    it('应该使用正确的键前缀', async () => {
      await storage.setItem('key1', 'value1');

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'miniapp:test-app:key1',
        'value1'
      );
    });

    it('应该正确读取localStorage中的数据', async () => {
      (global.localStorage.getItem as any).mockReturnValue('stored-value');

      const value = await storage.getItem('key1');
      expect(value).toBe('stored-value');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('miniapp:test-app:key1');
    });

    it('应该正确删除localStorage中的数据', async () => {
      await storage.removeItem('key1');

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('miniapp:test-app:key1');
    });

    it('应该只清空当前应用的数据', async () => {
      // Mock localStorage.key 返回多个键
      const allKeys = [
        'miniapp:test-app:key1',
        'miniapp:test-app:key2',
        'miniapp:other-app:key1',
        'other:key',
      ];

      (global.localStorage.key as any).mockImplementation((index: number) => allKeys[index]);
      Object.defineProperty(global.localStorage, 'length', { value: allKeys.length, writable: true });

      await storage.clear();

      // 应该只删除 test-app 的键
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('miniapp:test-app:key1');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('miniapp:test-app:key2');
      expect(global.localStorage.removeItem).not.toHaveBeenCalledWith('miniapp:other-app:key1');
      expect(global.localStorage.removeItem).not.toHaveBeenCalledWith('other:key');
    });
  });

  describe('IndexedDB Backend', () => {
    let storage: MiniAppStorage;

    beforeEach(() => {
      storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.INDEXED_DB,
        quota: 50 * 1024 * 1024, // 50MB
      });

      // Mock IndexedDB
      const mockDB = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
            put: vi.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
            delete: vi.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
            clear: vi.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
            getAllKeys: vi.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
            }),
          }),
        }),
      };

      const mockRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB,
      };

      (global.indexedDB.open as any).mockReturnValue(mockRequest);
    });

    it('应该正确初始化IndexedDB', async () => {
      await storage.setItem('key1', 'value1');

      expect(global.indexedDB.open).toHaveBeenCalledWith(
        'miniapp-storage-test-app',
        1
      );
    });

    it('应该支持大数据存储', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB

      // IndexedDB 应该能处理大数据
      await expect(
        storage.setItem('large', largeData)
      ).resolves.not.toThrow();
    });
  });

  describe('配额管理', () => {
    it('应该正确计算字符串大小', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 1024,
      });

      const data = 'test'; // 4 bytes
      await storage.setItem('key', data);

      const quota = await storage.getQuota();
      expect(quota.used).toBeGreaterThan(0);
    });

    it('应该在删除数据后更新配额', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 10 * 1024,
      });

      const data = 'x'.repeat(1024);
      await storage.setItem('key1', data);

      const quotaBefore = await storage.getQuota();
      await storage.removeItem('key1');
      const quotaAfter = await storage.getQuota();

      expect(quotaAfter.used).toBeLessThan(quotaBefore.used);
    });

    it('应该在清空数据后重置配额', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 10 * 1024,
      });

      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.clear();

      const quota = await storage.getQuota();
      expect(quota.used).toBe(0);
    });
  });

  describe('并发操作', () => {
    it('应该正确处理并发写入', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 10 * 1024,
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storage.setItem(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      const keys = await storage.keys();
      expect(keys).toHaveLength(10);
    });

    it('应该正确处理并发读取', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 10 * 1024,
      });

      await storage.setItem('key1', 'value1');

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storage.getItem('key1'));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBe('value1');
      });
    });
  });

  describe('错误处理', () => {
    it('应该在键为空时抛出错误', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 1024,
      });

      await expect(storage.setItem('', 'value')).rejects.toThrow();
    });

    it('应该在值为null时抛出错误', async () => {
      const storage = new MiniAppStorage({
        appId: 'test-app',
        backend: StorageBackend.MEMORY,
        quota: 1024,
      });

      await expect(storage.setItem('key', null as any)).rejects.toThrow();
    });
  });
});
