/**
 * useFileTreeCache Hook
 * 文件树缓存管理 - 优化文件浏览器性能
 *
 * 功能:
 * - 缓存已加载的目录结构
 * - 支持增量更新和失效策略
 * - 减少不必要的网络请求
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileNode } from '@/hooks/useDeviceClient';

interface CacheEntry {
  data: FileNode[];
  timestamp: number;
  etag?: string; // 用于内容变更检测
}

interface FileTreeCacheOptions {
  maxAge?: number; // 缓存最大有效期(毫秒),默认5分钟
  maxSize?: number; // 最大缓存条目数,默认100
}

export function useFileTreeCache(options: FileTreeCacheOptions = {}) {
  const { maxAge = 5 * 60 * 1000, maxSize = 100 } = options;

  // 使用 Map 存储缓存,key为路径,value为缓存条目
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [cacheVersion, setCacheVersion] = useState(0);

  /**
   * 获取缓存数据
   */
  const get = useCallback(
    (path: string): FileNode[] | null => {
      const entry = cacheRef.current.get(path);

      if (!entry) {
        return null;
      }

      // 检查缓存是否过期
      const now = Date.now();
      if (now - entry.timestamp > maxAge) {
        cacheRef.current.delete(path);
        return null;
      }

      return entry.data;
    },
    [maxAge]
  );

  /**
   * 设置缓存数据
   */
  const set = useCallback(
    (path: string, data: FileNode[], etag?: string) => {
      // 如果缓存已满,删除最旧的条目
      if (cacheRef.current.size >= maxSize) {
        const oldestKey = Array.from(cacheRef.current.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];

        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      cacheRef.current.set(path, {
        data,
        timestamp: Date.now(),
        etag,
      });

      // 触发重新渲染
      setCacheVersion((v) => v + 1);
    },
    [maxSize]
  );

  /**
   * 使指定路径的缓存失效
   */
  const invalidate = useCallback((path: string) => {
    cacheRef.current.delete(path);
    setCacheVersion((v) => v + 1);
  }, []);

  /**
   * 使所有缓存失效
   */
  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
    setCacheVersion((v) => v + 1);
  }, []);

  /**
   * 检查缓存是否存在且有效
   */
  const has = useCallback(
    (path: string): boolean => {
      const entry = cacheRef.current.get(path);
      if (!entry) return false;

      const now = Date.now();
      return now - entry.timestamp <= maxAge;
    },
    [maxAge]
  );

  /**
   * 获取缓存的ETag
   */
  const getETag = useCallback((path: string): string | undefined => {
    return cacheRef.current.get(path)?.etag;
  }, []);

  /**
   * 批量预加载子目录
   */
  const prefetch = useCallback(
    async (
      paths: string[],
      loader: (path: string) => Promise<{ files: FileNode[]; etag?: string }>
    ) => {
      const promises = paths
        .filter((path) => !has(path))
        .map(async (path) => {
          try {
            const result = await loader(path);
            set(path, result.files, result.etag);
          } catch (error) {
            console.error(`Failed to prefetch ${path}:`, error);
          }
        });

      await Promise.all(promises);
    },
    [has, set]
  );

  return {
    get,
    set,
    invalidate,
    invalidateAll,
    has,
    getETag,
    prefetch,
    cacheVersion, // 用于触发依赖此缓存的组件重新渲染
  };
}
