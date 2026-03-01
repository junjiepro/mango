-- 移除 device_bindings 表的 user_id + device_id 唯一约束
-- 允许同一用户对同一设备建立多次绑定

-- ============================================
-- 1. 移除唯一约束
-- ============================================

-- 查找并删除唯一约束
ALTER TABLE device_bindings
  DROP CONSTRAINT IF EXISTS device_bindings_user_id_device_id_key;

-- ============================================
-- 2. 更新表注释
-- ============================================

COMMENT ON TABLE device_bindings IS '设备绑定表 - 存储用户绑定的设备信息（允许同一用户多次绑定同一设备）';
