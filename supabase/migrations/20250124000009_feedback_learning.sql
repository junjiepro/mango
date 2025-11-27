-- Feedback and Learning Tables
CREATE TABLE feedback_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- 反馈内容
  feedback_type VARCHAR(50) NOT NULL CHECK (
    feedback_type IN ('satisfaction', 'accuracy', 'usefulness', 'safety')
  ),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  reason TEXT,

  -- 元数据
  metadata JSONB DEFAULT '{
    "device_type": null,
    "response_time_ms": null,
    "model_version": null
  }'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT feedback_target CHECK (
    message_id IS NOT NULL OR task_id IS NOT NULL
  )
);

CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 规则信息
  record_type VARCHAR(50) NOT NULL CHECK (
    record_type IN ('format', 'accuracy', 'safety', 'efficiency', 'preference')
  ),

  -- 规则内容
  rule_content JSONB NOT NULL,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 生命周期
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_applied_at TIMESTAMPTZ,

  -- 统计
  application_count INT DEFAULT 0,
  success_count INT DEFAULT 0
);

CREATE TABLE learning_record_feedback_links (
  learning_record_id UUID NOT NULL REFERENCES learning_records(id) ON DELETE CASCADE,
  feedback_record_id UUID NOT NULL REFERENCES feedback_records(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (learning_record_id, feedback_record_id)
);

-- 索引
CREATE INDEX idx_feedback_user ON feedback_records(user_id, created_at DESC);
CREATE INDEX idx_feedback_conversation ON feedback_records(conversation_id);
CREATE INDEX idx_feedback_message ON feedback_records(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_feedback_task ON feedback_records(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_feedback_type ON feedback_records(feedback_type);
CREATE INDEX idx_feedback_deleted ON feedback_records(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_learning_user_active ON learning_records(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_learning_type ON learning_records(record_type);
CREATE INDEX idx_learning_confidence ON learning_records(confidence DESC);

CREATE INDEX idx_links_learning ON learning_record_feedback_links(learning_record_id);
CREATE INDEX idx_links_feedback ON learning_record_feedback_links(feedback_record_id);

-- RLS 策略
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON feedback_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own learning records"
  ON learning_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 触发器
CREATE TRIGGER update_feedback_timestamp
BEFORE UPDATE ON feedback_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_timestamp
BEFORE UPDATE ON learning_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
