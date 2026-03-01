-- Tools Table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 工具信息
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50),

  -- 协议类型
  protocol VARCHAR(20) NOT NULL CHECK (
    protocol IN ('mcp', 'acp', 'a2a', 'native')
  ),

  -- 配置
  config JSONB NOT NULL DEFAULT '{
    "endpoint": null,
    "authentication": {},
    "parameters_schema": {},
    "timeout_ms": 30000
  }'::jsonb,

  -- 权限要求
  required_permissions TEXT[] DEFAULT '{}',

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'disabled', 'deprecated')
  ),
  is_public BOOLEAN DEFAULT false,

  -- 所有者
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 使用统计
  stats JSONB DEFAULT '{
    "total_calls": 0,
    "success_calls": 0,
    "avg_duration_ms": 0,
    "last_called_at": null
  }'::jsonb,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_name CHECK (char_length(name) >= 2)
);

-- 索引
CREATE INDEX idx_tools_protocol ON tools(protocol);
CREATE INDEX idx_tools_category ON tools(category) WHERE category IS NOT NULL;
CREATE INDEX idx_tools_status ON tools(status) WHERE status = 'active';
CREATE INDEX idx_tools_owner ON tools(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_tools_public ON tools(is_public) WHERE is_public = true;

-- RLS 策略
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view public tools"
  ON tools FOR SELECT
  USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can manage own tools"
  ON tools FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 触发器
CREATE TRIGGER update_tools_timestamp
BEFORE UPDATE ON tools
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
