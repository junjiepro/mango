/**
 * 工具执行可视化器
 * 提供渐进式披露的工具执行步骤可视化，支持不同的详细级别
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ToolCall, ToolExecutionRecord, UserMode } from '@/types/ai-agent'

// Icons
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ErrorIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const LoadingIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const ToolIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const TimeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

/**
 * 详细级别类型
 */
export type DetailLevel = 'simple' | 'detailed' | 'technical'

/**
 * 执行步骤接口
 */
interface ExecutionStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  startTime?: string
  endTime?: string
  duration?: number
  input?: any
  output?: any
  error?: string
  subSteps?: ExecutionStep[]
  metadata?: Record<string, any>
}

/**
 * 工具执行可视化器属性
 */
interface ToolExecutionVisualizerProps {
  toolCalls: ToolCall[]
  executionRecords?: ToolExecutionRecord[]
  userMode: UserMode
  detailLevel?: DetailLevel
  className?: string
  onDetailLevelChange?: (level: DetailLevel) => void
  onStepClick?: (step: ExecutionStep) => void
}

/**
 * 工具执行可视化器组件
 */
export default function ToolExecutionVisualizer({
  toolCalls,
  executionRecords = [],
  userMode,
  detailLevel = 'simple',
  className,
  onDetailLevelChange,
  onStepClick
}: ToolExecutionVisualizerProps) {
  const t = useTranslations('aiAgent.toolExecution')

  // 状态管理
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [currentDetailLevel, setCurrentDetailLevel] = useState<DetailLevel>(detailLevel)

  // 计算执行步骤
  const executionSteps = useMemo(() => {
    return toolCalls.map((toolCall): ExecutionStep => {
      const record = executionRecords.find(r => r.toolCall.id === toolCall.id)

      return {
        id: toolCall.id,
        name: toolCall.name,
        description: getToolDescription(toolCall),
        status: toolCall.status,
        startTime: toolCall.startTime,
        endTime: toolCall.endTime,
        duration: getDuration(toolCall),
        input: toolCall.parameters,
        output: toolCall.result,
        error: toolCall.error,
        metadata: {
          type: toolCall.type,
          executionRecord: record
        }
      }
    })
  }, [toolCalls, executionRecords])

  // 获取工具描述
  const getToolDescription = useCallback((toolCall: ToolCall): string => {
    switch (toolCall.type) {
      case 'mcp-tool':
        return t('descriptions.mcpTool', { name: toolCall.name })
      case 'plugin':
        return t('descriptions.plugin', { name: toolCall.name })
      case 'function':
        return t('descriptions.function', { name: toolCall.name })
      default:
        return t('descriptions.unknown', { name: toolCall.name })
    }
  }, [t])

  // 计算执行时长
  const getDuration = useCallback((toolCall: ToolCall): number => {
    if (!toolCall.startTime || !toolCall.endTime) return 0
    return new Date(toolCall.endTime).getTime() - new Date(toolCall.startTime).getTime()
  }, [])

  // 切换展开状态
  const toggleExpanded = useCallback((stepId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }, [])

  // 处理详细级别变更
  const handleDetailLevelChange = useCallback((level: DetailLevel) => {
    setCurrentDetailLevel(level)
    onDetailLevelChange?.(level)
  }, [onDetailLevelChange])

  // 格式化时间
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }, [])

  // 格式化时长
  const formatDuration = useCallback((duration: number) => {
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
    return `${(duration / 60000).toFixed(1)}m`
  }, [])

  // 获取状态图标
  const getStatusIcon = useCallback((status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckIcon />
      case 'error':
        return <ErrorIcon />
      case 'running':
        return <LoadingIcon />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }, [])

  // 获取状态颜色
  const getStatusColor = useCallback((status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }, [])

  // 渲染详细级别选择器
  const renderDetailLevelSelector = useCallback(() => {
    if (userMode === 'simple') return null

    return (
      <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
        {(['simple', 'detailed', 'technical'] as DetailLevel[]).map((level) => (
          <Button
            key={level}
            variant={currentDetailLevel === level ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleDetailLevelChange(level)}
            className="text-xs"
          >
            {t(`detailLevels.${level}`)}
          </Button>
        ))}
      </div>
    )
  }, [userMode, currentDetailLevel, handleDetailLevelChange, t])

  // 渲染工具参数
  const renderParameters = useCallback((parameters: any) => {
    if (!parameters || Object.keys(parameters).length === 0) return null

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-md">
        <h5 className="text-xs font-medium text-gray-700 mb-2">{t('parameters')}:</h5>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify(parameters, null, 2)}
        </pre>
      </div>
    )
  }, [t])

  // 渲染工具结果
  const renderResult = useCallback((result: any, error?: string) => {
    if (error) {
      return (
        <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
          <h5 className="text-xs font-medium text-red-700 mb-2">{t('error')}:</h5>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )
    }

    if (!result) return null

    return (
      <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
        <h5 className="text-xs font-medium text-green-700 mb-2">{t('result')}:</h5>
        <pre className="text-xs text-green-600 overflow-auto">
          {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )
  }, [t])

  // 渲染执行步骤
  const renderExecutionStep = useCallback((step: ExecutionStep, index: number) => {
    const isExpanded = expandedItems.has(step.id)
    const statusColor = getStatusColor(step.status)
    const canExpand = currentDetailLevel !== 'simple' || step.status === 'error'

    return (
      <div key={step.id} className="relative">
        {/* 连接线 */}
        {index < executionSteps.length - 1 && (
          <div className="absolute left-5 top-10 w-0.5 h-8 bg-gray-200" />
        )}

        <Card className={cn("border", statusColor)}>
          <div
            className={cn(
              "flex items-center space-x-3 p-4 cursor-pointer",
              canExpand && "hover:bg-gray-50"
            )}
            onClick={() => canExpand && toggleExpanded(step.id)}
          >
            {/* 状态图标 */}
            <div className="flex-shrink-0">
              {getStatusIcon(step.status)}
            </div>

            {/* 工具信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {step.metadata?.type || 'function'}
                </Badge>
                {step.status === 'completed' && step.duration && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <TimeIcon />
                    <span>{formatDuration(step.duration)}</span>
                  </div>
                )}
              </div>

              {currentDetailLevel !== 'simple' && (
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              )}

              {currentDetailLevel === 'technical' && step.startTime && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('startedAt')}: {formatTime(step.startTime)}
                </p>
              )}
            </div>

            {/* 展开按钮 */}
            {canExpand && (
              <div className="flex-shrink-0">
                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              </div>
            )}
          </div>

          {/* 详细信息 */}
          {isExpanded && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {currentDetailLevel === 'detailed' && step.input && (
                renderParameters(step.input)
              )}

              {currentDetailLevel === 'technical' && (
                <>
                  {step.input && renderParameters(step.input)}
                  {(step.output || step.error) && renderResult(step.output, step.error)}

                  {step.metadata?.executionRecord && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <h5 className="text-xs font-medium text-blue-700 mb-2">{t('executionDetails')}:</h5>
                      <div className="text-xs text-blue-600 space-y-1">
                        <p>{t('executionTime')}: {formatDuration(step.metadata.executionRecord.executionTime)}</p>
                        <p>{t('timestamp')}: {formatTime(step.metadata.executionRecord.timestamp)}</p>
                        <p>{t('success')}: {step.metadata.executionRecord.success ? t('yes') : t('no')}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    )
  }, [
    expandedItems,
    executionSteps.length,
    currentDetailLevel,
    getStatusColor,
    getStatusIcon,
    toggleExpanded,
    formatDuration,
    formatTime,
    renderParameters,
    renderResult,
    t
  ])

  // 计算总体统计
  const overallStats = useMemo(() => {
    const total = executionSteps.length
    const completed = executionSteps.filter(s => s.status === 'completed').length
    const errors = executionSteps.filter(s => s.status === 'error').length
    const running = executionSteps.filter(s => s.status === 'running').length

    const totalDuration = executionSteps
      .filter(s => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0)

    return { total, completed, errors, running, totalDuration }
  }, [executionSteps])

  if (executionSteps.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ToolIcon />
          <h3 className="text-lg font-medium text-gray-900">
            {t('title')}
          </h3>
          <Badge variant="outline">
            {overallStats.completed}/{overallStats.total}
          </Badge>
        </div>

        {renderDetailLevelSelector()}
      </div>

      {/* 总体统计 */}
      {currentDetailLevel !== 'simple' && (
        <Card className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{overallStats.completed}</p>
              <p className="text-xs text-gray-600">{t('stats.completed')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overallStats.errors}</p>
              <p className="text-xs text-gray-600">{t('stats.errors')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{overallStats.running}</p>
              <p className="text-xs text-gray-600">{t('stats.running')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(overallStats.totalDuration)}</p>
              <p className="text-xs text-gray-600">{t('stats.totalTime')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* 执行步骤列表 */}
      <div className="space-y-3">
        {executionSteps.map((step, index) => renderExecutionStep(step, index))}
      </div>
    </div>
  )
}