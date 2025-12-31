/**
 * Conversation Detail Page
 * T055: Create conversation detail page
 */

'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext';
import { MessageList } from '@/components/conversation/MessageList';
import { MessageInput } from '@/components/conversation/MessageInput';
import { TaskProgressIndicator } from '@/components/task/TaskProgressIndicator';
import { AppHeader } from '@/components/layouts/AppHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MiniAppWindow } from '@/components/miniapp/MiniAppWindow';
import { MiniAppQuickAccess } from '@/components/conversation/MiniAppQuickAccess';
import { Package, Laptop } from 'lucide-react';
import type { Database } from '@/types/database.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeviceCache } from '@/lib/deviceCache';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];
type DeviceBinding = Database['public']['Tables']['device_bindings']['Row'];

/**
 * 对话详情内容组件
 */
function ConversationDetailContent() {
  const {
    currentConversation,
    messages,
    isLoadingMessages,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    tasks,
    isRealtimeConnected,
    error,
  } = useConversation();

  const router = useRouter();
  const [miniAppDialogOpen, setMiniAppDialogOpen] = useState(false);
  const [selectedMiniApp, setSelectedMiniApp] = useState<{
    miniApp: MiniApp;
    installation: MiniAppInstallation;
  } | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loadingDevices, setLoadingDevices] = useState(false);

  // 加载设备列表
  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await fetch('/api/devices');
      const result = await response.json();

      if (response.ok && result.devices) {
        setDevices(result.devices || []);

        // 初始化设备选择:优先使用会话保存的设备,其次使用缓存的默认设备
        if (currentConversation?.device_id) {
          setSelectedDeviceId(currentConversation.device_id);
        } else {
          const cachedDeviceId = DeviceCache.getDefaultDeviceId();
          if (cachedDeviceId) {
            setSelectedDeviceId(cachedDeviceId);
          }
        }
      } else {
        console.error('Failed to load devices:', result.error);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  // 处理设备选择变化
  const handleDeviceChange = async (deviceId: string) => {
    const actualDeviceId = deviceId === 'none' ? '' : deviceId;
    setSelectedDeviceId(actualDeviceId);

    // 保存到本地缓存
    DeviceCache.setDefaultDeviceId(actualDeviceId);

    // 保存到数据库
    if (currentConversation?.id) {
      try {
        const response = await fetch(`/api/conversations/${currentConversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: actualDeviceId || null,
          }),
        });

        if (!response.ok) {
          console.error('Failed to save device selection to conversation');
        }
      } catch (error) {
        console.error('Failed to save device selection:', error);
      }
    }
  };

  // 加载已安装的 MiniApp
  const loadInstallations = async () => {
    setLoadingInstallations(true);
    try {
      const response = await fetch('/api/miniapps/installations');
      const result = await response.json();

      if (result.success) {
        setInstallations(result.data);
      }
    } catch (error) {
      console.error('Failed to load installations:', error);
    } finally {
      setLoadingInstallations(false);
    }
  };

  // 打开 MiniApp 选择器
  const handleOpenMiniAppSelector = () => {
    loadInstallations();
    setMiniAppDialogOpen(true);
  };

  // 选择 MiniApp
  const handleSelectMiniApp = (installation: any) => {
    setSelectedMiniApp({
      miniApp: installation.mini_app,
      installation: installation,
    });
    setMiniAppDialogOpen(false);
  };

  // 打开 MiniApp（从消息或快速访问栏）
  const handleOpenMiniApp = (miniApp: MiniApp, installation: MiniAppInstallation) => {
    setSelectedMiniApp({ miniApp, installation });
  };

  // 包装 sendMessage 以传递 deviceId
  const handleSendMessage = async (
    content: string,
    attachments?: any[],
    miniAppData?: { miniAppId: string; installationId: string }
  ) => {
    return sendMessage(content, attachments, miniAppData, selectedDeviceId || undefined);
  };

  React.useEffect(() => {
    loadInstallations();
    loadDevices();
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">加载对话失败</p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => router.push('/conversations')} className="mt-4">
            返回对话列表
          </Button>
        </div>
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 对话信息栏 */}
      <div className="border-b bg-muted/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/conversations')}>
              ← 返回
            </Button>
            <div>
              <h1 className="font-semibold">{currentConversation.title}</h1>
              {currentConversation.description && (
                <p className="text-xs text-muted-foreground">{currentConversation.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 设备选择器 */}
            <Select value={selectedDeviceId || 'none'} onValueChange={handleDeviceChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="选择设备">
                  {selectedDeviceId ? (
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4" />
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
                      <Laptop className="h-4 w-4" />
                      <span>{device.binding_name}</span>
                      {device.status === 'active' && (
                        <span className="text-xs text-green-600">●</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* MiniApp 按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenMiniAppSelector}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              小应用
            </Button>

            {/* 实时连接状态 */}
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  isRealtimeConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-muted-foreground">
                {isRealtimeConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 消息列表 */}
        <div className="flex flex-1 flex-col">
          <MessageList
            conversationId={currentConversation.id}
            messages={messages}
            installations={installations}
            isLoading={isLoadingMessages}
            hasMore={hasMoreMessages}
            onLoadMore={loadMoreMessages}
            onOpenMiniApp={handleOpenMiniApp}
            className="flex-1"
          />

          {/* 消息输入框 */}
          <div className="bg-background p-4">
            <div className="container mx-auto max-w-4xl">
              <MessageInput
                onSendMessage={handleSendMessage}
                placeholder="输入消息... (Ctrl+Enter 发送)"
              />
              {/* MiniApp 快速访问栏 */}
              {showQuickAccess && (
                <MiniAppQuickAccess
                  messages={messages}
                  installations={installations}
                  onOpenMiniApp={handleOpenMiniApp}
                  onClose={() => setShowQuickAccess(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* 侧边栏 - 任务列表 */}
        {tasks.length > 0 && (
          <div className="w-80 border-l bg-muted/40 p-4 overflow-y-auto">
            <h3 className="mb-4 font-semibold">运行中的任务</h3>
            <div className="space-y-3">
              {tasks
                .filter((task) => ['pending', 'queued', 'running'].includes(task.status))
                .map((task) => (
                  <TaskProgressIndicator key={task.id} task={task} />
                ))}
            </div>

            {tasks.some((task) => ['completed', 'failed'].includes(task.status)) && (
              <>
                <h3 className="mb-4 mt-6 font-semibold">已完成的任务</h3>
                <div className="space-y-3">
                  {tasks
                    .filter((task) => ['completed', 'failed'].includes(task.status))
                    .slice(0, 5)
                    .map((task) => (
                      <TaskProgressIndicator key={task.id} task={task} />
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MiniApp 选择器弹窗 */}
      <Dialog open={miniAppDialogOpen} onOpenChange={setMiniAppDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>选择小应用</DialogTitle>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {loadingInstallations ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border animate-pulse"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : installations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">暂无已安装的小应用</p>
                <Button variant="outline" size="sm" onClick={() => router.push('/miniapps')}>
                  前往应用商店
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {installations.map((installation) => {
                  const miniApp = installation.mini_app;
                  if (!miniApp) return null;

                  return (
                    <button
                      key={installation.id}
                      onClick={() => handleSelectMiniApp(installation)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors text-left"
                    >
                      {miniApp.icon_url ? (
                        <img
                          src={miniApp.icon_url}
                          alt={miniApp.display_name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-5 w-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {installation.custom_name || miniApp.display_name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {miniApp.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MiniApp 窗口弹窗 */}
      {selectedMiniApp && (
        <Dialog open={!!selectedMiniApp} onOpenChange={(open) => !open && setSelectedMiniApp(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh] p-0">
            <MiniAppWindow
              miniApp={selectedMiniApp.miniApp}
              installation={selectedMiniApp.installation}
              onClose={() => setSelectedMiniApp(null)}
              className="h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * 对话详情页面
 */
export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <ConversationProvider conversationId={id}>
      <div className="flex h-screen flex-col">
        <AppHeader />
        <div className="flex-1 overflow-hidden">
          <ConversationDetailContent />
        </div>
      </div>
    </ConversationProvider>
  );
}
