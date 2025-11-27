-- Conversations Table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200),
  description TEXT,

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deleted')
  ),

  -- 上下文管理
  context JSONB DEFAULT '{
    "model": "claude-3-5-sonnet",
    "temperature": 0.7,
    "max_tokens": 4096,
    "system_prompt": null
  }'::jsonb,

  -- 统计信息
  stats JSONB DEFAULT '{
    "message_count": 0,
    "task_count": 0,
    "total_tokens": 0,
    "avg_response_time_ms": 0
  }'::jsonb,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_title CHECK (char_length(title) >= 1)
);

-- 索引
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status = 'active';
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- 全文搜索索引
CREATE INDEX idx_conversations_search ON conversations USING gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- RLS 策略
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 触发器
CREATE TRIGGER update_conversations_timestamp
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
