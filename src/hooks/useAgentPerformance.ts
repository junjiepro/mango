/**
 * Agent 性能监控 React Hook
 * 提供组件级别的性能监控和优化工具
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { performanceMonitor, ClientPerformanceTracker } from '@/lib/performance/agent-performance';

// Hook 类型定义
interface PerformanceMetrics {
  componentMount: number;
  renderTime: number;
  interactionLatency: number;
  memoryUsage?: number;
}

interface UsePerformanceOptions {
  trackComponentMount?: boolean;
  trackRenderTime?: boolean;
  trackInteractions?: boolean;
  trackMemoryUsage?: boolean;
  componentName?: string;
  sampleRate?: number;
}

// 性能监控 Hook
export function useAgentPerformance(options: UsePerformanceOptions = {}) {
  const {
    trackComponentMount = true,
    trackRenderTime = true,
    trackInteractions = true,
    trackMemoryUsage = false,
    componentName = 'UnknownComponent',
    sampleRate = 1.0
  } = options;

  const mountTimeRef = useRef<number>();
  const renderStartRef = useRef<number>();
  const trackerRef = useRef<ClientPerformanceTracker>();
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  // 初始化性能追踪器
  useEffect(() => {
    if (!trackerRef.current) {
      trackerRef.current = new ClientPerformanceTracker();
    }

    // 记录组件挂载时间
    if (trackComponentMount) {
      mountTimeRef.current = performance.now();
    }

    return () => {
      // 组件卸载时记录生命周期指标
      if (mountTimeRef.current && trackComponentMount) {
        const mountDuration = performance.now() - mountTimeRef.current;
        recordMetric('component_lifecycle', mountDuration);
      }
    };
  }, [trackComponentMount]);

  // 渲染性能监控
  useEffect(() => {
    if (trackRenderTime) {
      renderStartRef.current = performance.now();
    }
  });

  useEffect(() => {
    if (trackRenderTime && renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;
      recordMetric('render_time', renderTime);
      setMetrics(prev => ({ ...prev, renderTime }));
    }
  });

  // 内存使用监控
  useEffect(() => {
    if (trackMemoryUsage && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  });

  // 记录指标的内部函数
  const recordMetric = useCallback((metricName: string, value: number, additionalData?: any) => {
    // 采样控制
    if (Math.random() > sampleRate) return;

    performanceMonitor.recordMetric({
      timestamp: Date.now(),
      page: window.location.pathname,
      metrics: {
        [metricName]: value,
        ...additionalData
      },
      user_agent: navigator.userAgent
    });
  }, [sampleRate]);

  // 测量异步操作
  const measureAsyncOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      recordMetric(`${componentName}_${operationName}`, duration, {
        component: componentName,
        operation: operationName,
        success: true
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      recordMetric(`${componentName}_${operationName}_error`, duration, {
        component: componentName,
        operation: operationName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }, [componentName, recordMetric]);

  // 测量同步操作
  const measureSyncOperation = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): T => {
    const startTime = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - startTime;

      recordMetric(`${componentName}_${operationName}`, duration, {
        component: componentName,
        operation: operationName,
        success: true
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      recordMetric(`${componentName}_${operationName}_error`, duration, {
        component: componentName,
        operation: operationName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }, [componentName, recordMetric]);

  // 创建性能优化的事件处理器
  const createOptimizedHandler = useCallback(
    (handler: (...args: any[]) => void, handlerName: string = 'handler') => {
      return (...args: any[]) => {
        if (trackInteractions) {
          measureSyncOperation(handlerName, () => handler(...args));
        } else {
          handler(...args);
        }
      };
    },
    [trackInteractions, measureSyncOperation]
  );

  // 创建防抖处理器
  const createDebouncedHandler = useCallback(
    (handler: (...args: any[]) => void, delay: number = 300, handlerName: string = 'debounced_handler') => {
      const timeoutRef = useRef<NodeJS.Timeout>();

      return (...args: any[]) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          if (trackInteractions) {
            measureSyncOperation(handlerName, () => handler(...args));
          } else {
            handler(...args);
          }
        }, delay);
      };
    },
    [trackInteractions, measureSyncOperation]
  );

  // 创建节流处理器
  const createThrottledHandler = useCallback(
    (handler: (...args: any[]) => void, delay: number = 300, handlerName: string = 'throttled_handler') => {
      const lastExecutedRef = useRef<number>(0);

      return (...args: any[]) => {
        const now = Date.now();

        if (now - lastExecutedRef.current >= delay) {
          lastExecutedRef.current = now;

          if (trackInteractions) {
            measureSyncOperation(handlerName, () => handler(...args));
          } else {
            handler(...args);
          }
        }
      };
    },
    [trackInteractions, measureSyncOperation]
  );

  // 获取性能建议
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.renderTime && metrics.renderTime > 16) {
      recommendations.push('考虑使用 React.memo 或 useMemo 优化渲染性能');
    }

    if (metrics.componentMount && metrics.componentMount > 100) {
      recommendations.push('考虑延迟加载非关键功能');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 0.8) {
      recommendations.push('内存使用率较高，检查是否有内存泄漏');
    }

    if (recommendations.length === 0) {
      recommendations.push('组件性能表现良好');
    }

    return recommendations;
  }, [metrics]);

  return {
    // 性能指标
    metrics,

    // 测量工具
    measureAsyncOperation,
    measureSyncOperation,

    // 优化工具
    createOptimizedHandler,
    createDebouncedHandler,
    createThrottledHandler,

    // 分析工具
    getPerformanceRecommendations,

    // 手动记录指标
    recordMetric: (metricName: string, value: number, additionalData?: any) =>
      recordMetric(`${componentName}_${metricName}`, value, additionalData)
  };
}

// Agent 特定性能 Hook
export function useAgentChatPerformance() {
  const performance = useAgentPerformance({
    componentName: 'AgentChat',
    trackComponentMount: true,
    trackRenderTime: true,
    trackInteractions: true
  });

  // Agent 聊天特定的性能测量
  const measureMessageSend = useCallback((messageLength: number) => {
    return performance.measureAsyncOperation('message_send', async () => {
      // 这里会被实际的消息发送逻辑替换
      await new Promise(resolve => setTimeout(resolve, 100));

      performance.recordMetric('message_length', messageLength);
    });
  }, [performance]);

  const measureMessageReceive = useCallback(() => {
    return performance.measureAsyncOperation('message_receive', async () => {
      // 这里会被实际的消息接收逻辑替换
      await new Promise(resolve => setTimeout(resolve, 200));
    });
  }, [performance]);

  const measureConversationLoad = useCallback((messageCount: number) => {
    return performance.measureAsyncOperation('conversation_load', async () => {
      performance.recordMetric('conversation_message_count', messageCount);
    });
  }, [performance]);

  return {
    ...performance,
    measureMessageSend,
    measureMessageReceive,
    measureConversationLoad
  };
}

// Agent 历史记录性能 Hook
export function useAgentHistoryPerformance() {
  const performance = useAgentPerformance({
    componentName: 'AgentHistory',
    trackComponentMount: true,
    trackRenderTime: true
  });

  const measureHistoryLoad = useCallback((sessionCount: number) => {
    return performance.measureAsyncOperation('history_load', async () => {
      performance.recordMetric('session_count', sessionCount);
    });
  }, [performance]);

  const measureSearch = useCallback((query: string, resultsCount: number) => {
    return performance.measureSyncOperation('history_search', () => {
      performance.recordMetric('search_query_length', query.length);
      performance.recordMetric('search_results_count', resultsCount);
    });
  }, [performance]);

  const measureExport = useCallback((exportType: string, itemCount: number) => {
    return performance.measureAsyncOperation('history_export', async () => {
      performance.recordMetric('export_item_count', itemCount, {
        export_type: exportType
      });
    });
  }, [performance]);

  return {
    ...performance,
    measureHistoryLoad,
    measureSearch,
    measureExport
  };
}

// Agent 设置性能 Hook
export function useAgentSettingsPerformance() {
  const performance = useAgentPerformance({
    componentName: 'AgentSettings',
    trackComponentMount: true,
    trackInteractions: true
  });

  const measureSettingsSave = useCallback((settingsCount: number) => {
    return performance.measureAsyncOperation('settings_save', async () => {
      performance.recordMetric('settings_count', settingsCount);
    });
  }, [performance]);

  const measureSettingsLoad = useCallback(() => {
    return performance.measureAsyncOperation('settings_load', async () => {
      // 设置加载逻辑
    });
  }, [performance]);

  return {
    ...performance,
    measureSettingsSave,
    measureSettingsLoad
  };
}