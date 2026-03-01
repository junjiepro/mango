/**
 * TaskProgressIndicator Component
 * T053: Create TaskProgressIndicator component
 */

'use client'

import React from 'react'
import type { Database } from '@/types/database.types'
import { FeedbackButton } from '@/components/feedback/FeedbackButton'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskProgressIndicatorProps {
  task: Task
  className?: string
}

/**
 * TaskProgressIndicator 组件
 * 显示任务执行进度
 */
export function TaskProgressIndicator({
  task,
  className = '',
}: TaskProgressIndicatorProps) {
  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'running':
        return 'bg-blue-500'
      case 'pending':
      case 'queued':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (task.status) {
      case 'pending':
        return '等待中'
      case 'queued':
        return '队列中'
      case 'running':
        return '执行中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      case 'cancelled':
        return '已取消'
      default:
        return '未知'
    }
  }

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return '✓'
      case 'failed':
        return '✗'
      case 'running':
        return '⟳'
      case 'pending':
      case 'queued':
        return '⋯'
      case 'cancelled':
        return '⊘'
      default:
        return '?'
    }
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return null

    const start = new Date(startTime).getTime()
    const end = endTime ? new Date(endTime).getTime() : Date.now()
    const durationMs = end - start

    if (durationMs < 1000) return `${durationMs}ms`
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`
    return `${Math.round(durationMs / 60000)}m`
  }

  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      {/* 任务标题和状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{task.title}</h4>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs ${getStatusColor()}`}>
            {getStatusIcon()}
          </span>
          <span className="text-xs font-medium">{getStatusText()}</span>
        </div>
      </div>

      {/* 进度条 */}
      {(task.status === 'running' || task.status === 'queued') && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>进度</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 任务详情 */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {/* 任务类型 */}
        <div className="flex items-center justify-between">
          <span>类型</span>
          <span className="font-mono">{task.task_type}</span>
        </div>

        {/* 执行时间 */}
        {task.started_at && (
          <div className="flex items-center justify-between">
            <span>执行时间</span>
            <span>{formatDuration(task.started_at, task.completed_at || undefined)}</span>
          </div>
        )}

        {/* 工具调用次数 */}
        {task.tool_calls && Array.isArray(task.tool_calls) && task.tool_calls.length > 0 && (
          <div className="flex items-center justify-between">
            <span>工具调用</span>
            <span>{task.tool_calls.length} 次</span>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {task.status === 'failed' && task.error_message && (
        <div className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {task.error_message}
        </div>
      )}

      {/* 任务结果 */}
      {task.status === 'completed' && task.result && (
        <div className="mt-3 rounded-md bg-muted p-2 text-xs">
          <div className="font-medium mb-1">结果</div>
          <pre className="overflow-auto whitespace-pre-wrap">
            {typeof task.result === 'string'
              ? task.result
              : JSON.stringify(task.result, null, 2)}
          </pre>
        </div>
      )}

      {/* 反馈按钮 - 任务完成或失败时显示 */}
      {(task.status === 'completed' || task.status === 'failed') && (
        <div className="mt-3 flex justify-end">
          <FeedbackButton
            taskId={task.id}
            conversationId={task.conversation_id}
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
