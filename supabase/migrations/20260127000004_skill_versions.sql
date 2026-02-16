-- Migration: skill_versions
-- Description: Skill 版本历史表，支持版本回滚

CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL REFERENCES skill_registry(skill_id) ON DELETE CASCADE,

  -- 版本信息
  version TEXT NOT NULL,
  content_snapshot TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- 变更说明
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(skill_id, version)
);

COMMENT ON TABLE skill_versions IS 'Skill 版本历史，支持回滚';
