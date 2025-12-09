/**
 * useTaskMonitor Hook
 * Monitors task status and handles reconnection
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Task {
  id: string;
  user_id: string;
  conversation_id?: string;
  message_id?: string;
  title: string;
  description?: string;
  task_type: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error_message?: string;
  metrics?: {
    start_time?: string;
    end_time?: string;
    duration_ms?: number;
    tokens_used?: number;
    tool_call_count?: number;
  };
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface TaskUpdate {
  taskId: string;
  status: Task['status'];
  progress: number;
  result?: any;
  error?: string;
}

export interface UseTaskMonitorOptions {
  taskId: string;
  onUpdate?: (update: TaskUpdate) => void;
  onComplete?: (task: Task) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number; // milliseconds
}

export function useTaskMonitor({
  taskId,
  onUpdate,
  onComplete,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseTaskMonitorOptions) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Load initial task data
  const loadTask = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setTask(data);

      // If task is already completed or failed, no need to monitor
      if (data.status === 'completed' || data.status === 'failed') {
        if (data.status === 'completed' && onComplete) {
          onComplete(data);
        } else if (data.status === 'failed' && onError) {
          onError(data.error_message || 'Task failed');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, supabase, onComplete, onError]);

  // Setup realtime subscription
  const setupSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`task:${taskId}`)
      .on('broadcast', { event: 'task_update' }, (payload) => {
        const update = payload.payload as TaskUpdate;

        // Update local state
        setTask((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: update.status,
            progress: update.progress,
            result: update.result || prev.result,
            error_message: update.error || prev.error_message,
          };
        });

        // Call callbacks
        if (onUpdate) {
          onUpdate(update);
        }

        if (update.status === 'completed' && onComplete && task) {
          onComplete({
            ...task,
            status: 'completed',
            progress: 100,
            result: update.result,
          });
        }

        if (update.status === 'failed' && onError) {
          onError(update.error || 'Task failed');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);

          // Auto-reconnect
          if (autoReconnect && !isUnmountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Reconnecting to task channel...');
              setupSubscription();
            }, reconnectInterval);
          }
        }
      });

    channelRef.current = channel;
  }, [taskId, supabase, onUpdate, onComplete, onError, autoReconnect, reconnectInterval, task]);

  // Initialize
  useEffect(() => {
    isUnmountedRef.current = false;
    loadTask();
    setupSubscription();

    return () => {
      isUnmountedRef.current = true;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [loadTask, setupSubscription, supabase]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await loadTask();
  }, [loadTask]);

  // Cancel task
  const cancel = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (updateError) {
        throw updateError;
      }

      await loadTask();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel task';
      setError(errorMessage);
      throw err;
    }
  }, [taskId, supabase, loadTask]);

  return {
    task,
    loading,
    error,
    isConnected,
    refresh,
    cancel,
  };
}
