-- ACP Sessions Table
-- 存储 ACP 会话信息，用于持久化和恢复

CREATE TABLE IF NOT EXISTS acp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ACP 会话信息
  acp_session_id TEXT NOT NULL, -- CLI 端返回的会话 ID
  agent_name TEXT NOT NULL,
  agent_command TEXT NOT NULL,
  agent_args JSONB DEFAULT '[]'::jsonb,

  -- 环境变量（加密存储）
  env_vars JSONB DEFAULT '{}'::jsonb,

  -- 会话配置
  session_config JSONB DEFAULT '{}'::jsonb,

  -- 状态
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'closed')),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 索引约束
  UNIQUE(conversation_id, acp_session_id)
);

-- 创建索引
CREATE INDEX idx_acp_sessions_conversation_id ON acp_sessions(conversation_id);
CREATE INDEX idx_acp_sessions_device_binding_id ON acp_sessions(device_binding_id);
CREATE INDEX idx_acp_sessions_user_id ON acp_sessions(user_id);
CREATE INDEX idx_acp_sessions_status ON acp_sessions(status);
CREATE INDEX idx_acp_sessions_last_active_at ON acp_sessions(last_active_at DESC);

-- 启用 RLS
ALTER TABLE acp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的 ACP 会话
CREATE POLICY "Users can view their own ACP sessions"
  ON acp_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ACP sessions"
  ON acp_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ACP sessions"
  ON acp_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ACP sessions"
  ON acp_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_acp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER acp_sessions_updated_at
  BEFORE UPDATE ON acp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_acp_sessions_updated_at();

-- 注释
COMMENT ON TABLE acp_sessions IS 'ACP 会话持久化表';
COMMENT ON COLUMN acp_sessions.acp_session_id IS 'CLI 端返回的 ACP 会话 ID';
COMMENT ON COLUMN acp_sessions.env_vars IS '环境变量（敏感信息应加密）';
