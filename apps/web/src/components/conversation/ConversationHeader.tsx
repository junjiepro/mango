/**
 * Conversation Header Component
 * 紧凑型会话顶部栏 - 合并导航、会话信息和标签页
 * 支持响应式布局
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Laptop,
  Package,
  PanelRight,
  Plus,
  MessageSquare,
  Settings,
  X,
  Loader2,
  Monitor,
  Pencil,
  Check,
  MoreVertical,
  FolderOpen,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SessionTabs } from './SessionTabs';
import { WorkingDirectorySelector } from '@/components/workspace/WorkingDirectorySelector';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import type { SessionTab } from '@/types/session.types';
import type { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';

type DeviceBinding = Database['public']['Tables']['device_bindings']['Row'];

interface ConversationItem {
  id: string;
  title: string;
  description?: string | null;
  updated_at: string | null;
  created_at: string;
  stats?: {
    message_count?: number;
    task_count?: number;
  } | null;
}

interface ConversationHeaderProps {
  // 会话信息
  conversationId: string;
  conversationTitle: string;
  conversationDescription?: string;
  onTitleChange?: (newTitle: string) => Promise<void>;

  // 会话标签页
  sessions: SessionTab[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onCreateACPSession: () => void;

  // 设备相关
  devices: DeviceBinding[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;

  // 工作目录
  currentWorkingDirectory?: string;
  recentPaths?: any[];
  onWorkingDirectoryChange?: (path: string) => void;
  onLoadWorkspaceHistory?: () => Promise<void>;

  // 工作区
  showWorkspace: boolean;
  onToggleWorkspace: () => void;

  // 连接状态
  isRealtimeConnected: boolean;

  // MiniApp
  onOpenMiniAppSelector?: () => void;
}

export function ConversationHeader({
  conversationId,
  conversationTitle,
  onTitleChange,
  sessions,
  activeSessionId,
  onSessionChange,
  onSessionClose,
  onCreateACPSession,
  devices,
  selectedDeviceId,
  onDeviceChange,
  currentWorkingDirectory,
  recentPaths = [],
  onWorkingDirectoryChange,
  onLoadWorkspaceHistory,
  showWorkspace,
  onToggleWorkspace,
  isRealtimeConnected,
  onOpenMiniAppSelector,
}: ConversationHeaderProps) {
  const router = useRouter();
  const { isFullscreenMode } = useWorkspaceLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showMobileWorkingDir, setShowMobileWorkingDir] = useState(false);

  // 标题编辑状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(conversationTitle);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 开始编辑标题
  const handleStartEditTitle = () => {
    setEditingTitle(conversationTitle);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  // 保存标题
  const handleSaveTitle = async () => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle || trimmedTitle === conversationTitle) {
      setIsEditingTitle(false);
      return;
    }

    setSavingTitle(true);
    try {
      await onTitleChange?.(trimmedTitle);
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to save title:', err);
    } finally {
      setSavingTitle(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingTitle(conversationTitle);
    setIsEditingTitle(false);
  };

  // 加载会话列表
  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/conversations?limit=20');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // 抽屉打开时加载会话列表
  useEffect(() => {
    if (drawerOpen) {
      loadConversations();
    }
  }, [drawerOpen]);

  // 切换到其他会话
  const handleSwitchConversation = (id: string) => {
    setDrawerOpen(false);
    router.push(`/conversations/${id}`);
  };

  // 新建会话
  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新对话' }),
      });
      if (response.ok) {
        const data = await response.json();
        setDrawerOpen(false);
        router.push(`/conversations/${data.conversation.id}`);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  return (
    <header className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center gap-2 px-2">
        {/* 左侧：抽屉触发 + 标题 */}
        <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                title="导航菜单"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle
                  className="text-left cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push('/');
                  }}
                >
                  Mango
                </SheetTitle>
              </SheetHeader>

              {/* 导航菜单 */}
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push('/conversations');
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  对话列表
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push('/settings/devices');
                  }}
                >
                  <Monitor className="h-4 w-4" />
                  设备管理
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push('/miniapps');
                  }}
                >
                  <Package className="h-4 w-4" />
                  应用管理
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push('/settings');
                  }}
                >
                  <Settings className="h-4 w-4" />
                  设置
                </Button>
              </div>

              <Separator />

              {/* 新建会话 */}
              <div className="p-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-9"
                  onClick={handleNewConversation}
                >
                  <Plus className="h-4 w-4" />
                  新建对话
                </Button>
              </div>

              <Separator />

              {/* 最近会话列表 */}
              <div className="flex-1">
                <div className="px-4 py-2 text-xs text-muted-foreground font-medium">最近对话</div>
                <ScrollArea className="h-[calc(100vh-320px)]">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      暂无对话
                    </div>
                  ) : (
                    <div className="px-2 space-y-0.5">
                      {conversations.map((conv) => {
                        const isCurrentConv = conv.id === conversationId;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => handleSwitchConversation(conv.id)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors group',
                              isCurrentConv
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            {/* 标题行 */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">{conv.title}</span>
                              <span
                                className={cn(
                                  'text-xs whitespace-nowrap flex-shrink-0',
                                  isCurrentConv
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatDate(conv.updated_at || conv.created_at)}
                              </span>
                            </div>
                            {/* 描述 - hover 时显示 */}
                            {conv.description && (
                              <div
                                className={cn(
                                  'mt-1 text-xs truncate',
                                  isCurrentConv
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground hidden group-hover:block'
                                )}
                              >
                                {conv.description}
                              </div>
                            )}
                            {/* 统计信息 - hover 时显示 */}
                            {conv.stats && (
                              <div
                                className={cn(
                                  'mt-1 flex gap-3 text-xs',
                                  isCurrentConv
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground hidden group-hover:flex'
                                )}
                              >
                                <span>{conv.stats.message_count || 0} 条消息</span>
                                <span>{conv.stats.task_count || 0} 个任务</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>

          {/* 标题 - 支持编辑 */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                ref={titleInputRef}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="h-7 w-[140px] sm:w-[180px] text-sm"
                disabled={savingTitle}
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleSaveTitle}
                disabled={savingTitle}
              >
                {savingTitle ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancelEdit}
                disabled={savingTitle}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={handleStartEditTitle}
              className="flex items-center gap-1 group hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
              title="点击编辑标题"
            >
              <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[160px]">
                {conversationTitle}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* 分隔线 - 小屏幕隐藏 */}
        <div className="h-5 w-px bg-border flex-shrink-0 hidden sm:block" />

        {/* 中间：会话标签页 - 小屏幕下隐藏 */}
        <SessionTabs
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionChange={onSessionChange}
          onSessionClose={onSessionClose}
          onCreateACPSession={onCreateACPSession}
          disableCreateSession={!selectedDeviceId}
          compact
          className="flex-1 min-w-0 overflow-x-auto scrollbar-none hidden sm:flex"
        />

        {/* 分隔线 - 小屏幕隐藏 */}
        <div className="h-5 w-px bg-border flex-shrink-0 hidden sm:block" />

        {/* 右侧：工具栏 */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
          {/* 设备选择器 - 大屏幕显示完整，小屏幕只显示图标 */}
          <Select value={selectedDeviceId || 'none'} onValueChange={onDeviceChange}>
            <SelectTrigger className="w-16 sm:w-[100px] h-8 text-xs [&>span]:hidden sm:[&>span]:inline-flex">
              <Laptop className="h-4 w-4 sm:hidden" />
              <SelectValue className="" placeholder="设备">
                {selectedDeviceId ? (
                  <div className="flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {devices.find((d) => d.id === selectedDeviceId)?.binding_name || '设备'}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">无设备</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">不使用设备</span>
              </SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-2">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>{device.binding_name}</span>
                    {device.status === 'active' && (
                      <span className="text-xs text-green-600">●</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 工作目录选择器 - 小屏幕隐藏 */}
          {selectedDeviceId && onWorkingDirectoryChange && (
            <div className="hidden sm:block">
              <WorkingDirectorySelector
                currentPath={currentWorkingDirectory || ''}
                recentPaths={recentPaths}
                onPathChange={onWorkingDirectoryChange}
                onLoadHistory={onLoadWorkspaceHistory}
                compact
              />
            </div>
          )}

          {/* MiniApp 按钮 - 小屏幕隐藏 */}
          {onOpenMiniAppSelector && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hidden sm:inline-flex"
              onClick={onOpenMiniAppSelector}
              title="小应用"
            >
              <Package className="h-4 w-4" />
            </Button>
          )}

          {/* 工作区切换按钮 */}
          <Button
            variant={showWorkspace ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={onToggleWorkspace}
            title={showWorkspace ? '关闭工作区' : '打开工作区'}
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          {/* 小屏幕下的更多菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 space-y-1">
              {/* 会话切换 */}
              {sessions.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">会话</div>
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isRunning =
                      session.runningStatus === 'streaming' ||
                      session.runningStatus === 'submitted';
                    return (
                      <DropdownMenuItem
                        key={session.id}
                        onClick={() => onSessionChange(session.id)}
                        className={cn('flex items-center justify-between', isActive && 'bg-accent')}
                      >
                        <div className="flex items-center gap-2">
                          {/* 图标：运行中显示加载动画，否则显示类型图标 */}
                          {isRunning && !isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : session.type === 'mango' ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          <span className="truncate">{session.label}</span>
                        </div>
                        {session.type !== 'mango' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSessionClose(session.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              {/* 新建会话 */}
              <DropdownMenuItem onClick={onCreateACPSession} disabled={!selectedDeviceId}>
                <Plus className="h-4 w-4" />
                新建 Agent 会话
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 工作目录 - 点击打开独立弹窗 */}
              {selectedDeviceId && onWorkingDirectoryChange && (
                <>
                  <DropdownMenuItem onClick={() => setShowMobileWorkingDir(true)}>
                    <FolderOpen className="h-4 w-4" />
                    <span className="truncate flex-1">
                      {currentWorkingDirectory || '选择工作目录'}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* MiniApp */}
              {onOpenMiniAppSelector && (
                <DropdownMenuItem onClick={onOpenMiniAppSelector}>
                  <Package className="h-4 w-4" />
                  小应用
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 连接状态指示器 */}
          <div
            className={cn(
              'h-2 w-2 rounded-full flex-shrink-0',
              isRealtimeConnected ? 'bg-green-500' : 'bg-gray-400'
            )}
            title={isRealtimeConnected ? '已连接' : '未连接'}
          />
        </div>
      </div>

      {/* 小屏幕下的独立工作目录选择器 */}
      {selectedDeviceId && onWorkingDirectoryChange && (
        <Sheet open={showMobileWorkingDir} onOpenChange={setShowMobileWorkingDir}>
          <SheetContent side="bottom" className="h-[50vh]">
            <SheetHeader>
              <SheetTitle>选择工作目录</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <WorkingDirectorySelector
                className="max-w-full"
                currentPath={currentWorkingDirectory || ''}
                recentPaths={recentPaths}
                onPathChange={(path) => {
                  onWorkingDirectoryChange(path);
                  setShowMobileWorkingDir(false);
                }}
                onLoadHistory={onLoadWorkspaceHistory}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
