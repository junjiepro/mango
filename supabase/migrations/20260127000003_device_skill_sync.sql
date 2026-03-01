-- Migration: device_skill_sync
-- Description: 设备 Skill 同步状态表，支持离线降级

CREATE TABLE device_skill_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,

  -- 同步状态
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  content_hash TEXT,

  -- 离线缓存内容
  cached_content TEXT,

  UNIQUE(device_binding_id, skill_id)
);

COMMENT ON TABLE device_skill_sync IS '设备 Skill 同步状态，支持离线降级';
