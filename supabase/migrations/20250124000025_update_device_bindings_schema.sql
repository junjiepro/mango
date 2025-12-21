-- Update device-related tables schema
-- 更新设备相关表的结构以匹配新的绑定流程

-- ============================================
-- 1. 更新 devices 表：添加 hostname 字段
-- ============================================

-- 添加 hostname 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'hostname'
  ) THEN
    ALTER TABLE devices ADD COLUMN hostname TEXT;
    COMMENT ON COLUMN devices.hostname IS '主机名';
  END IF;
END $$;

-- ============================================
-- 2. 更新 device_bindings 表：重命名字段
-- ============================================

-- 将 tunnel_url 重命名为 device_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_bindings' AND column_name = 'tunnel_url'
  ) THEN
    ALTER TABLE device_bindings RENAME COLUMN tunnel_url TO device_url;
    COMMENT ON COLUMN device_bindings.device_url IS '设备当前 URL（设备会主动更新此字段）';
  END IF;
END $$;

-- 将 binding_token 重命名为 binding_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_bindings' AND column_name = 'binding_token'
  ) THEN
    ALTER TABLE device_bindings RENAME COLUMN binding_token TO binding_code;
    COMMENT ON COLUMN device_bindings.binding_code IS '正式绑定码（256位随机字符串，用于设备认证）';
  END IF;
END $$;

-- 更新索引名称（如果旧索引存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_device_bindings_token'
  ) THEN
    DROP INDEX IF EXISTS idx_device_bindings_token;
    CREATE INDEX IF NOT EXISTS idx_device_bindings_code ON device_bindings(binding_code);
  END IF;
END $$;
