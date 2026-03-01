-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- 发送者
  sender_type VARCHAR(20) NOT NULL CHECK (
    sender_type IN ('user', 'agent', 'system', 'miniapp')
  ),
  sender_id UUID,

  -- 内容
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text/markdown' CHECK (
    content_type IN (
      'text/plain', 'text/markdown', 'text/html',
      'application/json', 'multipart/mixed'
    )
  ),

  -- 多模态支持
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Agent特定字段
  agent_metadata JSONB,

  -- 状态
  status VARCHAR(20) DEFAULT 'sent' CHECK (
    status IN ('pending', 'sending', 'sent', 'failed', 'edited', 'deleted')
  ),

  -- 引用与上下文
  reply_to_message_id UUID REFERENCES messages(id),
  sequence_number INT NOT NULL,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_content CHECK (char_length(content) >= 1),
  CONSTRAINT valid_sender CHECK (
    (sender_type = 'user' AND sender_id IS NOT NULL) OR
    (sender_type = 'agent') OR
    (sender_type = 'system') OR
    (sender_type = 'miniapp' AND sender_id IS NOT NULL)
  ),
  UNIQUE (conversation_id, sequence_number)
);

-- 索引
CREATE INDEX idx_messages_conversation_seq ON messages(conversation_id, sequence_number DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status) WHERE status = 'pending';
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- 全文搜索索引
CREATE INDEX idx_messages_search ON messages USING gin(
  to_tsvector('simple', content)
);

-- RLS 策略
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- 触发器
CREATE TRIGGER update_messages_timestamp
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动更新对话统计
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      stats = jsonb_set(
        stats,
        '{message_count}',
        ((stats->>'message_count')::int + 1)::text::jsonb
      ),
      last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
