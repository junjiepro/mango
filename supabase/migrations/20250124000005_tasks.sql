-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 任务信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL,

  -- 状态管理
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- 执行信息
  agent_config JSONB DEFAULT '{
    "model": "claude-3-5-sonnet",
    "tools": [],
    "max_iterations": 10
  }'::jsonb,

  -- 结果
  result JSONB,
  error_message TEXT,

  -- 工具调用记录
  tool_calls JSONB DEFAULT '[]'::jsonb,

  -- 性能指标
  metrics JSONB DEFAULT '{
    "start_time": null,
    "end_time": null,
    "duration_ms": null,
    "tokens_used": 0,
    "tool_call_count": 0
  }'::jsonb,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_progress CHECK (
    (status = 'completed' AND progress = 100) OR
    (status = 'failed' AND progress >= 0) OR
    (status IN ('pending', 'queued', 'running') AND progress < 100) OR
    (status = 'cancelled')
  )
);

-- 索引
CREATE INDEX idx_tasks_conversation ON tasks(conversation_id, created_at DESC);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status, created_at DESC);
CREATE INDEX idx_tasks_status_updated ON tasks(status, updated_at) WHERE status IN ('pending', 'queued', 'running');
CREATE INDEX idx_tasks_message ON tasks(message_id) WHERE message_id IS NOT NULL;

-- RLS 策略
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 触发器
CREATE TRIGGER update_tasks_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
