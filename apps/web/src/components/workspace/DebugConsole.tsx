/**
 * DebugConsole Component
 * 捕获 iframe 内的 console 输出和运行时错误，在 Host 侧展示
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Search, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ConsoleEntry } from '@/lib/miniapp/types';

type LogLevel = 'all' | 'error' | 'warn' | 'info' | 'log';

interface DebugConsoleProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  onSendToAgent?: (content: string) => void;
}

export function DebugConsole({ entries, onClear, onSendToAgent }: DebugConsoleProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(entries.length);

  // 统计 error/warn 数量
  const errorCount = entries.filter(e => e.level === 'error').length;
  const warnCount = entries.filter(e => e.level === 'warn').length;

  // 过滤日志
  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.level !== filter) return false;
    if (search) {
      const text = e.args.join(' ').toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // 新日志自动滚动到底部
  useEffect(() => {
    if (autoScroll && entries.length > prevLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = entries.length;
  }, [entries.length, autoScroll]);

  // 有新 error 时自动展开
  useEffect(() => {
    if (errorCount > 0 && !expanded) {
      setExpanded(true);
    }
  }, [errorCount]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }, []);

  const handleSendErrors = useCallback(() => {
    const errors = entries.filter(e => e.level === 'error');
    if (errors.length === 0 || !onSendToAgent) return;
    const content = errors
      .map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.args.join(' ')}`)
      .join('\n');
    onSendToAgent(`以下是 MiniApp 运行时错误日志，请帮我分析：\n\`\`\`\n${content}\n\`\`\``);
  }, [entries, onSendToAgent]);

  // 折叠状态：仅显示 toolbar
  return (
    <div className="flex flex-col h-full border-t bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b bg-muted/30 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          <span className="text-xs font-medium">Console</span>
        </Button>

        {/* 折叠时显示计数徽标 */}
        {errorCount > 0 && (
          <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
            {errorCount}
          </Badge>
        )}
        {warnCount > 0 && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-yellow-600 border-yellow-400">
            {warnCount}
          </Badge>
        )}

        {expanded && (
          <>
            <div className="h-3 w-px bg-border mx-0.5" />
            {/* Level 过滤 */}
            {(['all', 'error', 'warn', 'info', 'log'] as LogLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded transition-colors',
                  filter === level
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                {level === 'all' ? '全部' : level}
              </button>
            ))}

            <div className="flex-1" />

            {/* 搜索 */}
            <div className="relative w-32">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索..."
                className="h-5 pl-5 pr-1.5 text-[10px] bg-background"
              />
            </div>

            {/* 发送给 Agent */}
            {onSendToAgent && errorCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] gap-0.5"
                onClick={handleSendErrors}
                title="将错误日志发送给 Agent 分析"
              >
                <Send className="h-3 w-3" />
                发送给 Agent
              </Button>
            )}

            {/* 清空 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5"
              onClick={onClear}
              title="清空日志"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      {/* 日志列表 */}
      {expanded && (
        <ScrollArea className="flex-1 min-h-0">
          <div
            ref={scrollRef}
            className="h-full overflow-auto"
            onScroll={handleScroll}
          >
            <div className="p-1 space-y-px font-mono text-xs">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-[11px]">
                  {entries.length === 0 ? '暂无日志' : '无匹配日志'}
                </p>
              ) : (
                filtered.map((entry, i) => (
                  <LogLine key={`${entry.timestamp}-${i}`} entry={entry} />
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

const levelStyles: Record<ConsoleEntry['level'], string> = {
  log: 'text-muted-foreground',
  info: 'text-blue-500',
  warn: 'text-yellow-600 bg-yellow-500/5',
  error: 'text-red-500 bg-red-500/5',
};

const levelLabels: Record<ConsoleEntry['level'], string> = {
  log: 'LOG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

function LogLine({ entry }: { entry: ConsoleEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  return (
    <div className={cn('flex items-start gap-2 px-2 py-0.5 rounded-sm', levelStyles[entry.level])}>
      <span className="text-[10px] text-muted-foreground shrink-0 w-[60px]">{time}</span>
      <span className="text-[10px] shrink-0 w-[26px] font-semibold">{levelLabels[entry.level]}</span>
      <span className="break-all whitespace-pre-wrap">{entry.args.join(' ')}</span>
    </div>
  );
}
