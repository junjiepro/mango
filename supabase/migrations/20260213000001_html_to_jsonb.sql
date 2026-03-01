-- 统一 UI 资源管理：html 字段 TEXT → JSONB
-- 将 mini_apps.html 和 mini_app_versions.html_snapshot 从 TEXT 转为 JSONB
-- 旧的纯 HTML 字符串自动转为 {"main": "..."}

-- mini_apps.html: TEXT → JSONB
ALTER TABLE mini_apps DROP CONSTRAINT IF EXISTS valid_html;
ALTER TABLE mini_apps ALTER COLUMN html TYPE JSONB USING
  CASE
    WHEN html IS NULL THEN NULL
    WHEN html::text LIKE '{%' THEN html::jsonb
    ELSE jsonb_build_object('main', html::text)
  END;

-- mini_app_versions.html_snapshot: TEXT → JSONB
ALTER TABLE mini_app_versions ALTER COLUMN html_snapshot TYPE JSONB USING
  CASE
    WHEN html_snapshot IS NULL THEN NULL
    WHEN html_snapshot::text LIKE '{%' THEN html_snapshot::jsonb
    ELSE jsonb_build_object('main', html_snapshot::text)
  END;

-- 更新 content hash 函数签名（接受 JSONB）
CREATE OR REPLACE FUNCTION calculate_mini_app_content_hash(
  p_code TEXT, p_skill_content TEXT, p_html JSONB DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
  RETURN md5(COALESCE(p_code, '') || '|' || COALESCE(p_skill_content, '') || '|' || COALESCE(p_html::text, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
