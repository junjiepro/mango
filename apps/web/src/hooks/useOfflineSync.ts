/**
 * useOfflineSync Hook
 * Handles offline detection and automatic sync
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getOfflineQueue } from '@/lib/offline-queue';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
}

export interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
  onSyncComplete?: (result: { success: number; failed: number }) => void;
  onSyncError?: (error: Error) => void;
}

export function useOfflineSync({
  autoSync = true,
  syncInterval = 30000, // 30 seconds
  onSyncComplete,
  onSyncError,
}: UseOfflineSyncOptions = {}) {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offlineQueue = getOfflineQueue();

  /**
   * Update queue counts
   */
  const updateCounts = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      pendingCount: offlineQueue.pendingCount(),
      failedCount: offlineQueue.failedCount(),
    }));
  }, [offlineQueue]);

  /**
   * Perform sync
   */
  const sync = useCallback(async () => {
    if (status.isSyncing || !status.isOnline) {
      return;
    }

    setStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await offlineQueue.syncAll();

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));

      updateCounts();

      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, isSyncing: false }));

      if (onSyncError && error instanceof Error) {
        onSyncError(error);
      }
    }
  }, [status.isSyncing, status.isOnline, offlineQueue, updateCounts, onSyncComplete, onSyncError]);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    console.log('Network connection restored');
    setStatus((prev) => ({ ...prev, isOnline: true }));

    // Trigger sync when coming back online
    if (autoSync) {
      setTimeout(() => {
        sync();
      }, 1000); // Wait 1 second before syncing
    }
  }, [autoSync, sync]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    console.log('Network connection lost');
    setStatus((prev) => ({ ...prev, isOnline: false }));
  }, []);

  /**
   * Handle visibility change (tab focus)
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && status.isOnline && autoSync) {
      // Sync when tab becomes visible
      sync();
    }
  }, [status.isOnline, autoSync, sync]);

  /**
   * Setup event listeners and intervals
   */
  useEffect(() => {
    // Online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-sync interval
    if (autoSync && status.isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (offlineQueue.pendingCount() > 0) {
          sync();
        }
      }, syncInterval);
    }

    // Initial count update
    updateCounts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [
    handleOnline,
    handleOffline,
    handleVisibilityChange,
    autoSync,
    status.isOnline,
    syncInterval,
    sync,
    offlineQueue,
    updateCounts,
  ]);

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(async () => {
    await sync();
  }, [sync]);

  /**
   * Clear failed messages
   */
  const clearFailed = useCallback(() => {
    const queue = getOfflineQueue();
    const failed = queue.getQueue().filter((msg) => msg.status === 'failed');
    failed.forEach((msg) => queue.removeMessage(msg.tempId));
    updateCounts();
  }, [updateCounts]);

  /**
   * Retry failed messages
   */
  const retryFailed = useCallback(async () => {
    const queue = getOfflineQueue();
    const failed = queue.getQueue().filter((msg) => msg.status === 'failed');

    // Reset retry count and status
    failed.forEach((msg) => {
      msg.retryCount = 0;
      queue.updateMessageStatus(msg.tempId, 'pending');
    });

    // Trigger sync
    await sync();
  }, [sync]);

  return {
    status,
    sync: triggerSync,
    clearFailed,
    retryFailed,
  };
}
