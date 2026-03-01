-- 合并 devices 和 device_bindings 表为单一的 device_bindings 表
-- 解决 RLS 导致的创建设备后无法查询的问题

-- ============================================
-- 1. 备份现有数据(如果有)
-- ============================================

-- 创建临时表备份 device_bindings 数据
CREATE TEMP TABLE temp_device_bindings AS
SELECT
  db.id,
  db.user_id,
  db.binding_name,
  db.device_url,
  db.binding_code,
  db.status,
  db.config,
  db.created_at,
  db.updated_at,
  db.expires_at,
  d.device_id,
  d.device_name,
  d.platform,
  d.hostname,
  d.last_seen_at
FROM device_bindings db
LEFT JOIN devices d ON db.device_id = d.id;

-- ============================================
-- 2. 删除旧表和相关约束
-- ============================================

-- 删除 mcp_services 的外键约束(稍后重建)
ALTER TABLE mcp_services DROP CONSTRAINT IF EXISTS mcp_services_binding_id_fkey;

-- 删除旧的 RLS 策略
DROP POLICY IF EXISTS "Users can view their bound devices" ON devices;
DROP POLICY IF EXISTS "Authenticated users can create devices" ON devices;
DROP POLICY IF EXISTS "Authenticated users can update devices" ON devices;
DROP POLICY IF EXISTS "Users can view their own bindings" ON device_bindings;
DROP POLICY IF EXISTS "Users can create their own bindings" ON device_bindings;
DROP POLICY IF EXISTS "Users can update their own bindings" ON device_bindings;
DROP POLICY IF EXISTS "Users can delete their own bindings" ON device_bindings;

-- 删除旧表
DROP TABLE IF EXISTS device_bindings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- ============================================
-- 3. 创建新的合并表 device_bindings
-- ============================================

CREATE TABLE device_bindings (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户关系
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 设备标识信息(来自原 devices 表)
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
  hostname TEXT,

  -- 绑定信息(来自原 device_bindings 表)
  binding_name TEXT NOT NULL,
  device_url TEXT,
  binding_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  config JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束:同一用户不能重复绑定同一设备
  UNIQUE(user_id, device_id)
);

-- ============================================
-- 4. 创建索引
-- ============================================

CREATE INDEX idx_device_bindings_user_id ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_device_id ON device_bindings(device_id);
CREATE INDEX idx_device_bindings_binding_code ON device_bindings(binding_code);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);
CREATE INDEX idx_device_bindings_last_seen ON device_bindings(last_seen_at);

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON TABLE device_bindings IS '设备绑定表 - 存储用户绑定的设备信息';
COMMENT ON COLUMN device_bindings.user_id IS '绑定的用户ID';
COMMENT ON COLUMN device_bindings.device_id IS '设备唯一标识符(基于硬件信息生成)';
COMMENT ON COLUMN device_bindings.device_name IS '设备名称(从设备信息获取)';
COMMENT ON COLUMN device_bindings.platform IS '操作系统平台(windows/macos/linux)';
COMMENT ON COLUMN device_bindings.hostname IS '主机名';
COMMENT ON COLUMN device_bindings.binding_name IS '用户定义的绑定名称(如"工作电脑"、"家用Mac")';
COMMENT ON COLUMN device_bindings.device_url IS '设备当前URL(Cloudflare Tunnel或localhost)';
COMMENT ON COLUMN device_bindings.binding_code IS '正式绑定码(256位随机字符串,用于设备认证)';
COMMENT ON COLUMN device_bindings.status IS '绑定状态(active/inactive/expired)';
COMMENT ON COLUMN device_bindings.config IS '绑定级别的配置数据';
COMMENT ON COLUMN device_bindings.last_seen_at IS '设备最后活跃时间';

-- ============================================
-- 6. 启用 RLS 并创建策略
-- ============================================

ALTER TABLE device_bindings ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的绑定
CREATE POLICY "Users can view their own device bindings"
  ON device_bindings FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以创建自己的绑定
CREATE POLICY "Users can create their own device bindings"
  ON device_bindings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的绑定
CREATE POLICY "Users can update their own device bindings"
  ON device_bindings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的绑定
CREATE POLICY "Users can delete their own device bindings"
  ON device_bindings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. 恢复 mcp_services 的外键约束
-- ============================================

ALTER TABLE mcp_services
  ADD CONSTRAINT mcp_services_binding_id_fkey
  FOREIGN KEY (binding_id)
  REFERENCES device_bindings(id)
  ON DELETE CASCADE;

-- ============================================
-- 8. 恢复备份数据(如果有)
-- ============================================

INSERT INTO device_bindings (
  id,
  user_id,
  device_id,
  device_name,
  platform,
  hostname,
  binding_name,
  device_url,
  binding_code,
  status,
  config,
  created_at,
  updated_at,
  expires_at,
  last_seen_at
)
SELECT
  id,
  user_id,
  COALESCE(device_id, 'unknown-' || id::text),
  device_name,
  COALESCE(platform, 'linux'),
  hostname,
  COALESCE(binding_name, 'Device'),
  device_url,
  binding_code,
  status,
  config,
  created_at,
  updated_at,
  expires_at,
  COALESCE(last_seen_at, created_at)
FROM temp_device_bindings
WHERE EXISTS (SELECT 1 FROM temp_device_bindings LIMIT 1);

-- 清理临时表
DROP TABLE IF EXISTS temp_device_bindings;
