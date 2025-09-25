-- 创建 agent_preferences 表
-- 用于存储用户的 AI Agent 偏好设置

-- 首先检查表是否已存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS public.agent_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,

    -- 基本设置
    mode text NOT NULL DEFAULT 'simple' CHECK (mode IN ('simple', 'advanced')),
    theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language text NOT NULL DEFAULT 'zh' CHECK (language IN ('zh', 'en')),

    -- 对话设置
    conversation_settings jsonb NOT NULL DEFAULT '{
        "auto_save": true,
        "history_limit": 100,
        "show_timestamps": false,
        "show_typing_indicator": true,
        "enable_sound": false,
        "enable_notifications": true,
        "auto_scroll": true
    }'::jsonb,

    -- AI模型设置
    ai_settings jsonb NOT NULL DEFAULT '{
        "model": "claude-3-sonnet",
        "temperature": 0.7,
        "max_tokens": 4000,
        "stream_responses": true,
        "enable_tools": true,
        "enable_memory": true,
        "response_format": "markdown"
    }'::jsonb,

    -- 界面偏好
    ui_preferences jsonb NOT NULL DEFAULT '{
        "sidebar_collapsed": false,
        "compact_mode": false,
        "show_code_preview": true,
        "enable_animations": true,
        "font_size": "medium",
        "line_height": "normal"
    }'::jsonb,

    -- 隐私设置
    privacy_settings jsonb NOT NULL DEFAULT '{
        "analytics_enabled": false,
        "conversation_sharing_enabled": false,
        "personalization_enabled": true,
        "data_retention_days": 365
    }'::jsonb,

    -- 高级设置
    advanced_settings jsonb NOT NULL DEFAULT '{
        "debug_mode": false,
        "experimental_features": false,
        "auto_update": true,
        "telemetry_enabled": false
    }'::jsonb,

    -- 时间戳
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- 约束
    CONSTRAINT agent_preferences_user_id_unique UNIQUE (user_id),
    CONSTRAINT agent_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_preferences_user_id ON public.agent_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_preferences_updated_at ON public.agent_preferences(updated_at);

-- 创建更新时间戳的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS agent_preferences_updated_at ON public.agent_preferences;
CREATE TRIGGER agent_preferences_updated_at
    BEFORE UPDATE ON public.agent_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 启用行级安全 (RLS)
ALTER TABLE public.agent_preferences ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的偏好设置
DROP POLICY IF EXISTS "Users can view own preferences" ON public.agent_preferences;
CREATE POLICY "Users can view own preferences" ON public.agent_preferences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.agent_preferences;
CREATE POLICY "Users can insert own preferences" ON public.agent_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.agent_preferences;
CREATE POLICY "Users can update own preferences" ON public.agent_preferences
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.agent_preferences;
CREATE POLICY "Users can delete own preferences" ON public.agent_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- 为服务角色创建管理策略（用于迁移脚本）
DROP POLICY IF EXISTS "Service role can manage all preferences" ON public.agent_preferences;
CREATE POLICY "Service role can manage all preferences" ON public.agent_preferences
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 添加注释
COMMENT ON TABLE public.agent_preferences IS 'User preferences for AI Agent functionality';
COMMENT ON COLUMN public.agent_preferences.user_id IS 'Reference to the user in auth.users';
COMMENT ON COLUMN public.agent_preferences.mode IS 'UI mode: simple or advanced';
COMMENT ON COLUMN public.agent_preferences.theme IS 'UI theme preference';
COMMENT ON COLUMN public.agent_preferences.language IS 'Interface language';
COMMENT ON COLUMN public.agent_preferences.conversation_settings IS 'JSON settings for conversation behavior';
COMMENT ON COLUMN public.agent_preferences.ai_settings IS 'JSON settings for AI model configuration';
COMMENT ON COLUMN public.agent_preferences.ui_preferences IS 'JSON settings for UI customization';
COMMENT ON COLUMN public.agent_preferences.privacy_settings IS 'JSON settings for privacy and data handling';
COMMENT ON COLUMN public.agent_preferences.advanced_settings IS 'JSON settings for advanced features';

-- 验证表结构
DO $$
BEGIN
    -- 检查表是否创建成功
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_preferences') THEN
        RAISE NOTICE 'agent_preferences 表创建成功';

        -- 检查索引
        IF EXISTS (SELECT FROM pg_indexes WHERE tablename = 'agent_preferences' AND indexname = 'idx_agent_preferences_user_id') THEN
            RAISE NOTICE '索引 idx_agent_preferences_user_id 创建成功';
        END IF;

        -- 检查触发器
        IF EXISTS (SELECT FROM information_schema.triggers WHERE event_object_table = 'agent_preferences' AND trigger_name = 'agent_preferences_updated_at') THEN
            RAISE NOTICE '触发器 agent_preferences_updated_at 创建成功';
        END IF;

        -- 检查RLS
        IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'agent_preferences') THEN
            RAISE NOTICE 'RLS 已启用';
        END IF;

    ELSE
        RAISE EXCEPTION 'agent_preferences 表创建失败';
    END IF;
END
$$;