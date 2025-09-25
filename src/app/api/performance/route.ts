/**
 * Agent 性能监控 API
 * 收集和分析客户端性能数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance/agent-performance';

// 性能数据类型
interface PerformanceReport {
  timestamp: number;
  page: string;
  user_id?: string;
  session_id?: string;
  metrics: {
    // Web Vitals
    CLS?: number;
    FID?: number;
    FCP?: number;
    LCP?: number;
    TTFB?: number;

    // Agent 特定指标
    agent_load_time?: number;
    conversation_response_time?: number;
    message_send_latency?: number;
    preferences_save_time?: number;
    history_load_time?: number;

    // 用户体验指标
    session_duration?: number;
    messages_per_session?: number;
    feature_usage?: Record<string, number>;
  };
  user_agent?: string;
  connection_type?: string;
  viewport?: {
    width: number;
    height: number;
  };
  device_memory?: number;
  hardware_concurrency?: number;
}

// POST /api/performance - 接收性能数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reports: PerformanceReport[] = Array.isArray(body) ? body : [body];

    // 验证数据格式
    const validReports = reports.filter(report => {
      return (
        report.timestamp &&
        report.page &&
        report.metrics &&
        typeof report.metrics === 'object'
      );
    });

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: 'No valid performance data provided' },
        { status: 400 }
      );
    }

    // 记录性能数据
    validReports.forEach(report => {
      performanceMonitor.recordMetric({
        timestamp: report.timestamp,
        page: report.page,
        user_id: report.user_id,
        metrics: report.metrics,
        user_agent: report.user_agent,
        connection_type: report.connection_type
      });
    });

    return NextResponse.json({
      success: true,
      processed: validReports.length
    });

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to process performance data' },
      { status: 500 }
    );
  }
}

// GET /api/performance - 获取性能统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const timeRange = searchParams.get('timeRange') || '1h';

    // 获取性能统计
    const stats = performanceMonitor.getStats();

    // 扩展统计信息
    const extendedStats = {
      ...stats,
      timestamp: Date.now(),
      time_range: timeRange,
      recommendations: generatePerformanceRecommendations(stats),
      alerts: checkPerformanceAlerts(stats),
      trends: calculateTrends(stats)
    };

    // 根据格式返回数据
    if (format === 'csv') {
      return new NextResponse(convertToCSV(extendedStats), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="performance-report.csv"'
        }
      });
    }

    return NextResponse.json(extendedStats);

  } catch (error) {
    console.error('Performance stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance stats' },
      { status: 500 }
    );
  }
}

// DELETE /api/performance - 清理性能数据
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan') || '24h';

    // 执行清理
    performanceMonitor.cleanup();

    return NextResponse.json({
      success: true,
      message: `Performance data older than ${olderThan} has been cleaned up`
    });

  } catch (error) {
    console.error('Performance cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup performance data' },
      { status: 500 }
    );
  }
}

// 生成性能建议
function generatePerformanceRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.avg_load_time > 3000) {
    recommendations.push('页面加载时间较长，考虑优化打包策略和资源加载');
  }

  if (stats.avg_response_time > 5000) {
    recommendations.push('AI响应时间较长，考虑优化模型推理或添加缓存');
  }

  if (stats.slowest_pages && stats.slowest_pages.length > 0) {
    const slowest = stats.slowest_pages[0];
    recommendations.push(`重点优化 ${slowest.page}，平均加载时间 ${slowest.avg_time}ms`);
  }

  return recommendations;
}

// 检查性能警报
function checkPerformanceAlerts(stats: any): Array<{
  level: 'warning' | 'error';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}> {
  const alerts = [];

  // 检查加载时间警报
  if (stats.avg_load_time > 5000) {
    alerts.push({
      level: 'error' as const,
      message: '页面平均加载时间超过5秒',
      metric: 'avg_load_time',
      value: stats.avg_load_time,
      threshold: 5000
    });
  } else if (stats.avg_load_time > 3000) {
    alerts.push({
      level: 'warning' as const,
      message: '页面平均加载时间超过3秒',
      metric: 'avg_load_time',
      value: stats.avg_load_time,
      threshold: 3000
    });
  }

  // 检查响应时间警报
  if (stats.avg_response_time > 10000) {
    alerts.push({
      level: 'error' as const,
      message: 'AI响应时间超过10秒',
      metric: 'avg_response_time',
      value: stats.avg_response_time,
      threshold: 10000
    });
  } else if (stats.avg_response_time > 5000) {
    alerts.push({
      level: 'warning' as const,
      message: 'AI响应时间超过5秒',
      metric: 'avg_response_time',
      value: stats.avg_response_time,
      threshold: 5000
    });
  }

  return alerts;
}

// 计算趋势
function calculateTrends(stats: any): {
  load_time_trend: 'improving' | 'degrading' | 'stable';
  response_time_trend: 'improving' | 'degrading' | 'stable';
  overall_health: 'good' | 'fair' | 'poor';
} {
  // 简化的趋势计算
  let loadTimeTrend: 'improving' | 'degrading' | 'stable' = 'stable';
  let responseTimeTrend: 'improving' | 'degrading' | 'stable' = 'stable';
  let overallHealth: 'good' | 'fair' | 'poor' = 'good';

  // 基于当前指标判断健康状态
  if (stats.avg_load_time > 5000 || stats.avg_response_time > 10000) {
    overallHealth = 'poor';
  } else if (stats.avg_load_time > 3000 || stats.avg_response_time > 5000) {
    overallHealth = 'fair';
  }

  return {
    load_time_trend: loadTimeTrend,
    response_time_trend: responseTimeTrend,
    overall_health: overallHealth
  };
}

// 转换为CSV格式
function convertToCSV(data: any): string {
  const headers = [
    'timestamp',
    'total_metrics',
    'avg_load_time',
    'avg_response_time',
    'overall_health'
  ];

  const rows = [
    headers.join(','),
    [
      data.timestamp,
      data.total_metrics,
      data.avg_load_time,
      data.avg_response_time,
      data.trends?.overall_health || 'unknown'
    ].join(',')
  ];

  return rows.join('\n');
}