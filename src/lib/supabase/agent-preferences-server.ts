/**
 * 服务器端 Agent 偏好设置服务
 * 只能在服务器组件中使用
 */

import { createServerClient } from './server';
import { DEFAULT_AGENT_PREFERENCES } from './agent-preferences';
import type { AgentPreferences, CreateAgentPreferencesInput } from './agent-preferences';

/**
 * 服务器端 Agent 偏好设置服务类
 * 用于在服务器端组件中访问偏好设置
 */
export class ServerAgentPreferencesService {
  /**
   * 在服务器端获取用户偏好设置
   */
  static async getUserPreferences(userId: string): Promise<AgentPreferences | null> {
    try {
      const supabase = createServerClient();

      const { data, error } = await supabase
        .from('agent_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences on server:', error);
      throw error;
    }
  }

  /**
   * 在服务器端获取或创建用户偏好设置
   */
  static async getOrCreateUserPreferences(
    userId: string,
    defaultOverrides?: Partial<CreateAgentPreferencesInput>
  ): Promise<AgentPreferences> {
    try {
      let preferences = await this.getUserPreferences(userId);

      if (!preferences) {
        // 如果在服务器端没有找到偏好设置，返回带有默认值的对象
        // 实际创建操作应该在客户端完成
        preferences = {
          id: '',
          user_id: userId,
          ...DEFAULT_AGENT_PREFERENCES,
          ...defaultOverrides,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AgentPreferences;
      }

      return preferences;
    } catch (error) {
      console.error('Error getting or creating user preferences on server:', error);
      throw error;
    }
  }
}