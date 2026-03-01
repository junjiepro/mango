/**
 * Timeout Monitor for Edge Function
 * 用于监控 Supabase Edge Function 执行时间，实现优雅降级
 */

// Supabase Edge Function 默认超时 60 秒，Pro 计划 150 秒
// 预留 10 秒缓冲时间用于清理和保存状态
const DEFAULT_TIMEOUT_MS = 60000;
const SAFETY_BUFFER_MS = 10000;

/** 最大自动续传次数，防止无限循环 */
export const MAX_CONTINUATION_RUNS = 5;

export interface TimeoutConfig {
  /** 函数最大执行时间（毫秒） */
  maxExecutionTime?: number;
  /** 安全缓冲时间（毫秒） */
  safetyBuffer?: number;
  /** 警告阈值（剩余时间低于此值时触发警告） */
  warningThreshold?: number;
}

export interface TimeoutStatus {
  /** 是否接近超时 */
  isApproaching: boolean;
  /** 是否已超时 */
  isTimedOut: boolean;
  /** 剩余时间（毫秒） */
  remainingTime: number;
  /** 已执行时间（毫秒） */
  elapsedTime: number;
  /** 执行进度百分比 */
  progressPercent: number;
}

export class TimeoutApproachingError extends Error {
  public readonly remainingTime: number;
  public readonly elapsedTime: number;

  constructor(message: string, remainingTime: number, elapsedTime: number) {
    super(message);
    this.name = 'TimeoutApproachingError';
    this.remainingTime = remainingTime;
    this.elapsedTime = elapsedTime;
  }
}

export class TimeoutMonitor {
  private startTime: number;
  private maxExecutionTime: number;
  private safetyBuffer: number;
  private warningThreshold: number;
  private stepCount: number = 0;

  constructor(config: TimeoutConfig = {}) {
    this.startTime = Date.now();
    this.maxExecutionTime = config.maxExecutionTime || DEFAULT_TIMEOUT_MS;
    this.safetyBuffer = config.safetyBuffer || SAFETY_BUFFER_MS;
    this.warningThreshold = config.warningThreshold || 15000;
  }

  /** 获取剩余安全执行时间 */
  getRemainingTime(): number {
    const elapsed = Date.now() - this.startTime;
    const safeLimit = this.maxExecutionTime - this.safetyBuffer;
    return Math.max(0, safeLimit - elapsed);
  }

  /** 获取已执行时间 */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /** 检查是否接近超时 */
  isApproachingTimeout(): boolean {
    return this.getRemainingTime() < this.warningThreshold;
  }

  /** 检查是否已超时（超过安全限制） */
  isTimedOut(): boolean {
    return this.getRemainingTime() <= 0;
  }

  /** 获取完整的超时状态 */
  getStatus(): TimeoutStatus {
    const remainingTime = this.getRemainingTime();
    const elapsedTime = this.getElapsedTime();
    const safeLimit = this.maxExecutionTime - this.safetyBuffer;

    return {
      isApproaching: remainingTime < this.warningThreshold,
      isTimedOut: remainingTime <= 0,
      remainingTime,
      elapsedTime,
      progressPercent: Math.min(100, (elapsedTime / safeLimit) * 100),
    };
  }

  /** 记录步骤完成 */
  recordStep(): void {
    this.stepCount++;
  }

  /** 获取已完成步骤数 */
  getStepCount(): number {
    return this.stepCount;
  }

  /** 检查并抛出超时错误（如果接近超时） */
  checkAndThrow(): void {
    // 在接近超时时就抛出错误，而不是等到完全超时
    // 这样可以预留足够的时间进行续传
    if (this.isApproachingTimeout()) {
      throw new TimeoutApproachingError(
        'Edge Function execution time limit approaching',
        this.getRemainingTime(),
        this.getElapsedTime()
      );
    }
  }

  /** 创建检查点数据 */
  createCheckpoint(additionalData?: Record<string, unknown>): ExecutionCheckpoint {
    return {
      stepIndex: this.stepCount,
      elapsedTime: this.getElapsedTime(),
      remainingTime: this.getRemainingTime(),
      timestamp: new Date().toISOString(),
      canResume: true,
      ...additionalData,
    };
  }
}

/** 执行检查点数据 */
export interface ExecutionCheckpoint {
  /** 当前步骤索引 */
  stepIndex: number;
  /** 已执行时间 */
  elapsedTime: number;
  /** 剩余时间 */
  remainingTime: number;
  /** 检查点时间戳 */
  timestamp: string;
  /** 是否可以恢复 */
  canResume: boolean;
  /** 最后执行的工具 */
  lastToolCall?: string;
  /** 部分内容 */
  partialContent?: string;
  /** 工具调用历史 */
  toolCallHistory?: Array<{
    tool: string;
    status: 'success' | 'error';
  }>;
}

/** 超时信息（用于消息 metadata） */
export interface TimeoutInfo {
  /** 是否因超时而中断 */
  timedOut: boolean;
  /** 超时原因 */
  reason?: 'approaching_limit' | 'hard_timeout';
  /** 检查点数据 */
  checkpoint?: ExecutionCheckpoint;
  /** 是否可以继续 */
  canContinue: boolean;
}

/** 创建默认的超时监控器 */
export function createTimeoutMonitor(config?: TimeoutConfig): TimeoutMonitor {
  return new TimeoutMonitor(config);
}
