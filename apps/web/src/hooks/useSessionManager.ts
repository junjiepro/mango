/**
 * Session Management Hook
 * 管理 Mango 主会话和 ACP 会话的切换,支持持久化
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SessionTab, SessionType, SessionRunningStatus } from '@/types/session.types';
import type { UIMessage } from 'ai';

export function useSessionManager(conversationId: string) {
  // 初始化时创建 Mango 主会话标签
  const [sessions, setSessions] = useState<SessionTab[]>([
    {
      id: `mango-${conversationId}`,
      type: 'mango',
      label: 'Mango 对话',
      conversationId,
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>(`mango-${conversationId}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) =>
        s.type === 'mango' ? { ...s, id: `mango-${conversationId}`, conversationId } : s
      )
    );
    setActiveSessionId((prev) => (prev.startsWith('mango-') ? `mango-${conversationId}` : prev));
  }, [conversationId]);

  /**
   * 从数据库加载持久化的 ACP 会话
   */
  const loadPersistedSessions = useCallback(async () => {
    try {
      if (!conversationId) return;

      setLoading(true);
      setError(null);

      const response = await fetch(`/api/conversations/${conversationId}/acp-sessions`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load sessions');
      }

      // 将持久化的会话转换为 SessionTab 格式
      const acpSessions: SessionTab[] = result.sessions.map((session: any) => ({
        id: `acp-${session.acp_session_id}`,
        type: 'acp' as SessionType,
        label: session.agent_name,
        acpSessionId: session.acp_session_id,
        deviceId: session.device_binding_id,
        agentName: session.agent_name,
        persistedId: session.id, // 保存数据库 ID 用于后续更新/删除
        isActivated: false, // 历史会话默认未激活
        cachedMessages: [], // 初始化消息缓存
        workingDirectory: session.session_config?.cwd, // 从会话配置中提取工作目录
      }));

      // 合并 Mango 主会话和 ACP 会话
      setSessions((prev) => {
        const mangoSession = prev.find((s) => s.type === 'mango');
        return mangoSession ? [mangoSession, ...acpSessions] : acpSessions;
      });
    } catch (err) {
      console.error('Failed to load persisted sessions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // 组件挂载时加载持久化会话
  useEffect(() => {
    loadPersistedSessions();
  }, [loadPersistedSessions]);

  /**
   * 添加 ACP 会话(支持持久化)
   */
  const addACPSession = useCallback(
    async (
      acpSessionId: string,
      deviceId: string,
      agentName: string,
      sessionData?: {
        agentCommand: string;
        agentArgs?: string[];
        envVars?: Record<string, string>;
        sessionConfig?: any;
        workingDirectory?: string;
      }
    ) => {
      if (!conversationId) return;

      const newSession: SessionTab = {
        id: `acp-${acpSessionId}`,
        type: 'acp',
        label: agentName,
        acpSessionId,
        deviceId,
        agentName,
        isActivated: true, // 新创建的会话默认激活
        cachedMessages: [],
        workingDirectory: sessionData?.workingDirectory,
      };

      // 先添加到本地状态
      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSession.id);

      // 如果提供了会话数据,则持久化到数据库
      if (sessionData) {
        try {
          const response = await fetch(`/api/conversations/${conversationId}/acp-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceBindingId: deviceId,
              acpSessionId,
              agentName,
              agentCommand: sessionData.agentCommand,
              agentArgs: sessionData.agentArgs,
              envVars: sessionData.envVars,
              sessionConfig: sessionData.sessionConfig,
            }),
          });

          const result = await response.json();
          if (result.success && result.session) {
            // 更新本地状态,添加 persistedId
            setSessions((prev) =>
              prev.map((s) =>
                s.id === newSession.id ? { ...s, persistedId: result.session.id } : s
              )
            );
          }
        } catch (err) {
          console.error('Failed to persist ACP session:', err);
        }
      }
    },
    [conversationId]
  );

  /**
   * 移除会话(支持删除持久化记录)
   */
  const removeSession = useCallback(
    async (sessionId: string) => {
      if (!conversationId) return;

      const session = sessions.find((s) => s.id === sessionId);

      // 如果是持久化的 ACP 会话，先删服务端（服务端会继续同步删 CLI）
      if (session?.type === 'acp' && session.persistedId) {
        const response = await fetch(`/api/conversations/${conversationId}/acp-sessions/${session.persistedId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          const message = result.error || 'Failed to delete persisted session';
          setError(message);
          throw new Error(message);
        }
      }

      // 服务端删除成功后，再更新本地状态
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (sessionId === activeSessionId && filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeSessionId, conversationId, sessions]
  );

  /**
   * 切换会话(支持更新最后活跃时间)
   */
  const switchSession = useCallback(
    async (sessionId: string) => {
      if (!conversationId) return;

      const session = sessions.find((s) => s.id === sessionId);
      setActiveSessionId(sessionId);

      // 如果是持久化的 ACP 会话,更新最后活跃时间
      if (session?.type === 'acp' && session.persistedId) {
        try {
          await fetch(`/api/conversations/${conversationId}/acp-sessions/${session.persistedId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lastActiveAt: new Date().toISOString(),
            }),
          });
        } catch (err) {
          console.error('Failed to update session activity:', err);
        }
      }
    },
    [conversationId, sessions]
  );

  /**
   * 获取当前活跃会话
   */
  const getActiveSession = useCallback(() => {
    return sessions.find((s) => s.id === activeSessionId);
  }, [sessions, activeSessionId]);

  /**
   * 更新会话的消息缓存
   */
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: UIMessage[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, cachedMessages: messages } : s
        )
      );
    },
    []
  );

  /**
   * 获取会话的消息缓存
   */
  const getSessionMessages = useCallback(
    (sessionId: string): UIMessage[] => {
      const session = sessions.find((s) => s.id === sessionId);
      return session?.cachedMessages || [];
    },
    [sessions]
  );

  /**
   * 更新会话激活状态
   */
  const updateSessionActivation = useCallback(
    (sessionId: string, isActivated: boolean) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, isActivated } : s
        )
      );
    },
    []
  );

  /**
   * 更新会话运行状态
   */
  const updateSessionRunningStatus = useCallback(
    (sessionId: string, runningStatus: SessionRunningStatus) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, runningStatus } : s
        )
      );
    },
    []
  );

  /**
   * 获取正在运行的会话列表
   */
  const getRunningSessions = useCallback(() => {
    return sessions.filter((s) => s.runningStatus === 'streaming' || s.runningStatus === 'submitted');
  }, [sessions]);

  /**
   * 获取会话的工作目录
   */
  const getSessionWorkingDirectory = useCallback(
    (sessionId: string): string | undefined => {
      const session = sessions.find((s) => s.id === sessionId);
      return session?.workingDirectory;
    },
    [sessions]
  );

  /**
   * 更新会话的工作目录
   */
  const updateSessionWorkingDirectory = useCallback(
    (sessionId: string, workingDirectory: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, workingDirectory } : s
        )
      );
    },
    []
  );

  /**
   * 检查切换会话时工作目录是否不一致
   * 返回目标会话的工作目录（如果与当前工作区目录不同）
   */
  const checkWorkingDirectoryMismatch = useCallback(
    (targetSessionId: string, currentWorkspaceDir: string): string | null => {
      const targetSession = sessions.find((s) => s.id === targetSessionId);
      if (!targetSession?.workingDirectory) return null;

      // 规范化路径进行比较
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
      const targetDir = normalize(targetSession.workingDirectory);
      const currentDir = normalize(currentWorkspaceDir);

      if (targetDir !== currentDir) {
        return targetSession.workingDirectory;
      }
      return null;
    },
    [sessions]
  );

  return {
    sessions,
    activeSessionId,
    loading,
    error,
    addACPSession,
    removeSession,
    switchSession,
    getActiveSession,
    loadPersistedSessions,
    updateSessionMessages,
    getSessionMessages,
    updateSessionActivation,
    updateSessionRunningStatus,
    getRunningSessions,
    getSessionWorkingDirectory,
    updateSessionWorkingDirectory,
    checkWorkingDirectoryMismatch,
  };
}
