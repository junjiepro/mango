/**
 * useFileContentCache Hook
 * 文件内容缓存管理 - 优化编辑器性能
 *
 * 功能:
 * - 缓存已加载的文件内容
 * - 支持内容变更检测(基于修改时间或哈希)
 * - Monaco Editor模型复用
 * - 减少重复的文件读取请求
 */

'use client';

import { useState, useCallback, useRef } from 'react';

interface FileContentEntry {
  content: string;
  timestamp: number;
  modified?: string; // 文件修改时间
  hash?: string; // 内容哈希值
  isDirty?: boolean; // 是否有未保存的编辑
  editedContent?: string; // 编辑后的内容(未保存)
}

interface FileContentCacheOptions {
  maxAge?: number; // 缓存最大有效期(毫秒),默认10分钟
  maxSize?: number; // 最大缓存条目数,默认50
}

export function useFileContentCache(options: FileContentCacheOptions = {}) {
  const { maxAge = 10 * 60 * 1000, maxSize = 50 } = options;

  const cacheRef = useRef<Map<string, FileContentEntry>>(new Map());
  const [cacheVersion, setCacheVersion] = useState(0);

  /**
   * 获取缓存的文件内容
   */
  const get = useCallback(
    (filePath: string): string | null => {
      const entry = cacheRef.current.get(filePath);

      if (!entry) {
        return null;
      }

      // 检查缓存是否过期
      const now = Date.now();
      if (now - entry.timestamp > maxAge) {
        cacheRef.current.delete(filePath);
        return null;
      }

      return entry.content;
    },
    [maxAge]
  );

  /**
   * 设置缓存的文件内容
   */
  const set = useCallback(
    (filePath: string, content: string, modified?: string, hash?: string) => {
      // 如果缓存已满,删除最旧的条目
      if (cacheRef.current.size >= maxSize) {
        const oldestKey = Array.from(cacheRef.current.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];

        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      cacheRef.current.set(filePath, {
        content,
        timestamp: Date.now(),
        modified,
        hash,
      });

      setCacheVersion((v) => v + 1);
    },
    [maxSize]
  );

  /**
   * 检查文件是否需要重新加载
   * 通过比较修改时间或哈希值判断
   */
  const needsReload = useCallback((filePath: string, modified?: string, hash?: string): boolean => {
    const entry = cacheRef.current.get(filePath);

    if (!entry) {
      return true;
    }

    // 检查缓存是否过期
    const now = Date.now();
    if (now - entry.timestamp > maxAge) {
      return true;
    }

    // 如果提供了修改时间,比较修改时间
    if (modified && entry.modified && modified !== entry.modified) {
      return true;
    }

    // 如果提供了哈希值,比较哈希值
    if (hash && entry.hash && hash !== entry.hash) {
      return true;
    }

    return false;
  }, [maxAge]);

  /**
   * 使指定文件的缓存失效
   */
  const invalidate = useCallback((filePath: string) => {
    cacheRef.current.delete(filePath);
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
    (filePath: string): boolean => {
      const entry = cacheRef.current.get(filePath);
      if (!entry) return false;

      const now = Date.now();
      return now - entry.timestamp <= maxAge;
    },
    [maxAge]
  );

  /**
   * 获取缓存统计信息
   */
  const getStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize,
      entries: Array.from(cacheRef.current.entries()).map(([path, entry]) => ({
        path,
        age: Date.now() - entry.timestamp,
        size: entry.content.length,
      })),
    };
  }, [maxSize]);

  return {
    get,
    set,
    needsReload,
    invalidate,
    invalidateAll,
    has,
    getStats,
    cacheVersion,
  };
}
