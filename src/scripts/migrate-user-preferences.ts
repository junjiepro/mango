/**
 * 用户Agent偏好设置迁移脚本
 * 为现有用户创建默认的Agent偏好设置，确保无缝升级体验
 */

import { createClient } from '@supabase/supabase-js';
import type { AgentPreferences } from '@/lib/supabase/agent-preferences';

// 配置
const BATCH_SIZE = 100; // 批处理大小
const DRY_RUN = process.env.DRY_RUN === 'true';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// 日志工具
class Logger {
  private level: string;

  constructor(level: string = 'info') {
    this.level = level;
  }

  info(message: string, data?: any) {
    if (['debug', 'info', 'warn', 'error'].includes(this.level)) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    if (['warn', 'error'].includes(this.level)) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    if (['error'].includes(this.level)) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    }
  }

  debug(message: string, data?: any) {
    if (this.level === 'debug') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }
}

// 迁移统计
interface MigrationStats {
  totalUsers: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// 默认Agent偏好设置
const DEFAULT_AGENT_PREFERENCES: Partial<AgentPreferences> = {
  mode: 'simple',
  theme: 'system',
  language: 'zh',
  conversation_settings: {
    auto_save: true,
    history_limit: 100,
    show_timestamps: false,
    show_typing_indicator: true,
    enable_sound: false,
    enable_notifications: true,
    auto_scroll: true
  },
  ai_settings: {
    model: 'claude-3-sonnet',
    temperature: 0.7,
    max_tokens: 4000,
    stream_responses: true,
    enable_tools: true,
    enable_memory: true,
    response_format: 'markdown'
  },
  ui_preferences: {
    sidebar_collapsed: false,
    compact_mode: false,
    show_code_preview: true,
    enable_animations: true,
    font_size: 'medium',
    line_height: 'normal'
  },
  privacy_settings: {
    analytics_enabled: false,
    conversation_sharing_enabled: false,
    personalization_enabled: true,
    data_retention_days: 365
  },
  advanced_settings: {
    debug_mode: false,
    experimental_features: false,
    auto_update: true,
    telemetry_enabled: false
  }
};

class UserPreferencesMigrator {
  private supabase: any;
  private logger: Logger;
  private stats: MigrationStats;

  constructor() {
    // 初始化Supabase客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Please check environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    this.logger = new Logger(LOG_LEVEL);
    this.stats = {
      totalUsers: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      startTime: new Date()
    };
  }

  /**
   * 获取需要迁移的用户列表
   */
  async getUsersToMigrate(): Promise<any[]> {
    try {
      this.logger.info('获取需要迁移的用户列表...');

      // 获取所有注册用户
      const { data: users, error: usersError } = await this.supabase
        .from('auth.users')
        .select('id, email, created_at, email_confirmed_at')
        .not('email_confirmed_at', 'is', null)
        .order('created_at', { ascending: true });

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      // 获取已有agent_preferences的用户
      const { data: existingPrefs, error: prefsError } = await this.supabase
        .from('agent_preferences')
        .select('user_id');

      if (prefsError && prefsError.code !== 'PGRST116') { // 忽略表不存在的错误
        this.logger.warn('Failed to fetch existing preferences', prefsError);
      }

      const existingUserIds = new Set(existingPrefs?.map(p => p.user_id) || []);

      // 过滤出需要迁移的用户
      const usersToMigrate = users.filter(user => !existingUserIds.has(user.id));

      this.logger.info(`发现 ${users.length} 个用户，其中 ${usersToMigrate.length} 个需要迁移`);
      this.stats.totalUsers = usersToMigrate.length;

      return usersToMigrate;
    } catch (error) {
      this.logger.error('获取用户列表失败', error);
      throw error;
    }
  }

  /**
   * 为单个用户创建默认偏好设置
   */
  async createUserPreferences(userId: string, userEmail: string): Promise<boolean> {
    try {
      this.logger.debug(`创建用户 ${userEmail} 的偏好设置...`);

      const preferences: Partial<AgentPreferences> = {
        ...DEFAULT_AGENT_PREFERENCES,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (DRY_RUN) {
        this.logger.info(`[DRY RUN] 将为用户 ${userEmail} 创建偏好设置`, preferences);
        return true;
      }

      const { error } = await this.supabase
        .from('agent_preferences')
        .insert([preferences]);

      if (error) {
        if (error.code === '23505') { // 唯一约束违反，用户可能同时创建了偏好
          this.logger.warn(`用户 ${userEmail} 的偏好设置已存在，跳过`);
          this.stats.skipped++;
          return true;
        }
        throw error;
      }

      this.logger.debug(`成功为用户 ${userEmail} 创建偏好设置`);
      this.stats.created++;
      return true;
    } catch (error) {
      this.logger.error(`为用户 ${userEmail} 创建偏好设置失败`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * 批量处理用户迁移
   */
  async processBatch(users: any[]): Promise<void> {
    const promises = users.map(user =>
      this.createUserPreferences(user.id, user.email)
        .then(() => {
          this.stats.processed++;
          if (this.stats.processed % 10 === 0) {
            this.logger.info(`已处理 ${this.stats.processed}/${this.stats.totalUsers} 个用户`);
          }
        })
    );

    await Promise.allSettled(promises);
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(): Promise<void> {
    try {
      this.logger.info('验证迁移结果...');

      // 统计agent_preferences表中的记录数
      const { count, error } = await this.supabase
        .from('agent_preferences')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      this.logger.info(`agent_preferences表中现有 ${count} 条记录`);

      // 检查是否有用户没有偏好设置
      const { data: usersWithoutPrefs, error: checkError } = await this.supabase
        .from('auth.users')
        .select(`
          id,
          email,
          agent_preferences!left (user_id)
        `)
        .is('agent_preferences.user_id', null)
        .not('email_confirmed_at', 'is', null);

      if (checkError) {
        throw checkError;
      }

      if (usersWithoutPrefs && usersWithoutPrefs.length > 0) {
        this.logger.warn(`发现 ${usersWithoutPrefs.length} 个用户仍然没有偏好设置`);
        usersWithoutPrefs.forEach(user => {
          this.logger.debug(`用户缺失偏好设置: ${user.email}`);
        });
      } else {
        this.logger.info('所有用户都已拥有Agent偏好设置');
      }
    } catch (error) {
      this.logger.error('验证迁移结果失败', error);
      throw error;
    }
  }

  /**
   * 执行完整的迁移流程
   */
  async runMigration(): Promise<void> {
    try {
      this.logger.info(`开始用户偏好设置迁移 (DRY_RUN: ${DRY_RUN})`);

      // 1. 获取需要迁移的用户
      const users = await this.getUsersToMigrate();

      if (users.length === 0) {
        this.logger.info('没有需要迁移的用户');
        return;
      }

      // 2. 批量处理用户迁移
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        this.logger.info(`处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`);
        await this.processBatch(batch);
      }

      // 3. 验证迁移结果
      if (!DRY_RUN) {
        await this.validateMigration();
      }

      this.stats.endTime = new Date();
      this.printSummary();

    } catch (error) {
      this.logger.error('迁移过程失败', error);
      throw error;
    }
  }

  /**
   * 打印迁移摘要
   */
  printSummary(): void {
    const duration = this.stats.endTime
      ? Math.round((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000)
      : 0;

    console.log('\n=== 迁移摘要 ===');
    console.log(`总用户数: ${this.stats.totalUsers}`);
    console.log(`已处理: ${this.stats.processed}`);
    console.log(`成功创建: ${this.stats.created}`);
    console.log(`已跳过: ${this.stats.skipped}`);
    console.log(`错误数: ${this.stats.errors}`);
    console.log(`执行时间: ${duration}秒`);
    console.log(`模式: ${DRY_RUN ? '模拟运行' : '实际执行'}`);
    console.log('================\n');

    if (this.stats.errors > 0) {
      console.log('⚠️ 迁移过程中出现错误，请检查日志');
    } else if (this.stats.totalUsers > 0) {
      console.log('✅ 迁移成功完成');
    }
  }

  /**
   * 回滚迁移（紧急情况使用）
   */
  async rollback(): Promise<void> {
    try {
      this.logger.warn('开始回滚迁移...');

      if (DRY_RUN) {
        this.logger.info('[DRY RUN] 将删除所有agent_preferences记录');
        return;
      }

      // 删除所有agent_preferences记录（谨慎使用！）
      const { error } = await this.supabase
        .from('agent_preferences')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

      if (error) {
        throw error;
      }

      this.logger.info('回滚完成');
    } catch (error) {
      this.logger.error('回滚失败', error);
      throw error;
    }
  }
}

// 主执行函数
async function main() {
  const migrator = new UserPreferencesMigrator();

  try {
    // 检查命令行参数
    const command = process.argv[2];

    switch (command) {
      case 'migrate':
        await migrator.runMigration();
        break;
      case 'rollback':
        await migrator.rollback();
        break;
      default:
        console.log(`
使用方法:
  npm run migrate:user-preferences migrate  # 执行迁移
  npm run migrate:user-preferences rollback # 回滚迁移

环境变量:
  DRY_RUN=true        # 模拟运行，不实际执行
  LOG_LEVEL=debug     # 日志级别 (debug|info|warn|error)
        `);
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行main函数
if (require.main === module) {
  main();
}

export default UserPreferencesMigrator;