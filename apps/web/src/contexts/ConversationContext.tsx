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
import type { Database } from '@/types/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

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
  sendMessage: (content: string, attachments?: any[]) => Promise<Message>;
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
    async (content: string, attachments?: any[]): Promise<Message> => {
      if (!conversationId) {
        throw new Error('No conversation selected');
      }

      try {
        const message = await messageService.sendMessage({
          conversationId,
          content,
          attachments,
        });

        // 乐观更新 (实时订阅会处理最终状态)
        setMessages((prev) => [...prev, message]);

        return message;
      } catch (err) {
        logger.error('Failed to send message', err as Error);
        setError(err as Error);
        throw err;
      }
    },
    [conversationId]
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

        return task;
      } catch (err) {
        logger.error('Failed to create task', err as Error);
        setError(err as Error);
        throw err;
      }
    },
    [conversationId]
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
