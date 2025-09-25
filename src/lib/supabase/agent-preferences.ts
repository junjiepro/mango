/**
 * AI Agent 偏好设置服务
 * 提供用户 Agent 偏好的 CRUD 操作
 */

import { createClient } from './client';
import type { User } from '@supabase/supabase-js';

/**
 * Agent 偏好设置类型定义
 */
export interface AgentPreferences {
  id: string;
  user_id: string;
  mode: 'simple' | 'advanced';
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  conversation_settings: {
    auto_save: boolean;
    history_limit: number;
    show_timestamps: boolean;
    show_typing_indicator: boolean;
  };
  ai_settings: {
    model: string;
    temperature: number;
    max_tokens: number;
    stream_responses: boolean;
    enable_tools: boolean;
    enable_memory: boolean;
  };
  ui_preferences: {
    sidebar_collapsed: boolean;
    compact_mode: boolean;
    show_code_preview: boolean;
    animation_enabled: boolean;
  };
  privacy_settings: {
    collect_analytics: boolean;
    share_conversations: boolean;
    personalization_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * 创建偏好设置时的输入类型
 */
export type CreateAgentPreferencesInput = Omit<AgentPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

/**
 * 更新偏好设置时的输入类型
 */
export type UpdateAgentPreferencesInput = Partial<CreateAgentPreferencesInput>;

/**
 * 默认 Agent 偏好设置
 */
export const DEFAULT_AGENT_PREFERENCES: CreateAgentPreferencesInput = {
  mode: 'simple',
  theme: 'system',
  language: 'zh',
  conversation_settings: {
    auto_save: true,
    history_limit: 100,
    show_timestamps: true,
    show_typing_indicator: true,
  },
  ai_settings: {
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2048,
    stream_responses: true,
    enable_tools: true,
    enable_memory: true,
  },
  ui_preferences: {
    sidebar_collapsed: false,
    compact_mode: false,
    show_code_preview: true,
    animation_enabled: true,
  },
  privacy_settings: {
    collect_analytics: false,
    share_conversations: false,
    personalization_enabled: true,
  },
};

/**
 * Agent 偏好设置服务类
 */
export class AgentPreferencesService {
  /**
   * 获取用户的 Agent 偏好设置
   */
  static async getUserPreferences(userId: string): Promise<AgentPreferences | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('agent_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果没有找到偏好设置，返回 null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * 创建用户的 Agent 偏好设置
   */
  static async createUserPreferences(
    userId: string,
    preferences?: Partial<CreateAgentPreferencesInput>
  ): Promise<AgentPreferences> {
    try {
      const supabase = createClient();

      const preferencesToCreate = {
        ...DEFAULT_AGENT_PREFERENCES,
        ...preferences,
        user_id: userId,
      };

      const { data, error } = await supabase
        .from('agent_preferences')
        .insert(preferencesToCreate)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating user preferences:', error);
      throw error;
    }
  }

  /**
   * 更新用户的 Agent 偏好设置
   */
  static async updateUserPreferences(
    userId: string,
    updates: UpdateAgentPreferencesInput
  ): Promise<AgentPreferences> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('agent_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * 删除用户的 Agent 偏好设置
   */
  static async deleteUserPreferences(userId: string): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('agent_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw error;
    }
  }

  /**
   * 获取或创建用户偏好设置（如果不存在则创建默认设置）
   */
  static async getOrCreateUserPreferences(
    userId: string,
    defaultOverrides?: Partial<CreateAgentPreferencesInput>
  ): Promise<AgentPreferences> {
    try {
      // 先尝试获取现有偏好设置
      let preferences = await this.getUserPreferences(userId);

      // 如果不存在，创建默认偏好设置
      if (!preferences) {
        preferences = await this.createUserPreferences(userId, defaultOverrides);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting or creating user preferences:', error);
      throw error;
    }
  }

  /**
   * 更新特定偏好设置项
   */
  static async updatePreferenceSetting(
    userId: string,
    settingPath: keyof CreateAgentPreferencesInput,
    value: any
  ): Promise<AgentPreferences> {
    try {
      const updates: UpdateAgentPreferencesInput = {
        [settingPath]: value,
      };

      return await this.updateUserPreferences(userId, updates);
    } catch (error) {
      console.error('Error updating preference setting:', error);
      throw error;
    }
  }

  /**
   * 批量更新偏好设置
   */
  static async batchUpdatePreferences(
    userId: string,
    updates: Array<{
      setting: keyof CreateAgentPreferencesInput;
      value: any;
    }>
  ): Promise<AgentPreferences> {
    try {
      const batchUpdates: UpdateAgentPreferencesInput = {};

      updates.forEach(({ setting, value }) => {
        (batchUpdates as any)[setting] = value;
      });

      return await this.updateUserPreferences(userId, batchUpdates);
    } catch (error) {
      console.error('Error batch updating preferences:', error);
      throw error;
    }
  }
}

/**
 * React Hook：使用 Agent 偏好设置
 */
export function useAgentPreferences(user: User | null) {
  const [preferences, setPreferences] = React.useState<AgentPreferences | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const prefs = await AgentPreferencesService.getOrCreateUserPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: UpdateAgentPreferencesInput) => {
    if (!user) return;

    try {
      const updated = await AgentPreferencesService.updateUserPreferences(user.id, updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  const updateSetting = async (settingPath: keyof CreateAgentPreferencesInput, value: any) => {
    if (!user) return;

    try {
      const updated = await AgentPreferencesService.updatePreferenceSetting(user.id, settingPath, value);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
    updateSetting,
  };
}

// 导出 React import（仅在客户端组件中使用）
import React from 'react';