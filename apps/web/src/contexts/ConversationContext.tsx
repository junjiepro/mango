/**
 * Conversation Context Provider
 * T046: Create Conversation context provider
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { conversationService } from '@/services/ConversationService';
import { messageService } from '@/services/MessageService';
import { taskService } from '@/services/TaskService';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { logger } from '@mango/shared/utils';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

interface TriggerConfig {
  type: 'schedule' | 'event' | 'manual';
  enabled: boolean;
  eventType?: string;
  message?: string;
}

/**
 * Conversation Context 类型
 */
interface ConversationContextType {
  // 当前对话
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;

  // 消息列表
  messages: Message[];
  isLoadingMessages: boolean;
  sendMessage: (
    content: string,
    attachments?: any[],
    miniAppData?: { miniAppId: string; installationId: string },
    deviceId?: string
  ) => Promise<Message>;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;

  // 任务列表
  tasks: Task[];
  isLoadingTasks: boolean;
  createTask: (data: { title: string; description?: string; taskType: string }) => Promise<Task>;

  // 实时连接状态
  isRealtimeConnected: boolean;

  // 错误状态
  error: Error | null;
}

/**
 * 创建 Context
 */
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

/**
 * ConversationProvider Props
 */
interface ConversationProviderProps {
  children: React.ReactNode;
  conversationId?: string;
}

/**
 * ConversationProvider 组件
 * 管理对话状态、消息和任务
 */
export function ConversationProvider({ children, conversationId }: ConversationProviderProps) {
  // 状态管理
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // MiniApp 触发器处理器
  const triggerMiniAppsByEvent = useCallback(
    async (eventType: string, eventData?: Record<string, any>) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // 获取用户所有已安装的 MiniApp
        const { data: installations, error: installError } = await supabase
          .from('mini_app_installations')
          .select(
            `
            id,
            mini_app_id,
            mini_apps (
              id,
              name,
              display_name
            )
          `
          )
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (installError || !installations) {
          logger.error('Failed to fetch mini app installations', installError);
          return;
        }

        // 遍历所有安装,检查是否有匹配的事件触发器
        for (const installation of installations) {
          try {
            // 获取触发器配置
            const { data: triggerData } = await supabase
              .from('mini_app_data')
              .select('value')
              .eq('installation_id', installation.id)
              .eq('key', '_trigger_config')
              .single();

            if (!triggerData?.value) continue;

            const triggerConfig = triggerData.value as TriggerConfig;

            // 检查是否匹配事件类型
            if (
              triggerConfig.enabled &&
              triggerConfig.type === 'event' &&
              triggerConfig.eventType === eventType
            ) {
              // 触发 MiniApp
              await executeMiniAppTrigger(
                installation.id,
                installation.mini_app_id,
                triggerConfig,
                eventData
              );

              logger.info('MiniApp triggered by event', {
                miniAppId: installation.mini_app_id,
                eventType,
                installationId: installation.id,
              });
            }
          } catch (err) {
            logger.error('Failed to check trigger for installation', err as Error);
          }
        }
      } catch (err) {
        logger.error('Failed to trigger mini apps by event', err as Error);
      }
    },
    []
  );

  // 执行 MiniApp 触发器
  const executeMiniAppTrigger = async (
    installationId: string,
    miniAppId: string,
    triggerConfig: TriggerConfig,
    eventData?: Record<string, any>
  ) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 创建通知
      await supabase.from('notifications').insert({
        user_id: user.id,
        source_type: 'miniapp',
        source_id: miniAppId,
        title: triggerConfig.message || 'MiniApp Triggered',
        body: `Event: ${triggerConfig.eventType || 'unknown'}`,
        category: 'miniapp_trigger',
        priority: 'normal',
        status: 'unread',
        metadata: {
          installation_id: installationId,
          trigger_type: triggerConfig.type,
          event_data: eventData,
        },
      });

      // 记录触发时间
      await supabase.from('mini_app_data').upsert({
        installation_id: installationId,
        key: `_trigger_last_run_${triggerConfig.eventType || 'default'}`,
        value: new Date().toISOString(),
        value_type: 'string',
        metadata: {
          trigger_type: triggerConfig.type,
          event_type: triggerConfig.eventType,
          event_data: eventData,
        },
      });
    } catch (err) {
      logger.error('Failed to execute mini app trigger', err as Error);
    }
  };

  // 实时订阅 - 消息
  const { isConnected: isMessagesConnected } = useRealtimeSubscription<Message>(
    `conversation:${conversationId}:messages`,
    {
      table: 'messages',
      event: '*',
      filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
      onInsert: (payload) => {
        logger.debug('New message received', { messageId: payload.new.id });
        setMessages((prev) => {
          // 避免重复添加
          if (prev.some((m) => m.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new].sort((a, b) => a.sequence_number - b.sequence_number);
        });

        // 触发 MiniApp 事件触发器 (收到新消息)
        triggerMiniAppsByEvent('message.received', {
          messageId: payload.new.id,
          conversationId: payload.new.conversation_id,
          role: payload.new.role,
        });
      },
      onUpdate: (payload) => {
        logger.debug('Message updated', { messageId: payload.new.id });
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
      },
      onDelete: (payload) => {
        logger.debug('Message deleted', { messageId: payload.old.id });
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      },
    },
    !!conversationId
  );

  // 实时订阅 - 任务
  const { isConnected: isTasksConnected } = useRealtimeSubscription<Task>(
    `conversation:${conversationId}:tasks`,
    {
      table: 'tasks',
      event: '*',
      filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
      onInsert: (payload) => {
        logger.debug('New task received', { taskId: payload.new.id });
        setTasks((prev) => {
          if (prev.some((t) => t.id === payload.new.id)) {
            return prev;
          }
          return [payload.new, ...prev];
        });
      },
      onUpdate: (payload) => {
        logger.debug('Task updated', { taskId: payload.new.id });
        setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));

        // 检查任务是否完成,触发 MiniApp 事件触发器
        if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
          triggerMiniAppsByEvent('task.completed', {
            taskId: payload.new.id,
            conversationId: payload.new.conversation_id,
            taskType: payload.new.task_type,
          });
        }
      },
    },
    !!conversationId
  );

  // 加载对话详情
  useEffect(() => {
    if (!conversationId) {
      setCurrentConversation(null);
      setMessages([]);
      setTasks([]);
      return;
    }

    const loadConversation = async () => {
      try {
        const conversation = await conversationService.getConversation(conversationId);
        setCurrentConversation(conversation);
      } catch (err) {
        logger.error('Failed to load conversation', err as Error);
        setError(err as Error);
      }
    };

    loadConversation();
  }, [conversationId]);

  // 加载消息
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { messages: loadedMessages, hasMore } = await messageService.getMessages(
          conversationId,
          { limit: 50 }
        );
        setMessages(loadedMessages);
        setHasMoreMessages(hasMore);
      } catch (err) {
        logger.error('Failed to load messages', err as Error);
        setError(err as Error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // 加载任务
  useEffect(() => {
    if (!conversationId) return;

    const loadTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const { tasks: loadedTasks } = await taskService.getTasks({
          conversationId,
          limit: 20,
        });
        setTasks(loadedTasks);
      } catch (err) {
        logger.error('Failed to load tasks', err as Error);
        setError(err as Error);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    loadTasks();
  }, [conversationId]);

  // 发送消息
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: any[],
      miniAppData?: { miniAppId: string; installationId: string },
      deviceId?: string
    ): Promise<Message> => {
      if (!conversationId) {
        throw new Error('No conversation selected');
      }

      try {
        const message = await messageService.sendMessage({
          conversationId,
          content,
          attachments,
          miniAppData,
          deviceId,
        });

        // 乐观更新 (实时订阅会处理最终状态)
        setMessages((prev) => [...prev, message]);

        // 触发 MiniApp 事件触发器
        await triggerMiniAppsByEvent('message.sent', {
          messageId: message.id,
          conversationId,
          hasAttachments: !!attachments && attachments.length > 0,
        });

        return message;
      } catch (err) {
        logger.error('Failed to send message', err as Error);
        setError(err as Error);
        throw err;
      }
    },
    [conversationId, triggerMiniAppsByEvent]
  );

  // 加载更多消息
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMoreMessages || isLoadingMessages) return;

    setIsLoadingMessages(true);
    try {
      const oldestMessage = messages[0];
      const { messages: olderMessages, hasMore } = await messageService.getMessages(
        conversationId,
        {
          limit: 50,
          beforeSequence: oldestMessage?.sequence_number,
        }
      );

      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMoreMessages(hasMore);
    } catch (err) {
      logger.error('Failed to load more messages', err as Error);
      setError(err as Error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId, messages, hasMoreMessages, isLoadingMessages]);

  // 创建任务
  const createTask = useCallback(
    async (data: { title: string; description?: string; taskType: string }): Promise<Task> => {
      if (!conversationId) {
        throw new Error('No conversation selected');
      }

      try {
        const task = await taskService.createTask({
          conversationId,
          ...data,
        });

        // 乐观更新
        setTasks((prev) => [task, ...prev]);

        // 触发 MiniApp 事件触发器
        await triggerMiniAppsByEvent('task.created', {
          taskId: task.id,
          conversationId,
        });

        return task;
      } catch (err) {
        logger.error('Failed to create task', err as Error);
        setError(err as Error);
        throw err;
      }
    },
    [conversationId, triggerMiniAppsByEvent]
  );

  // Context 值
  const value: ConversationContextType = {
    currentConversation,
    setCurrentConversation,
    messages,
    isLoadingMessages,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    tasks,
    isLoadingTasks,
    createTask,
    isRealtimeConnected: isMessagesConnected && isTasksConnected,
    error,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

/**
 * useConversation Hook
 * 访问 Conversation Context
 */
export function useConversation() {
  const context = useContext(ConversationContext);

  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }

  return context;
}
