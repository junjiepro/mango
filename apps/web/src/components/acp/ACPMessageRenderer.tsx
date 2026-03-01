/**
 * ACP Message Part Renderer
 * 渲染ACP消息的各个部分（文本、工具调用、计划等）
 */

'use client';

import React from 'react';
import { MessageResponse } from '@/components/ai-elements/message';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { UIMessagePart, UIDataTypes, UITools } from 'ai';

// 定义消息部件类型
type MessagePart = UIMessagePart<UIDataTypes, UITools>;

// Plan Entry 类型定义
interface PlanEntry {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description?: string;
}

// 工具调用状态图标
const ToolStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'running':
    case 'input-streaming':
    case 'input-available':
    case 'awaiting-approval':
      return <Loader2 className="size-3 animate-spin text-blue-500" />;
    case 'success':
    case 'complete':
    case 'output-available':
      return <CheckCircle2 className="size-3 text-green-500" />;
    case 'error':
    case 'failed':
      return <XCircle className="size-3 text-red-500" />;
    default:
      return <Clock className="size-3 text-muted-foreground" />;
  }
};

// 获取工具状态显示文本
function getToolStatusText(state: string): string {
  switch (state) {
    case 'input-streaming':
      return '输入中...';
    case 'input-available':
    case 'awaiting-approval':
      return '等待执行';
    case 'output-available':
      return '完成';
    case 'error':
      return '失败';
    default:
      return state;
  }
}

// 工具调用组件
interface ToolCallDisplayProps {
  toolName: string;
  toolCallId?: string;
  status: string;
  args?: unknown;
  result?: unknown;
  error?: string;
}

// 渲染参数预览（独立函数）
function ArgsPreview({ args }: { args: unknown }): React.ReactElement | null {
  if (!args || typeof args !== 'object') return null;
  const keys = Object.keys(args as Record<string, unknown>);
  if (keys.length === 0) return null;

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        参数
      </summary>
      <pre className="mt-1 overflow-x-auto rounded bg-background/50 p-2">
        {JSON.stringify(args, null, 2)}
      </pre>
    </details>
  );
}

function ToolCallDisplay({
  toolName,
  status,
  args,
  result,
  error,
}: ToolCallDisplayProps) {
  const isExpanded = status === 'error' || (result && typeof result === 'string' && result.length < 200);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm',
        (status === 'input-streaming' || status === 'input-available' || status === 'awaiting-approval') &&
          'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
        status === 'output-available' &&
          'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        status === 'error' &&
          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
        !['input-streaming', 'input-available', 'awaiting-approval', 'output-available', 'error'].includes(status) &&
          'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
      )}
    >
      <div className="flex items-center gap-2">
        <ToolStatusIcon status={status} />
        <span className="font-medium">{formatToolName(toolName)}</span>
        <span className="text-xs text-muted-foreground">
          {getToolStatusText(status)}
        </span>
      </div>

      {/* 参数预览 */}
      <ArgsPreview args={args} />

      {/* 结果显示 */}
      {isExpanded && result && (
        <div className="text-xs">
          <span className="text-muted-foreground">结果: </span>
          <span>{String(result)}</span>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

// 格式化工具名称
function formatToolName(toolName: string): string {
  // 移除常见前缀
  let displayName = toolName;
  if (toolName.startsWith('global_')) {
    displayName = toolName.replace('global_', '');
  }
  if (toolName.startsWith('tool-')) {
    displayName = toolName.replace('tool-', '');
  }

  // 将下划线替换为空格，首字母大写
  return displayName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Plan 组件
interface PlanDisplayProps {
  plan: PlanEntry[];
}

function PlanDisplay({ plan }: PlanDisplayProps) {
  if (!plan || plan.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
      <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
        执行计划
      </div>
      <div className="space-y-1">
        {plan.map((entry, index) => (
          <div key={entry.id || index} className="flex items-center gap-2 text-sm">
            <ToolStatusIcon status={entry.status} />
            <span
              className={cn(
                entry.status === 'completed' && 'text-green-700 dark:text-green-300',
                entry.status === 'in_progress' && 'text-blue-700 dark:text-blue-300',
                entry.status === 'failed' && 'text-red-700 dark:text-red-300',
                entry.status === 'pending' && 'text-muted-foreground'
              )}
            >
              {entry.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 消息部件渲染器
export function renderACPMessagePart(
  part: MessagePart,
  messageId: string,
  partIndex: number,
  isStreaming: boolean,
  metadata?: Record<string, unknown>
): React.ReactNode {
  const key = `${messageId}-${partIndex}`;

  // 处理文本类型
  if (part.type === 'text') {
    return (
      <MessageResponse key={key}>
        {part.text}
      </MessageResponse>
    );
  }

  // 处理推理类型
  if (part.type === 'reasoning') {
    return (
      <details key={key} className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          💭 思考过程
        </summary>
        <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-muted-foreground">
          <MessageResponse>{part.text}</MessageResponse>
        </div>
      </details>
    );
  }

  // 处理文件类型
  if (part.type === 'file') {
    if (part.mediaType?.startsWith('image/')) {
      return (
        <div key={key} className="max-w-sm overflow-hidden rounded-lg">
          <img
            src={part.url}
            alt={part.filename || 'Image'}
            className="h-auto w-full object-cover"
          />
        </div>
      );
    }
    return (
      <div
        key={key}
        className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
      >
        <span className="text-muted-foreground">📎</span>
        <span>{part.filename || '附件'}</span>
      </div>
    );
  }

  // 处理来源URL类型
  if (part.type === 'source-url') {
    return (
      <div
        key={key}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <span>📚</span>
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {part.title || part.url}
        </a>
      </div>
    );
  }

  // 处理来源文档类型
  if (part.type === 'source-document') {
    return (
      <div
        key={key}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <span>📄</span>
        <span>{part.title || '文档'}</span>
      </div>
    );
  }

  // 处理动态工具类型
  if (part.type === 'dynamic-tool') {
    return (
      <ToolCallDisplay
        key={key}
        toolName={part.toolName}
        toolCallId={part.toolCallId}
        status={part.state}
        args={part.input}
        result={'output' in part ? part.output : undefined}
        error={'errorText' in part ? part.errorText : undefined}
      />
    );
  }

  // 处理静态工具类型 (tool-xxx)
  if (part.type.startsWith('tool-')) {
    const toolPart = part as unknown as {
      type: string;
      toolCallId: string;
      state: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };
    return (
      <ToolCallDisplay
        key={key}
        toolName={part.type}
        toolCallId={toolPart.toolCallId}
        status={toolPart.state}
        args={toolPart.input}
        result={toolPart.output}
        error={toolPart.errorText}
      />
    );
  }

  // 处理步骤开始类型
  if (part.type === 'step-start') {
    return null; // 可以选择不渲染或渲染分隔符
  }

  // 处理数据类型 (data-xxx)
  if (part.type.startsWith('data-')) {
    // 检查是否是计划数据
    const dataPart = part as unknown as { type: string; data: unknown };
    if (dataPart.data && Array.isArray(dataPart.data)) {
      const firstItem = dataPart.data[0];
      if (firstItem && typeof firstItem === 'object' && 'id' in firstItem && 'title' in firstItem) {
        return <PlanDisplay key={key} plan={dataPart.data as PlanEntry[]} />;
      }
    }
    return null;
  }

  // 从 metadata 中提取计划（兜底处理）
  if (metadata?.plan && Array.isArray(metadata.plan)) {
    return <PlanDisplay key={key} plan={metadata.plan as PlanEntry[]} />;
  }

  return null;
}
