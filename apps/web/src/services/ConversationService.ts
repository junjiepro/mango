/**
 * Conversation Service
 * T042: Create Conversation service
 */

import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorType } from '@mango/shared/utils';
import type { Database } from '@/types/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];

/**
 * ConversationService 类
 * 处理对话的 CRUD 操作
 */
export class ConversationService {
  private supabase = createClient();

  /**
   * 创建新对话
   */
  async createConversation(data: {
    title: string;
    description?: string;
    context?: Record<string, unknown>;
    device_id?: string;
  }): Promise<Conversation> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    // 校验 device_id 属于当前用户，防止跨用户缓存残留导致 FK 约束失败
    let validDeviceId: string | null = null;
    if (data.device_id) {
      const { data: binding } = await this.supabase
        .from('device_bindings')
        .select('id')
        .eq('id', data.device_id)
        .eq('user_id', user.id)
        .maybeSingle();
      validDeviceId = binding?.id ?? null;
    }

    const conversationData: ConversationInsert = {
      user_id: user.id,
      title: data.title,
      description: data.description,
      context: data.context || {
        model: 'claude-3-5-sonnet',
        temperature: 0.7,
        max_tokens: 4096,
        system_prompt: null,
      },
      status: 'active',
      device_id: validDeviceId,
    };

    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to create conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500,
        true,
        { originalError: error }
      );
    }

    return conversation;
  }

  /**
   * 获取对话列表
   */
  async getConversations(options?: {
    limit?: number;
    offset?: number;
    status?: 'active' | 'archived' | 'deleted';
  }): Promise<{ conversations: Conversation[]; total: number }> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const status = options?.status || 'active';

    // 获取总数
    const { count, error: countError } = await this.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', status);

    if (countError) {
      throw new AppError(
        `Failed to count conversations: ${countError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    // 获取对话列表
    const { data: conversations, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(
        `Failed to fetch conversations: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return {
      conversations: conversations || [],
      total: count || 0,
    };
  }

  /**
   * 获取单个对话
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Conversation not found', ErrorType.RESOURCE_NOT_FOUND, 404);
      }
      throw new AppError(
        `Failed to fetch conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return conversation;
  }

  /**
   * 更新对话
   */
  async updateConversation(
    conversationId: string,
    updates: ConversationUpdate
  ): Promise<Conversation> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Failed to update conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return conversation;
  }

  /**
   * 删除对话 (软删除)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const { error } = await this.supabase
      .from('conversations')
      .update({ status: 'deleted' })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      throw new AppError(
        `Failed to delete conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }
  }

  /**
   * 归档对话
   */
  async archiveConversation(conversationId: string): Promise<Conversation> {
    return this.updateConversation(conversationId, {
      status: 'archived',
      archived_at: new Date().toISOString(),
    });
  }

  /**
   * 恢复归档的对话
   */
  async unarchiveConversation(conversationId: string): Promise<Conversation> {
    return this.updateConversation(conversationId, {
      status: 'active',
      archived_at: null,
    });
  }

  /**
   * 搜索对话
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const { data: conversations, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .textSearch('title', query, {
        type: 'websearch',
        config: 'simple',
      })
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new AppError(
        `Failed to search conversations: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return conversations || [];
  }
}

/**
 * 导出单例实例
 */
export const conversationService = new ConversationService();
