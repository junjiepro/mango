-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 操作信息
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(20),

  -- 目标
  resource_type VARCHAR(50),
  resource_id UUID,

  -- 详情
  details JSONB DEFAULT '{}'::jsonb,

  -- 上下文
  ip_address INET,
  user_agent TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_action CHECK (char_length(action) >= 3)
);

-- 索引
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- 注意: 审计日志表通常不启用RLS,因为它需要记录所有操作
-- 但可以通过数据库权限限制访问
