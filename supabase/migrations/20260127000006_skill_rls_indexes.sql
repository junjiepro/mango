-- Migration: skill_rls_indexes
-- Description: Skill 表的 RLS 策略和索引

-- ============ 索引 ============

-- skill_registry 索引
CREATE INDEX idx_registry_category ON skill_registry(category);
CREATE INDEX idx_registry_active ON skill_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_registry_keywords ON skill_registry USING gin(trigger_keywords);
CREATE INDEX idx_registry_tags ON skill_registry USING gin(tags);

-- skill_content_cache 索引
CREATE INDEX idx_cache_skill ON skill_content_cache(skill_id);
CREATE INDEX idx_cache_expires ON skill_content_cache(expires_at);

-- device_skill_sync 索引
CREATE INDEX idx_device_sync_binding ON device_skill_sync(device_binding_id);
CREATE INDEX idx_device_sync_skill ON device_skill_sync(skill_id);

-- skill_versions 索引
CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id, created_at DESC);

-- skill_execution_logs 索引
CREATE INDEX idx_exec_logs_skill ON skill_execution_logs(skill_id, executed_at DESC);
CREATE INDEX idx_exec_logs_user ON skill_execution_logs(user_id, executed_at DESC);

-- ============ RLS 策略 ============

-- skill_registry RLS
ALTER TABLE skill_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active skills"
  ON skill_registry FOR SELECT
  USING (is_active = true);

-- skill_content_cache RLS
ALTER TABLE skill_content_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
  ON skill_content_cache FOR SELECT
  USING (true);

CREATE POLICY "System can manage cache"
  ON skill_content_cache FOR ALL
  USING (auth.role() = 'service_role');

-- device_skill_sync RLS
ALTER TABLE device_skill_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own device sync"
  ON device_skill_sync FOR ALL
  USING (
    device_binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

-- skill_versions RLS
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read versions"
  ON skill_versions FOR SELECT
  USING (true);

-- skill_execution_logs RLS
ALTER TABLE skill_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
  ON skill_execution_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can write logs"
  ON skill_execution_logs FOR INSERT
  WITH CHECK (true);

-- ============ 函数 ============

-- 增加缓存命中计数
CREATE OR REPLACE FUNCTION increment_skill_hit_count(p_skill_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE skill_content_cache
  SET hit_count = COALESCE(hit_count, 0) + 1
  WHERE skill_id = p_skill_id;
END;
$$;
