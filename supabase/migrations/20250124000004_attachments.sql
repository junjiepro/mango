-- Attachments Table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- 文件信息
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,

  -- 存储
  storage_path TEXT NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'attachments',

  -- 元数据
  metadata JSONB DEFAULT '{
    "width": null,
    "height": null,
    "duration": null,
    "thumbnail_url": null
  }'::jsonb,

  -- 状态
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (
    status IN ('uploading', 'uploaded', 'processing', 'ready', 'failed')
  ),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800)
);

-- 索引
CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_type ON attachments(file_type);
CREATE INDEX idx_attachments_created ON attachments(created_at DESC);

-- RLS 策略
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in own messages"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON messages.conversation_id = conversations.id
      WHERE attachments.message_id = messages.id
        AND conversations.user_id = auth.uid()
    )
  );
