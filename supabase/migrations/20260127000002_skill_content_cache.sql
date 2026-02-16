-- Migration: skill_content_cache
-- Description: Skill 内容缓存表，适配 Edge Function 无状态环境

CREATE TABLE skill_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL REFERENCES skill_registry(skill_id) ON DELETE CASCADE,

  -- 缓存内容
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- 缓存时间
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),

  -- 命中统计
  hit_count INT DEFAULT 0,

  UNIQUE(skill_id)
);

COMMENT ON TABLE skill_content_cache IS 'Skill 内容缓存，替代内存缓存';
