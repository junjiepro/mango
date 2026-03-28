/**
 * Link Previewer Component
 * Supports embedded page preview plus a compact Page Agent side drawer.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Square,
  Tablet,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewError, PreviewLoading } from './PreviewContainer';
import {
  WebPreviewBridge,
  type WebPreviewBridgeEvent,
  type WebPreviewPageSummary,
} from '@/lib/web-preview/bridge';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type BridgeStatus = 'connecting' | 'ready' | 'runtime-unavailable' | 'running' | 'error';

interface BridgeLogEntry {
  id: string;
  level: 'info' | 'error';
  message: string;
  timestamp: number;
}

interface LastExecutionResult {
  task: string;
  summary: string;
  output: string;
  level: 'info' | 'error' | 'neutral';
  timestamp: number;
}

interface RecentTask {
  task: string;
  timestamp: number;
}

const DEVICE_SIZES: Record<DeviceMode, { width: string }> = {
  desktop: { width: '100%' },
  tablet: { width: '768px' },
  mobile: { width: '375px' },
};

const RECENT_TASKS_STORAGE_KEY = 'mango.page-agent.recent-tasks';
const MAX_RECENT_TASKS = 6;

interface LinkPreviewerProps {
  url: string;
  title?: string;
  className?: string;
}

function stringifyExecutionResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function summarizeExecutionResult(result: unknown): string {
  if (typeof result === 'string') {
    return result.length > 140 ? `${result.slice(0, 140)}...` : result;
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }

    if (typeof record.result === 'string' && record.result.trim()) {
      return record.result;
    }

    if (record.result && typeof record.result === 'object') {
      const nested = record.result as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) {
        return nested.message;
      }
      if (typeof nested.summary === 'string' && nested.summary.trim()) {
        return nested.summary;
      }
    }

    if (record.summary && typeof record.summary === 'object') {
      const summary = record.summary as Record<string, unknown>;
      const parts = [
        typeof summary.title === 'string' ? summary.title : null,
        typeof summary.url === 'string' ? summary.url : null,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(' | ');
      }
    }
  }

  const serialized = stringifyExecutionResult(result);
  return serialized.length > 140 ? `${serialized.slice(0, 140)}...` : serialized;
}

function getResultCardClassName(level: LastExecutionResult['level']): string {
  if (level === 'error') {
    return 'border-red-200 bg-red-50/80';
  }

  if (level === 'neutral') {
    return 'border-slate-200 bg-slate-50/80';
  }

  return 'border-emerald-200 bg-emerald-50/70';
}

function getResultHeading(level: LastExecutionResult['level']): string {
  if (level === 'error') {
    return 'lastRunFailed';
  }

  if (level === 'neutral') {
    return 'lastRunStopped';
  }

  return 'lastRunCompleted';
}

export function LinkPreviewer({ url, title, className = '' }: LinkPreviewerProps) {
  const t = useTranslations('workspace');
  const locale = useLocale();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<WebPreviewBridge | null>(null);
  const runtimeAvailableRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const [inputUrl, setInputUrl] = useState(url);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [agentTask, setAgentTask] = useState('');
  const [isExecutingTask, setIsExecutingTask] = useState(false);
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('connecting');
  const [bridgeLogs, setBridgeLogs] = useState<BridgeLogEntry[]>([]);
  const [pageSummary, setPageSummary] = useState<WebPreviewPageSummary | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<LastExecutionResult | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [recentTasksReady, setRecentTasksReady] = useState(false);
  const dateTimeLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    if (url !== currentUrl) {
      setCurrentUrl(url);
      setInputUrl(url);
      setIsLoading(true);
      setError(null);
      setKey((prev) => prev + 1);
    }
  }, [url, currentUrl]);

  useEffect(() => {
    runtimeAvailableRef.current = false;
    setBridgeStatus('connecting');
    setPageSummary(null);
    setBridgeLogs([]);
    setIsExecutingTask(false);
    setIsStoppingTask(false);
    setLastExecutionResult(null);
    setShowLogs(false);
  }, [currentUrl]);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(RECENT_TASKS_STORAGE_KEY);
      if (!storedValue) {
        setRecentTasksReady(true);
        return;
      }

      const parsed = JSON.parse(storedValue);
      if (!Array.isArray(parsed)) {
        setRecentTasksReady(true);
        return;
      }

      const nextRecentTasks = parsed
        .filter(
          (entry): entry is RecentTask =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as RecentTask).task === 'string' &&
            typeof (entry as RecentTask).timestamp === 'number'
        )
        .slice(0, MAX_RECENT_TASKS);

      setRecentTasks(nextRecentTasks);
    } catch {
      window.localStorage.removeItem(RECENT_TASKS_STORAGE_KEY);
    } finally {
      setRecentTasksReady(true);
    }
  }, []);

  useEffect(() => {
    if (!recentTasksReady) {
      return;
    }

    try {
      window.localStorage.setItem(RECENT_TASKS_STORAGE_KEY, JSON.stringify(recentTasks));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [recentTasks, recentTasksReady]);

  const appendBridgeLog = useCallback((level: 'info' | 'error', message: string) => {
    setBridgeLogs((prev) => [
      ...prev.slice(-79),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level,
        message,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const applyPageSummary = useCallback((summary: WebPreviewPageSummary | null) => {
    setPageSummary(summary);
    runtimeAvailableRef.current = Boolean(summary?.runtimeAvailable);
    if (!summary) {
      setBridgeStatus('connecting');
      return;
    }
    setBridgeStatus(summary.runtimeAvailable ? 'ready' : 'runtime-unavailable');
  }, []);

  const handleBridgeEvent = useCallback(
    (event: WebPreviewBridgeEvent) => {
      switch (event.event) {
        case 'preview/ready': {
          const summary =
            (event.payload?.summary as WebPreviewPageSummary | undefined) ||
            (event.payload as WebPreviewPageSummary | undefined) ||
            null;
          applyPageSummary(summary);
          appendBridgeLog(
            'info',
            `${t('linkPreview.logs.previewConnected')}: ${summary?.title || t('linkPreview.untitledPage')}`
          );
          break;
        }
        case 'preview/runtime': {
          const available = Boolean(event.payload?.available);
          runtimeAvailableRef.current = available;
          setPageSummary((prev) => (prev ? { ...prev, runtimeAvailable: available } : prev));
          setBridgeStatus(available ? 'ready' : 'runtime-unavailable');
          appendBridgeLog(
            'info',
            available
              ? t('linkPreview.logs.runtimeAvailable')
              : t('linkPreview.logs.runtimeUnavailable')
          );
          break;
        }
        case 'page-agent/status': {
          const nextState = String(event.payload?.state || '');
          if (nextState === 'running') {
            setBridgeStatus('running');
            setIsStoppingTask(false);
            appendBridgeLog(
              'info',
              `${t('linkPreview.logs.taskStarted')}: ${String(event.payload?.task || '')}`
            );
            return;
          }
          if (nextState === 'aborted') {
            setBridgeStatus(runtimeAvailableRef.current ? 'ready' : 'runtime-unavailable');
            appendBridgeLog('info', t('linkPreview.logs.taskAborted'));
            setLastExecutionResult({
              task: agentTask.trim() || t('linkPreview.currentTask'),
              summary: t('linkPreview.taskAbortedByUser'),
              output: t('linkPreview.taskAbortedByUser'),
              level: 'neutral',
              timestamp: Date.now(),
            });
            setIsExecutingTask(false);
            setIsStoppingTask(false);
            return;
          }
          if (nextState === 'error') {
            setBridgeStatus('error');
            setIsStoppingTask(false);
            appendBridgeLog('error', String(event.payload?.message || t('linkPreview.pageTaskFailed')));
            return;
          }
          setBridgeStatus(runtimeAvailableRef.current ? 'ready' : 'runtime-unavailable');
          setIsStoppingTask(false);
          break;
        }
        case 'preview/error': {
          setBridgeStatus('error');
          appendBridgeLog(
            'error',
            String(event.payload?.message || t('linkPreview.previewRuntimeError'))
          );
          break;
        }
        default:
          appendBridgeLog('info', `${t('linkPreview.logs.eventReceived')}: ${event.event}`);
      }
    },
    [agentTask, appendBridgeLog, applyPageSummary, t]
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new WebPreviewBridge(iframe);
    bridgeRef.current = bridge;
    const unsubscribe = bridge.subscribe(handleBridgeEvent);

    return () => {
      unsubscribe();
      bridge.dispose();
      bridgeRef.current = null;
    };
  }, [currentUrl, key, handleBridgeEvent]);

  const syncBridgeSummary = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      appendBridgeLog('error', t('linkPreview.logs.bridgeNotInitialized'));
      return;
    }

    try {
      const result = await bridge.ping();
      applyPageSummary(result.summary);
      appendBridgeLog('info', `${t('linkPreview.logs.summarySynced')}: ${result.summary.title}`);
    } catch (bridgeError) {
      const message =
        bridgeError instanceof Error ? bridgeError.message : t('linkPreview.failedToSyncSummary');
      setBridgeStatus('error');
      appendBridgeLog('error', message);
    }
  }, [appendBridgeLog, applyPageSummary, t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success(t('linkPreview.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('linkPreview.copyFailed'));
    }
  }, [currentUrl, t]);

  const handleRefresh = useCallback(() => {
    setKey((prev) => prev + 1);
    setIsLoading(true);
    setError(null);
    setBridgeStatus('connecting');
  }, []);

  const handleOpenExternal = useCallback(() => {
    window.open(currentUrl, '_blank');
  }, [currentUrl]);

  const handleNavigate = useCallback(() => {
    if (inputUrl && inputUrl !== currentUrl) {
      let normalizedUrl = inputUrl;
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        normalizedUrl = `https://${inputUrl}`;
      }
      setCurrentUrl(normalizedUrl);
      setInputUrl(normalizedUrl);
      setIsLoading(true);
      setError(null);
      setKey((prev) => prev + 1);
    }
  }, [inputUrl, currentUrl]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleNavigate();
      }
    },
    [handleNavigate]
  );

  const rememberRecentTask = useCallback((task: string) => {
    setRecentTasks((prev) => {
      const deduped = prev.filter((entry) => entry.task !== task);
      return [{ task, timestamp: Date.now() }, ...deduped].slice(0, MAX_RECENT_TASKS);
    });
  }, []);

  const handleExecuteTask = useCallback(async () => {
    const task = agentTask.trim();
    if (!task) {
      toast.error(t('linkPreview.enterTaskFirst'));
      return;
    }

    const bridge = bridgeRef.current;
    if (!bridge) {
      toast.error(t('linkPreview.bridgeNotReady'));
      appendBridgeLog('error', t('linkPreview.logs.executionFailedBridgeNotReady'));
      return;
    }

    setIsExecutingTask(true);
    setIsStoppingTask(false);
    appendBridgeLog('info', `${t('linkPreview.logs.executingTask')}: ${task}`);
    try {
      const result = await bridge.executeTask(task);
      const resultText = stringifyExecutionResult(result);
      appendBridgeLog('info', `${t('linkPreview.logs.executionCompleted')}: ${resultText}`);
      setLastExecutionResult({
        task,
        summary: summarizeExecutionResult(result),
        output: resultText,
        level: 'info',
        timestamp: Date.now(),
      });
      rememberRecentTask(task);
      await syncBridgeSummary();
      toast.success(t('linkPreview.taskCompleted'));
    } catch (bridgeError) {
      const message = bridgeError instanceof Error ? bridgeError.message : t('linkPreview.pageTaskFailed');
      if (message.toLowerCase().includes('aborted')) {
        appendBridgeLog('info', message);
        setBridgeStatus(runtimeAvailableRef.current ? 'ready' : 'runtime-unavailable');
        setLastExecutionResult({
          task,
          summary: t('linkPreview.taskAbortedByUser'),
          output: message,
          level: 'neutral',
          timestamp: Date.now(),
        });
        return;
      }
      setBridgeStatus('error');
      appendBridgeLog('error', message);
      setLastExecutionResult({
        task,
        summary: message,
        output: message,
        level: 'error',
        timestamp: Date.now(),
      });
      toast.error(message);
    } finally {
      setIsStoppingTask(false);
      setIsExecutingTask(false);
    }
  }, [agentTask, appendBridgeLog, rememberRecentTask, syncBridgeSummary, t]);

  const handleAgentTaskKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isExecutingTask) {
          void handleExecuteTask();
        }
      }
    },
    [handleExecuteTask, isExecutingTask]
  );

  const handleCopyLastResult = useCallback(async () => {
    if (!lastExecutionResult) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastExecutionResult.output);
      toast.success(t('linkPreview.resultCopied'));
    } catch {
      toast.error(t('linkPreview.failedToCopyResult'));
    }
  }, [lastExecutionResult, t]);

  const handleStopTask = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    try {
      setIsStoppingTask(true);
      await bridge.stopTask();
      appendBridgeLog('info', t('linkPreview.logs.stopRequested'));
      toast.success(t('linkPreview.stopRequested'));
    } catch (bridgeError) {
      const message = bridgeError instanceof Error ? bridgeError.message : t('linkPreview.failedToStopTask');
      appendBridgeLog('error', message);
      toast.error(message);
      setIsStoppingTask(false);
    }
  }, [appendBridgeLog, t]);

  const handleReuseRecentTask = useCallback((task: string) => {
    setAgentTask(task);
  }, []);

  const handleClearRecentTasks = useCallback(() => {
    setRecentTasks([]);
  }, []);

  const statusMeta = useMemo(() => {
    switch (bridgeStatus) {
      case 'ready':
        return { label: t('linkPreview.status.ready'), className: 'bg-emerald-500' };
      case 'runtime-unavailable':
        return { label: t('linkPreview.status.runtimeUnavailable'), className: 'bg-amber-500' };
      case 'running':
        return { label: t('linkPreview.status.running'), className: 'bg-sky-500' };
      case 'error':
        return { label: t('linkPreview.status.error'), className: 'bg-red-500' };
      default:
        return { label: t('linkPreview.status.connecting'), className: 'bg-slate-400' };
    }
  }, [bridgeStatus, t]);

  const quickTasks = useMemo(() => {
    const tasks = [t('linkPreview.quickTasks.switchLanguage'), t('linkPreview.quickTasks.summarizePage')];

    if ((pageSummary?.forms || 0) > 0 || (pageSummary?.inputs || 0) > 2) {
      tasks.push(t('linkPreview.quickTasks.identifyForms'));
    }

    if ((pageSummary?.buttons || 0) > 0) {
      tasks.push(t('linkPreview.quickTasks.listControls'));
    }

    if ((pageSummary?.buttons || 0) > 6) {
      tasks.push(t('linkPreview.quickTasks.nextAction'));
    }

    return tasks;
  }, [pageSummary?.buttons, pageSummary?.forms, pageSummary?.inputs, t]);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={deviceMode === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('linkPreview.devices.desktop')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={deviceMode === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceMode('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('linkPreview.devices.tablet')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={deviceMode === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('linkPreview.devices.mobile')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        <span className="hidden items-center gap-2 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground md:inline-flex">
          <span className={`h-2 w-2 rounded-full ${statusMeta.className}`} />
          {statusMeta.label}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAgentPanel ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowAgentPanel((prev) => !prev)}
            >
              <Bot className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showAgentPanel ? t('linkPreview.hideAiPanel') : t('linkPreview.showAiPanel')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAddressBar ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowAddressBar((prev) => !prev)}
            >
              {showAddressBar ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showAddressBar ? t('linkPreview.hideAddressBar') : t('linkPreview.showAddressBar')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('linkPreview.copyLink')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('linkPreview.refresh')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('linkPreview.openInNewTab')}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  const canRunTask = bridgeStatus !== 'connecting' && bridgeStatus !== 'runtime-unavailable';

  return (
    <Sheet open={showAgentPanel} onOpenChange={setShowAgentPanel} modal={false}>
      <PreviewContainer
        title={title || t('linkPreview.title')}
        icon={<Link2 className="h-4 w-4" />}
        toolbar={toolbar}
        className={className}
      >
        <div className="flex h-full flex-col">
          {showAddressBar && (
            <div className="flex items-center gap-2 border-b bg-muted/10 px-4 py-2">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="url"
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleNavigate}
                placeholder={t('linkPreview.enterUrl')}
                className="h-7 flex-1 text-sm"
              />
            </div>
          )}

          <div className="flex flex-1 items-stretch justify-center overflow-hidden">
            {error ? (
              <PreviewError
                message={t('linkPreview.unableToLoadPage')}
                description={t('linkPreview.embeddingBlocked')}
                onRetry={handleRefresh}
              />
            ) : (
              <div
                className="relative h-full w-full overflow-hidden transition-all duration-300"
                style={{ maxWidth: DEVICE_SIZES[deviceMode].width }}
              >
                {isLoading && (
                  <div className="absolute inset-0 z-10 bg-background">
                    <PreviewLoading message={t('linkPreview.loadingPage')} />
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  key={key}
                  src={currentUrl}
                  className="h-full w-full border-0"
                  title={title || currentUrl}
                  onLoad={() => {
                    setIsLoading(false);
                    window.setTimeout(() => {
                      void syncBridgeSummary();
                    }, 300);
                  }}
                  onError={() => {
                    setIsLoading(false);
                    setError(t('linkPreview.failedToLoadPage'));
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}
          </div>
        </div>
      </PreviewContainer>

      <SheetContent
        side="right"
        showOverlay={false}
        className="flex h-[100dvh] max-h-[100dvh] w-[92vw] flex-col overflow-hidden p-0 sm:max-w-[380px] lg:max-w-[420px]"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <SheetTitle className="text-left">{t('linkPreview.pageAgentTitle')}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
              <span className={`h-2 w-2 rounded-full ${statusMeta.className}`} />
              {statusMeta.label}
            </span>
            {pageSummary && (
              <>
                <span>{t('linkPreview.summary.formsInline', { count: pageSummary.forms })}</span>
                <span>{t('linkPreview.summary.inputsInline', { count: pageSummary.inputs })}</span>
                <span>{t('linkPreview.summary.buttonsInline', { count: pageSummary.buttons })}</span>
              </>
            )}
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {pageSummary && (
              <div className="mb-4 grid grid-cols-3 gap-2 rounded-md border bg-muted/20 p-3 text-center text-xs">
                <div>
                  <div className="font-medium text-foreground">{pageSummary.forms}</div>
                  <div className="text-muted-foreground">{t('linkPreview.summary.forms')}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">{pageSummary.inputs}</div>
                  <div className="text-muted-foreground">{t('linkPreview.summary.inputs')}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">{pageSummary.buttons}</div>
                  <div className="text-muted-foreground">{t('linkPreview.summary.buttons')}</div>
                </div>
              </div>
            )}

            {lastExecutionResult && (
              <div className={`mb-4 rounded-md border p-3 ${getResultCardClassName(lastExecutionResult.level)}`}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium">
                      {t(`linkPreview.resultHeadings.${getResultHeading(lastExecutionResult.level)}`)}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {lastExecutionResult.task}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      onClick={() => void handleCopyLastResult()}
                      aria-label={t('linkPreview.copyLastResult')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(lastExecutionResult.timestamp).toLocaleTimeString(dateTimeLocale)}
                    </div>
                  </div>
                </div>
                <div className="mb-2 rounded bg-background/70 p-2 text-[11px] text-foreground">
                  {lastExecutionResult.summary}
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-background/70 p-2 text-[11px] text-muted-foreground">
                  {lastExecutionResult.output}
                </pre>
              </div>
            )}

            <div className="space-y-3 rounded-md border bg-background/80 p-3">
              <Textarea
                value={agentTask}
                onChange={(event) => setAgentTask(event.target.value)}
                onKeyDown={handleAgentTaskKeyDown}
                placeholder={t('linkPreview.taskPlaceholder')}
                className="min-h-[120px] resize-none text-sm"
                disabled={isExecutingTask}
              />
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>
                  {isStoppingTask
                    ? t('linkPreview.stoppingTaskHint')
                    : isExecutingTask
                      ? t('linkPreview.runningTaskHint')
                      : t('linkPreview.runShortcutHint')}
                </div>
                <div>{t('linkPreview.keepPreviewOpen')}</div>
                {!canRunTask && (
                  <div>
                    {bridgeStatus === 'runtime-unavailable'
                      ? t('linkPreview.runtimeUnavailableHint')
                      : t('linkPreview.waitingForBridge')}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTasks.map((task) => (
                  <Button
                    key={task}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-7 max-w-full rounded-full px-3 py-1 text-left text-xs"
                    onClick={() => setAgentTask(task)}
                    disabled={isExecutingTask}
                  >
                    <span className="truncate">{task}</span>
                  </Button>
                ))}
              </div>
              {recentTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {t('linkPreview.recentTasks')}
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      onClick={handleClearRecentTasks}
                      disabled={isExecutingTask}
                    >
                      {t('linkPreview.clearRecentTasks')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentTasks.map((entry) => (
                      <Button
                        key={`${entry.task}-${entry.timestamp}`}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-auto min-h-7 max-w-full rounded-full border px-3 py-1 text-left text-xs"
                        onClick={() => handleReuseRecentTask(entry.task)}
                        disabled={isExecutingTask}
                      >
                        <span className="truncate">{entry.task}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Collapsible
              open={showLogs}
              onOpenChange={setShowLogs}
              className="mt-4 overflow-hidden rounded-md border bg-background/80"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium"
                >
                  <span>
                    {t('linkPreview.bridgeLog')}
                    <span className="ml-2 text-muted-foreground">{bridgeLogs.length}</span>
                  </span>
                  {showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-64 space-y-1 overflow-auto border-t px-3 py-2 text-xs">
                  {bridgeLogs.length === 0 ? (
                    <p className="text-muted-foreground">{t('linkPreview.noEventsYet')}</p>
                  ) : (
                    bridgeLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className={entry.level === 'error' ? 'text-destructive' : 'text-muted-foreground'}
                      >
                        <span className="mr-2 text-[10px] opacity-70">
                          {new Date(entry.timestamp).toLocaleTimeString(dateTimeLocale)}
                        </span>
                        <span>{entry.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="shrink-0 border-t bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void handleExecuteTask()} disabled={isExecutingTask || !canRunTask}>
                {isExecutingTask ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                {isExecutingTask ? t('linkPreview.running') : t('linkPreview.runTask')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleStopTask()}
                disabled={!isExecutingTask || isStoppingTask}
              >
                {isStoppingTask ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-1.5 h-4 w-4" />
                )}
                {isStoppingTask ? t('linkPreview.stopping') : t('linkPreview.stop')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void syncBridgeSummary()}
                disabled={isExecutingTask}
              >
                {t('linkPreview.syncSummary')}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
