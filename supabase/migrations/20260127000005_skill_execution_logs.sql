-- Migration: skill_execution_logs
-- Description: Skill 执行日志表，用于统计分析

CREATE TABLE skill_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),

  -- 执行信息
  execution_time_ms INT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- 上下文
  conversation_id UUID,
  task_id UUID,

  -- 时间戳
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE skill_execution_logs IS 'Skill 执行日志统计';
