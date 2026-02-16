-- MiniApp 版本历史表
-- 用于记录 MiniApp 的版本历史，支持版本回滚

CREATE TABLE mini_app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_app_id UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  code_snapshot TEXT NOT NULL,
  html_snapshot TEXT,
  skill_snapshot TEXT,
  manifest_snapshot JSONB,
  content_hash TEXT NOT NULL,
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mini_app_id, version)
);

-- 索引：按应用ID和创建时间倒序查询
CREATE INDEX idx_mini_app_versions_app ON mini_app_versions(mini_app_id, created_at DESC);

-- 索引：按内容哈希查询（用于检测重复）
CREATE INDEX idx_mini_app_versions_hash ON mini_app_versions(mini_app_id, content_hash);

-- RLS 策略
ALTER TABLE mini_app_versions ENABLE ROW LEVEL SECURITY;

-- 创建者可以读取自己应用的版本
CREATE POLICY "Creators can read own app versions" ON mini_app_versions FOR SELECT
  USING (mini_app_id IN (SELECT id FROM mini_apps WHERE creator_id = auth.uid()));

-- 任何人可以读取公开应用的版本
CREATE POLICY "Anyone can read public app versions" ON mini_app_versions FOR SELECT
  USING (mini_app_id IN (SELECT id FROM mini_apps WHERE is_public = true));

-- 系统可以插入版本（通过 service role）
CREATE POLICY "System can insert versions" ON mini_app_versions FOR INSERT WITH CHECK (true);

-- 版本号生成函数
CREATE OR REPLACE FUNCTION generate_next_mini_app_version(p_mini_app_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_current TEXT;
  v_parts TEXT[];
BEGIN
  -- 获取最新版本号
  SELECT version INTO v_current FROM mini_app_versions
  WHERE mini_app_id = p_mini_app_id ORDER BY created_at DESC LIMIT 1;

  -- 如果没有版本记录，从 manifest 获取或使用默认值
  IF v_current IS NULL THEN
    SELECT (manifest->>'version') INTO v_current FROM mini_apps WHERE id = p_mini_app_id;
    IF v_current IS NULL THEN v_current := '1.0.0'; END IF;
  END IF;

  -- 解析版本号并递增 patch 版本
  v_parts := string_to_array(v_current, '.');
  RETURN v_parts[1] || '.' || v_parts[2] || '.' || (COALESCE(v_parts[3]::INT, 0) + 1);
END;
$$;

-- 计算内容哈希的函数
CREATE OR REPLACE FUNCTION calculate_mini_app_content_hash(
  p_code TEXT,
  p_skill TEXT,
  p_html TEXT
)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN encode(
    sha256(
      (COALESCE(p_code, '') || '|' || COALESCE(p_skill, '') || '|' || COALESCE(p_html, ''))::bytea
    ),
    'hex'
  );
END;
$$;

-- 添加注释
COMMENT ON TABLE mini_app_versions IS 'MiniApp 版本历史记录表';
COMMENT ON COLUMN mini_app_versions.version IS '版本号，格式为 major.minor.patch';
COMMENT ON COLUMN mini_app_versions.code_snapshot IS '代码快照';
COMMENT ON COLUMN mini_app_versions.skill_snapshot IS 'Skill 使用指南快照';
COMMENT ON COLUMN mini_app_versions.content_hash IS '内容哈希，用于检测重复';
COMMENT ON COLUMN mini_app_versions.change_summary IS '变更摘要';
