-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (扩展 Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,

  -- 用户偏好
  preferences JSONB DEFAULT '{
    "language": "zh-CN",
    "theme": "system",
    "notifications_enabled": true,
    "agent_behavior": {
      "response_style": "balanced",
      "detail_level": "medium",
      "auto_execute": false
    }
  }'::jsonb,

  -- 配额与限制
  quota JSONB DEFAULT '{
    "monthly_messages": 1000,
    "used_messages": 0,
    "storage_mb": 100,
    "used_storage_mb": 0
  }'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_display_name CHECK (char_length(display_name) >= 2)
);

-- 索引
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

-- RLS 策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
