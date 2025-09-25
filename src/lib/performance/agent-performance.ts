/**
 * Agent 性能监控和优化工具
 * 提供 Agent 功能的性能测量、监控和优化建议
 */

import { NextRequest } from 'next/server';

// 性能指标接口
interface PerformanceMetrics {
  timestamp: number;
  page: string;
  user_id?: string;
  metrics: {
    // Web Vitals
    CLS?: number;      // Cumulative Layout Shift
    FID?: number;      // First Input Delay
    FCP?: number;      // First Contentful Paint
    LCP?: number;      // Largest Contentful Paint
    TTFB?: number;     // Time to First Byte

    // Agent 特定指标
    agent_load_time?: number;           // Agent 页面加载时间
    conversation_response_time?: number; // 对话响应时间
    message_send_latency?: number;      // 消息发送延迟
    preferences_save_time?: number;     // 偏好设置保存时间
    history_load_time?: number;         // 历史记录加载时间

    // 用户体验指标
    session_duration?: number;          // 会话持续时间
    messages_per_session?: number;      // 每个会话的消息数
    feature_usage?: Record<string, number>; // 功能使用次数
  };
  user_agent?: string;
  connection_type?: string;
}

// 性能监控类
export class AgentPerformanceMonitor {
  private static instance: AgentPerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private thresholds = {
    agent_load_time: 3000,        // Agent 页面应在 3 秒内加载
    conversation_response: 5000,   // 对话响应应在 5 秒内
    message_send_latency: 1000,    // 消息发送应在 1 秒内
    preferences_save: 2000,        // 偏好保存应在 2 秒内
    history_load: 2000,           // 历史加载应在 2 秒内
  };

  private constructor() {}

  static getInstance(): AgentPerformanceMonitor {
    if (!AgentPerformanceMonitor.instance) {
      AgentPerformanceMonitor.instance = new AgentPerformanceMonitor();
    }
    return AgentPerformanceMonitor.instance;
  }

  // 记录性能指标
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // 检查是否超过阈值
    this.checkThresholds(metric);

    // 限制内存中的指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  // 检查性能阈值
  private checkThresholds(metric: PerformanceMetrics): void {
    const { metrics: m } = metric;

    if (m.agent_load_time && m.agent_load_time > this.thresholds.agent_load_time) {
      console.warn(`Agent load time exceeded threshold: ${m.agent_load_time}ms`);
    }

    if (m.conversation_response_time && m.conversation_response_time > this.thresholds.conversation_response) {
      console.warn(`Conversation response time exceeded threshold: ${m.conversation_response_time}ms`);
    }

    if (m.message_send_latency && m.message_send_latency > this.thresholds.message_send_latency) {
      console.warn(`Message send latency exceeded threshold: ${m.message_send_latency}ms`);
    }

    // Web Vitals 检查
    if (m.CLS && m.CLS > 0.1) {
      console.warn(`CLS exceeded threshold: ${m.CLS}`);
    }

    if (m.LCP && m.LCP > 2500) {
      console.warn(`LCP exceeded threshold: ${m.LCP}ms`);
    }
  }

  // 获取性能统计
  getStats(): {
    total_metrics: number;
    avg_load_time: number;
    avg_response_time: number;
    slowest_pages: Array<{ page: string; avg_time: number }>;
    recent_alerts: string[];
  } {
    const recentMetrics = this.metrics.slice(-100);

    const avgLoadTime = recentMetrics
      .filter(m => m.metrics.agent_load_time)
      .reduce((sum, m) => sum + (m.metrics.agent_load_time || 0), 0) / recentMetrics.length || 0;

    const avgResponseTime = recentMetrics
      .filter(m => m.metrics.conversation_response_time)
      .reduce((sum, m) => sum + (m.metrics.conversation_response_time || 0), 0) / recentMetrics.length || 0;

    // 按页面分组统计
    const pageStats: Record<string, number[]> = {};
    recentMetrics.forEach(metric => {
      if (metric.metrics.agent_load_time) {
        if (!pageStats[metric.page]) pageStats[metric.page] = [];
        pageStats[metric.page].push(metric.metrics.agent_load_time);
      }
    });

    const slowestPages = Object.entries(pageStats)
      .map(([page, times]) => ({
        page,
        avg_time: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.avg_time - a.avg_time)
      .slice(0, 5);

    return {
      total_metrics: this.metrics.length,
      avg_load_time: Math.round(avgLoadTime),
      avg_response_time: Math.round(avgResponseTime),
      slowest_pages: slowestPages,
      recent_alerts: [] // 简化实现
    };
  }

  // 导出指标数据
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // 清理旧数据
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo);
  }
}

// 浏览器端性能监控工具
export class ClientPerformanceTracker {
  private startTimes: Map<string, number> = new Map();
  private monitor = AgentPerformanceMonitor.getInstance();

  // 开始计时
  startTiming(key: string): void {
    this.startTimes.set(key, performance.now());
  }

  // 结束计时并记录
  endTiming(key: string, additionalData?: Partial<PerformanceMetrics>): void {
    const startTime = this.startTimes.get(key);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.startTimes.delete(key);

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      page: window.location.pathname,
      metrics: {
        [key]: duration
      },
      user_agent: navigator.userAgent,
      ...additionalData
    };

    this.monitor.recordMetric(metric);
  }

  // 测量 Web Vitals
  measureWebVitals(): void {
    // 使用 Performance Observer API 测量核心指标
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        this.monitor.recordMetric({
          timestamp: Date.now(),
          page: window.location.pathname,
          metrics: {
            LCP: lastEntry.startTime
          }
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.monitor.recordMetric({
            timestamp: Date.now(),
            page: window.location.pathname,
            metrics: {
              FID: entry.processingStart - entry.startTime
            }
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsScore = 0;
        const entries = list.getEntries();

        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });

        this.monitor.recordMetric({
          timestamp: Date.now(),
          page: window.location.pathname,
          metrics: {
            CLS: clsScore
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  // 测量 Agent 特定性能
  measureAgentPerformance(): void {
    // 页面加载时间
    if (document.readyState === 'complete') {
      this.recordPageLoadTime();
    } else {
      window.addEventListener('load', () => this.recordPageLoadTime());
    }

    // 监控 Agent 相关操作
    this.setupAgentMetrics();
  }

  private recordPageLoadTime(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.monitor.recordMetric({
        timestamp: Date.now(),
        page: window.location.pathname,
        metrics: {
          agent_load_time: navigation.loadEventEnd - navigation.loadEventStart,
          TTFB: navigation.responseStart - navigation.requestStart,
          FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        }
      });
    }
  }

  private setupAgentMetrics(): void {
    // 监控消息发送性能
    this.interceptFetch();

    // 监控 UI 交互
    this.setupUIMetrics();
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();

      // 记录 API 调用性能
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      if (url.includes('/api/agent') || url.includes('/api/chat')) {
        this.monitor.recordMetric({
          timestamp: Date.now(),
          page: window.location.pathname,
          metrics: {
            conversation_response_time: endTime - startTime
          }
        });
      }

      return response;
    };
  }

  private setupUIMetrics(): void {
    // 监控按钮点击响应时间
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      if (target.matches('[data-performance-track]')) {
        const trackingKey = target.getAttribute('data-performance-track');
        if (trackingKey) {
          this.startTiming(trackingKey);

          // 在下一个事件循环中结束计时
          setTimeout(() => {
            this.endTiming(trackingKey);
          }, 0);
        }
      }
    });

    // 监控表单提交
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form.matches('[data-agent-form]')) {
        this.startTiming('form_submit');
      }
    });
  }
}

// React Hook 用于性能监控
export function usePerformanceTracking() {
  const tracker = new ClientPerformanceTracker();

  const trackOperation = (operationName: string, operation: () => Promise<void> | void) => {
    return async () => {
      tracker.startTiming(operationName);

      try {
        await operation();
      } finally {
        tracker.endTiming(operationName);
      }
    };
  };

  const trackPageLoad = () => {
    tracker.measureAgentPerformance();
    tracker.measureWebVitals();
  };

  return {
    trackOperation,
    trackPageLoad,
    startTiming: (key: string) => tracker.startTiming(key),
    endTiming: (key: string) => tracker.endTiming(key)
  };
}

// 服务端性能监控中间件
export function createPerformanceMiddleware() {
  const monitor = AgentPerformanceMonitor.getInstance();

  return async (req: NextRequest) => {
    const startTime = Date.now();
    const url = new URL(req.url);

    // 监控 Agent 相关 API
    if (url.pathname.startsWith('/api/agent') || url.pathname.startsWith('/api/chat')) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      monitor.recordMetric({
        timestamp: startTime,
        page: url.pathname,
        metrics: {
          conversation_response_time: duration
        },
        user_agent: req.headers.get('user-agent') || undefined
      });
    }
  };
}

// 性能优化建议生成器
export class PerformanceOptimizer {
  static generateRecommendations(): string[] {
    const monitor = AgentPerformanceMonitor.getInstance();
    const stats = monitor.getStats();
    const recommendations: string[] = [];

    // 基于统计数据生成建议
    if (stats.avg_load_time > 3000) {
      recommendations.push('考虑启用代码分割和懒加载以减少初始包大小');
      recommendations.push('优化图像和静态资源的加载');
      recommendations.push('考虑使用 CDN 加速静态资源');
    }

    if (stats.avg_response_time > 5000) {
      recommendations.push('优化 AI 模型响应时间或考虑添加流式响应');
      recommendations.push('考虑添加响应缓存机制');
      recommendations.push('优化数据库查询性能');
    }

    if (stats.slowest_pages.length > 0) {
      const slowestPage = stats.slowest_pages[0];
      recommendations.push(`优先优化 ${slowestPage.page} 页面（平均加载时间：${slowestPage.avg_time}ms）`);
    }

    // 通用优化建议
    recommendations.push('定期清理未使用的代码和依赖');
    recommendations.push('监控 Web Vitals 指标并持续优化');
    recommendations.push('考虑启用 Service Worker 进行离线支持');

    return recommendations;
  }

  static getOptimizationPlan(): {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  } {
    return {
      immediate: [
        '启用 gzip/brotli 压缩',
        '优化图像格式和尺寸',
        '移除未使用的 CSS 和 JavaScript',
        '启用浏览器缓存策略'
      ],
      short_term: [
        '实施代码分割和路由级别的懒加载',
        '添加 Service Worker 支持',
        '优化数据库查询和 API 响应',
        '实施性能预算和监控'
      ],
      long_term: [
        '考虑 CDN 和边缘计算',
        '实施渐进式 Web 应用 (PWA) 功能',
        '优化 AI 模型推理性能',
        '建立完善的性能监控和报告体系'
      ]
    };
  }
}

// 导出单例实例
export const performanceMonitor = AgentPerformanceMonitor.getInstance();