/**
 * Conversation Detail Page
 * T055: Create conversation detail page
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext';
import { MessageList } from '@/components/conversation/MessageList';
import { MessageInput } from '@/components/conversation/MessageInput';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MiniAppWindow } from '@/components/miniapp/MiniAppWindow';
import { ResourceQuickAccess } from '@/components/conversation/ResourceQuickAccess';
import {
  ResourcePreviewDialog,
  canPreviewInDialog,
} from '@/components/conversation/ResourcePreviewDialog';
import { Package } from 'lucide-react';
import type { Database } from '@/types/database.types';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { DeviceCache } from '@/lib/deviceCache';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { useResourceSniffer } from '@/hooks/useResourceSniffer';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { ACPSessionCreateDialog } from '@/components/conversation/ACPSessionCreateDialog';
import { ACPChatWrapper } from '@/components/acp/ACPChatWrapper';
import { useACPSession } from '@/hooks/useACPSession';
import { useDeviceClient } from '@/hooks/useDeviceClient';
import type { ACPAgent } from '@/hooks/useACPSession';
import { WorkingDirectorySwitchDialog } from '@/components/workspace/WorkingDirectorySwitchDialog';
import { ConversationHeader } from '@/components/conversation/ConversationHeader';

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
    setCurrentConversation,
  } = useConversation();

  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 参数：workspace=apps&miniAppId=xxx
  const urlWorkspace = searchParams.get('workspace');
  const urlMiniAppId = searchParams.get('miniAppId');

  const [miniAppDialogOpen, setMiniAppDialogOpen] = useState(false);
  const [selectedMiniApp, setSelectedMiniApp] = useState<{
    miniApp: MiniApp;
    installation: MiniAppInstallation;
  } | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loadingDevices, setLoadingDevices] = useState(false);
  // 工作区应用管理状态
  const [selectedWorkspaceMiniAppId, setSelectedWorkspaceMiniAppId] = useState<string | null>(
    urlMiniAppId
  );
  // 资源预览状态
  const [previewResource, setPreviewResource] = useState<DetectedResource | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  // 待在工作区中打开的资源
  const [pendingResource, setPendingResource] = useState<DetectedResource | null>(null);

  // 工作区状态持久化
  const { getInitialState, saveState } = useWorkspaceState(currentConversation?.id);
  const initialLayoutState = React.useRef(getInitialState());
  const isLayoutInitializedRef = React.useRef(false);
  const isLayoutRestoringRef = React.useRef(false);

  // 使用持久化的初始值
  const [showQuickAccess, setShowQuickAccess] = useState(
    initialLayoutState.current.showQuickAccess
  );
  const [showWorkspace, setShowWorkspace] = useState(initialLayoutState.current.showWorkspace);
  const [workspacePanelSize, setWorkspacePanelSize] = useState(
    initialLayoutState.current.workspacePanelSize
  );

  // ACP 会话管理
  const {
    sessions,
    activeSessionId,
    loading: sessionsLoading,
    error: sessionsError,
    addACPSession,
    removeSession,
    switchSession,
    getActiveSession,
    updateSessionMessages,
    getSessionMessages,
    updateSessionActivation,
    updateSessionRunningStatus,
    checkWorkingDirectoryMismatch,
  } = useSessionManager(currentConversation?.id || '');

  const [showACPCreateDialog, setShowACPCreateDialog] = useState(false);

  // 工作目录状态
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState<string>('');
  const [recentPaths, setRecentPaths] = useState<any[]>([]);

  // 工作目录切换提示对话框状态
  const [showDirSwitchDialog, setShowDirSwitchDialog] = useState(false);
  const [pendingSessionSwitch, setPendingSessionSwitch] = useState<{
    sessionId: string;
    targetDirectory: string;
    sessionName: string;
  } | null>(null);

  // 获取当前选中的设备对象
  const [selectedDevice, setSelectedDevice] = useState<DeviceBinding | undefined>(undefined);

  const loadDevice = async (id: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('设备未找到');
        }
        throw new Error('加载设备信息失败');
      }

      const data = await response.json();
      setSelectedDevice(data.device);
    } catch (err) {
      console.error('Failed to load device:', id, err);
    }
  };

  React.useEffect(() => {
    if (selectedDeviceId) loadDevice(selectedDeviceId);
  }, [selectedDeviceId]);

  // 标记布局初始化完成
  React.useEffect(() => {
    isLayoutInitializedRef.current = true;
  }, []);

  // 当 conversationId 变化时，恢复布局状态
  const prevConversationIdRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const convId = currentConversation?.id;
    if (convId && convId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = convId;
      isLayoutRestoringRef.current = true;

      const savedState = getInitialState();
      setShowWorkspace(savedState.showWorkspace);
      setShowQuickAccess(savedState.showQuickAccess);
      setWorkspacePanelSize(savedState.workspacePanelSize);

      setTimeout(() => {
        isLayoutRestoringRef.current = false;
      }, 500);
    }
  }, [currentConversation?.id, getInitialState]);

  // 保存布局状态
  React.useEffect(() => {
    if (isLayoutInitializedRef.current && !isLayoutRestoringRef.current) {
      saveState({ showWorkspace, showQuickAccess, workspacePanelSize });
    }
  }, [showWorkspace, showQuickAccess, workspacePanelSize, saveState]);

  // 初始化设备客户端
  const { client: deviceClient } = useDeviceClient(selectedDevice);

  // 初始化 ACP Session Hook
  const { createSession: createACPSessionAPI } = useACPSession(deviceClient);

  // 资源嗅探
  const { resources } = useResourceSniffer(messages);

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

  // 处理资源点击
  const handleResourceClick = (resource: DetectedResource) => {
    // 判断资源是否可以弹窗预览
    if (canPreviewInDialog(resource)) {
      // 可弹窗预览类型
      if (!showWorkspace) {
        // 工作区未激活，弹窗预览
        setPreviewResource(resource);
        setShowPreviewDialog(true);
      } else {
        // 工作区已激活，在工作区中预览
        setPendingResource(resource);
      }
    } else {
      // 不可弹窗预览类型，激活工作区并在其中预览
      setShowWorkspace(true);
      setPendingResource(resource);
    }
  };

  // 处理图片点击
  const handleImageClick = (url: string, filename?: string) => {
    // 优先从已嗅探资源中匹配，保证与资源快速访问栏使用同一资源对象
    const existing = resources.find(
      (r) => r.type === 'image' && (r.metadata?.url === url || r.metadata?.src === url)
    );
    if (existing) {
      handleResourceClick(existing);
      return;
    }
    // 未匹配到时构造临时资源对象
    const imageResource: DetectedResource = {
      id: `image-${url}`,
      type: 'image',
      content: filename || 'Image',
      metadata: { url, filename },
      position: { start: 0, end: 0 },
    };
    handleResourceClick(imageResource);
  };

  // 更新对话标题
  const handleTitleChange = async (newTitle: string) => {
    if (!currentConversation?.id) return;
    const response = await fetch(`/api/conversations/${currentConversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!response.ok) {
      throw new Error('Failed to update title');
    }
    // 更新本地状态
    setCurrentConversation({ ...currentConversation, title: newTitle });
  };

  // 包装 sendMessage 以传递 deviceId
  const handleSendMessage = async (
    content: string,
    attachments?: any[],
    miniAppData?: { miniAppId: string; installationId: string }
  ) => {
    return sendMessage(content, attachments, miniAppData, selectedDeviceId || undefined);
  };

  // 处理创建 ACP 会话
  const handleCreateACPSession = async (agent: ACPAgent, envVars: Record<string, string>) => {
    if (!selectedDeviceId) {
      console.error('No device selected');
      return;
    }

    try {
      // 使用当前工作目录创建会话
      const result = await createACPSessionAPI(
        agent,
        envVars,
        currentWorkingDirectory || undefined
      );
      const actualWorkingDir = result.workingDirectory || currentWorkingDirectory;

      await addACPSession(result.sessionId, selectedDeviceId, agent.name, {
        agentCommand: agent.command,
        agentArgs: agent.args,
        envVars,
        sessionConfig: {
          cwd: actualWorkingDir,
          mcpServers: agent.session?.mcpServers || [],
        },
        workingDirectory: actualWorkingDir,
      });
    } catch (error) {
      console.error('Failed to create ACP session:', error);
      throw error;
    }
  };

  // 处理会话切换（不自动切换工作目录，让用户通过会话内提示自行决定）
  const handleSessionSwitch = async (sessionId: string) => {
    // 直接切换会话，不检查工作目录
    await switchSession(sessionId);
    // 自动激活未激活的 ACP 会话
    await autoActivateSession(sessionId);
  };

  // 自动激活未激活的 ACP 会话
  const autoActivateSession = async (sessionId: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    // 检查设备是否匹配，不匹配则不激活
    if (targetSession?.type === 'acp' && targetSession.deviceId !== selectedDeviceId) {
      return; // 设备不一致，不自动激活
    }
    if (targetSession?.type === 'acp' && !targetSession.isActivated && deviceClient) {
      try {
        // 先获取历史消息
        const messagesResult = await deviceClient.acp.getSessionMessages(
          targetSession.acpSessionId!
        );
        if (messagesResult.messages?.length > 0) {
          updateSessionMessages(sessionId, messagesResult.messages);
        }
        // 激活会话
        const activateResult = await deviceClient.acp.activateSession(targetSession.acpSessionId!);
        if (activateResult.success) {
          updateSessionActivation(sessionId, true);
        }
      } catch (err) {
        console.error('Failed to auto-activate session:', err);
      }
    }
  };

  // 确认切换工作目录
  const handleConfirmDirSwitch = async () => {
    if (!pendingSessionSwitch) return;

    // 切换工作目录
    setCurrentWorkingDirectory(pendingSessionSwitch.targetDirectory);
    // 切换会话
    await switchSession(pendingSessionSwitch.sessionId);
    // 自动激活未激活的 ACP 会话
    await autoActivateSession(pendingSessionSwitch.sessionId);

    // 清理状态
    setShowDirSwitchDialog(false);
    setPendingSessionSwitch(null);
  };

  // 取消切换（保持当前目录但仍切换会话）
  const handleCancelDirSwitch = async () => {
    if (!pendingSessionSwitch) return;

    // 不切换工作目录，但仍切换会话
    await switchSession(pendingSessionSwitch.sessionId);
    // 自动激活未激活的 ACP 会话
    await autoActivateSession(pendingSessionSwitch.sessionId);

    // 清理状态
    setShowDirSwitchDialog(false);
    setPendingSessionSwitch(null);
  };

  // 加载工作目录历史
  const loadWorkspaceHistory = async () => {
    if (!selectedDeviceId) return;
    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/workspace-history`);
      if (response.ok) {
        const data = await response.json();
        setRecentPaths(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load workspace history:', err);
    }
  };

  // 处理工作目录变更
  const handleWorkingDirectoryChange = async (path: string) => {
    setCurrentWorkingDirectory(path);
    // 保存到对话的 metadata 中
    if (currentConversation?.id && path) {
      try {
        const currentMetadata = (currentConversation as any).metadata || {};
        await fetch(`/api/conversations/${currentConversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: { ...currentMetadata, workingDirectory: path },
          }),
        });
      } catch (err) {
        console.error('Failed to save working directory:', err);
      }
    }
    // 记录访问历史
    if (selectedDeviceId && path) {
      try {
        await fetch(`/api/devices/${selectedDeviceId}/workspace-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      } catch (err) {
        console.error('Failed to record path access:', err);
      }
    }
  };

  // 加载工作目录：优先从对话 metadata 读取，否则使用设备默认配置
  React.useEffect(() => {
    const loadWorkingDirectory = async () => {
      // 优先使用对话保存的工作目录
      const savedDir = (currentConversation as any)?.metadata?.workingDirectory;
      if (savedDir) {
        setCurrentWorkingDirectory(savedDir);
        return;
      }
      // 否则使用设备默认工作目录
      if (!deviceClient) return;
      try {
        const result = await deviceClient.config.get();
        if (result.config?.workspaceDir) {
          setCurrentWorkingDirectory(result.config.workspaceDir);
        }
      } catch (err) {
        console.error('Failed to load device config:', err);
      }
    };
    loadWorkingDirectory();
  }, [deviceClient, currentConversation]);

  React.useEffect(() => {
    loadInstallations();
    loadDevices();
  }, []);

  // 处理 URL 参数：自动打开工作区和选中 MiniApp
  React.useEffect(() => {
    if (urlWorkspace === 'apps') {
      setShowWorkspace(true);
    }
    if (urlMiniAppId) {
      setSelectedWorkspaceMiniAppId(urlMiniAppId);
    }
  }, [urlWorkspace, urlMiniAppId]);

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* 紧凑型顶部栏 - 合并导航、会话信息和标签页 */}
      <ConversationHeader
        conversationId={currentConversation.id}
        conversationTitle={currentConversation.title}
        conversationDescription={currentConversation.description || undefined}
        onTitleChange={handleTitleChange}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionChange={handleSessionSwitch}
        onSessionClose={removeSession}
        onCreateACPSession={() => setShowACPCreateDialog(true)}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
        currentWorkingDirectory={currentWorkingDirectory}
        recentPaths={recentPaths}
        onWorkingDirectoryChange={handleWorkingDirectoryChange}
        onLoadWorkspaceHistory={loadWorkspaceHistory}
        showWorkspace={showWorkspace}
        onToggleWorkspace={() => setShowWorkspace(!showWorkspace)}
        isRealtimeConnected={isRealtimeConnected}
        onOpenMiniAppSelector={handleOpenMiniAppSelector}
      />

      {/* 主要内容区域 - ChatLayout 在外层，会话内容在内部切换 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatLayout
          resources={resources}
          showWorkspace={showWorkspace}
          onToggleWorkspace={() => setShowWorkspace(!showWorkspace)}
          deviceId={selectedDeviceId}
          conversationId={currentConversation?.id}
          currentWorkingDirectory={currentWorkingDirectory}
          onWorkingDirectoryChange={handleWorkingDirectoryChange}
          workspacePanelSize={workspacePanelSize}
          onWorkspacePanelSizeChange={setWorkspacePanelSize}
          pendingResource={pendingResource}
          onPendingResourceHandled={() => setPendingResource(null)}
        >
          {/* 同时渲染所有会话，使用 CSS 控制显示/隐藏，保持后台会话运行 */}

          {/* Mango 主会话 */}
          <div className={getActiveSession()?.type === 'mango' ? 'flex flex-col h-full' : 'hidden'}>
            <MessageList
              conversationId={currentConversation.id}
              messages={messages}
              installations={installations}
              isLoading={isLoadingMessages}
              hasMore={hasMoreMessages}
              onLoadMore={loadMoreMessages}
              onOpenMiniApp={handleOpenMiniApp}
              onImageClick={handleImageClick}
              className="flex-1 min-h-0"
            />

            <div className="flex-shrink-0">
              <div className="bg-background p-4">
                <div className="container mx-auto max-w-4xl">
                  <MessageInput onSendMessage={handleSendMessage} />

                  {showQuickAccess && resources.length > 0 && (
                    <ResourceQuickAccess
                      resources={resources}
                      installations={installations}
                      onOpenMiniApp={handleOpenMiniApp}
                      onOpenWorkspace={() => setShowWorkspace(true)}
                      onClose={() => setShowQuickAccess(false)}
                      onResourceClick={handleResourceClick}
                      isWorkspaceActive={showWorkspace}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ACP 会话列表 - 所有会话保持挂载，支持后台运行 */}
          {sessions
            .filter((session) => session.type === 'acp')
            .map((session) => (
              <ACPChatWrapper
                key={session.id}
                sessionId={session.id}
                acpSessionId={session.acpSessionId || ''}
                deviceId={session.deviceId || ''}
                agentName={session.agentName || ''}
                initialMessages={getSessionMessages(session.id)}
                onMessagesChange={(msgs) => updateSessionMessages(session.id, msgs)}
                onStatusChange={(status) => updateSessionRunningStatus(session.id, status)}
                isActivated={session.isActivated ?? true}
                isVisible={activeSessionId === session.id}
                sessionWorkingDirectory={session.workingDirectory}
                currentWorkingDirectory={currentWorkingDirectory}
                onSwitchToSessionDirectory={() => {
                  if (session.workingDirectory) {
                    handleWorkingDirectoryChange(session.workingDirectory);
                  }
                }}
                isDeviceMismatch={!!session.deviceId && session.deviceId !== selectedDeviceId}
                sessionDeviceName={
                  devices.find((d) => d.id === session.deviceId)?.device_name || ''
                }
                currentDeviceName={
                  devices.find((d) => d.id === selectedDeviceId)?.device_name || ''
                }
              />
            ))}
        </ChatLayout>
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
              onClose={() => setSelectedMiniApp(null)}
              className="h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 资源预览弹窗 */}
      <ResourcePreviewDialog
        resource={previewResource}
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
      />

      {/* ACP 会话创建对话框 */}
      <ACPSessionCreateDialog
        open={showACPCreateDialog}
        onOpenChange={setShowACPCreateDialog}
        availableAgents={[
          // TODO: 从设备 API 获取可用的 Agent 列表
          // 临时示例数据
          {
            name: 'Claude Code',
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@zed-industries/claude-code-acp'],
            env: [],
            meta: {
              icon: '🤖',
              description: 'Claude Code AI 助手',
            },
          },
          {
            name: 'Gemini Cli',
            command: 'cmd',
            args: ['/c', 'gemini', '--experimental-acp'],
            env: [],
            meta: {
              icon: '🤖',
              description: 'Gemini Cli AI 助手',
            },
          },
          {
            name: 'Codex',
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@zed-industries/codex-acp'],
            env: [],
            meta: {
              icon: '🤖',
              description: 'Codex AI 助手',
            },
          },
        ]}
        onCreateSession={handleCreateACPSession}
      />

      {/* 工作目录切换提示对话框 */}
      <WorkingDirectorySwitchDialog
        open={showDirSwitchDialog}
        onOpenChange={setShowDirSwitchDialog}
        currentDirectory={currentWorkingDirectory}
        targetDirectory={pendingSessionSwitch?.targetDirectory || ''}
        sessionName={pendingSessionSwitch?.sessionName || ''}
        onConfirm={handleConfirmDirSwitch}
        onCancel={handleCancelDirSwitch}
      />
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
      <div className="h-screen overflow-hidden">
        <ConversationDetailContent />
      </div>
    </ConversationProvider>
  );
}
