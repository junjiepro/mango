-- 工作空间历史记录表
-- 用于记录用户在各个设备上最近访问的文件夹路径

-- ============================================
-- 1. 创建 workspace_history 表
-- ============================================

CREATE TABLE workspace_history (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户关系
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 设备绑定关系
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,

  -- 访问路径
  path TEXT NOT NULL,

  -- 时间戳
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束：同一用户在同一设备上不能有重复的路径记录
  UNIQUE(user_id, device_binding_id, path)
);

-- ============================================
-- 2. 创建索引
-- ============================================

-- 用于快速查询用户在特定设备上的访问历史
CREATE INDEX idx_workspace_history_user_device
  ON workspace_history(user_id, device_binding_id, last_accessed_at DESC);

-- 用于快速查询特定设备的访问历史
CREATE INDEX idx_workspace_history_device
  ON workspace_history(device_binding_id, last_accessed_at DESC);

-- ============================================
-- 3. 添加注释
-- ============================================

COMMENT ON TABLE workspace_history IS '工作空间历史记录表 - 记录用户在各设备上访问的文件夹路径';
COMMENT ON COLUMN workspace_history.user_id IS '用户ID';
COMMENT ON COLUMN workspace_history.device_binding_id IS '设备绑定ID';
COMMENT ON COLUMN workspace_history.path IS '访问的文件夹路径';
COMMENT ON COLUMN workspace_history.last_accessed_at IS '最后访问时间';
COMMENT ON COLUMN workspace_history.created_at IS '首次访问时间';

-- ============================================
-- 4. 启用 RLS 并创建策略
-- ============================================

ALTER TABLE workspace_history ENABLE ROW LEVEL SECURITY;

-- 用户可以管理自己的工作空间历史记录
CREATE POLICY "Users can manage own workspace history"
  ON workspace_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
