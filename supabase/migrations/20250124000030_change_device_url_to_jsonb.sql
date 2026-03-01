-- 将 device_url 从 TEXT 改为 JSONB 存储三个可能的 URL
-- cloudflare_url: Cloudflare Tunnel 公网 URL
-- localhost_url: 本地 localhost URL
-- hostname_url: 本地 IP 地址 URL

-- ============================================
-- 1. 备份现有数据
-- ============================================

-- 创建临时列存储旧数据
ALTER TABLE device_bindings ADD COLUMN IF NOT EXISTS device_url_old TEXT;
UPDATE device_bindings SET device_url_old = device_url WHERE device_url IS NOT NULL;

-- ============================================
-- 2. 修改 device_url 列类型为 JSONB
-- ============================================

-- 删除旧列
ALTER TABLE device_bindings DROP COLUMN IF EXISTS device_url;

-- 创建新的 JSONB 列
ALTER TABLE device_bindings ADD COLUMN device_url JSONB DEFAULT NULL;

-- ============================================
-- 3. 迁移旧数据（如果有）
-- ============================================

-- 将旧的单个 URL 迁移到新的 JSONB 结构
-- 假设旧的 URL 是 cloudflare_url
UPDATE device_bindings
SET device_url = jsonb_build_object(
  'cloudflare_url', device_url_old,
  'localhost_url', NULL,
  'hostname_url', NULL
)
WHERE device_url_old IS NOT NULL;

-- ============================================
-- 4. 清理临时列
-- ============================================

ALTER TABLE device_bindings DROP COLUMN IF EXISTS device_url_old;

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON COLUMN device_bindings.device_url IS '设备可访问的 URL 列表 (JSONB): { cloudflare_url, localhost_url, hostname_url }';
