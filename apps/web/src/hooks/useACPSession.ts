/**
 * ACP Session Management Hook (重构版本)
 * 管理 ACP 会话的创建、列表和删除
 * 使用 useDeviceClient 直接与CLI通信
 */

import { useState, useCallback } from 'react';
import type { DeviceClientAPI, ACPAgent, ACPSession } from './useDeviceClient';

export type { ACPAgent, ACPSession };

export function useACPSession(client: DeviceClientAPI | null) {
  const [sessions, setSessions] = useState<ACPSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 创建新的 ACP 会话 (使用新的client)
   */
  const createSession = useCallback(
    async (agent: ACPAgent, envVars: Record<string, string>) => {
      if (!client) {
        throw new Error('设备客户端未就绪');
      }

      setLoading(true);
      setError(null);

      try {
        const result = await client.acp.createSession(agent, envVars);
        return result.sessionId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  /**
   * 获取会话列表 (使用新的client)
   */
  const fetchSessions = useCallback(async () => {
    if (!client) {
      throw new Error('设备客户端未就绪');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.acp.listSessions();
      setSessions(result.sessions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * 删除会话 (使用新的client)
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!client) {
        throw new Error('设备客户端未就绪');
      }

      setLoading(true);
      setError(null);

      try {
        await client.acp.deleteSession(sessionId);

        // 从本地状态中移除
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return {
    sessions,
    loading,
    error,
    createSession,
    fetchSessions,
    deleteSession,
  };
}
