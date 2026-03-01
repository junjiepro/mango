-- Migration: Skill search functions (keyword-based)
-- T167: 基于关键词的搜索函数

-- 全文搜索函数
CREATE OR REPLACE FUNCTION search_skills_by_keywords(
  query_text text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  rank real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.name,
    sr.description,
    sr.category::TEXT,
    ts_rank(sr.search_vector, plainto_tsquery('simple', query_text)) AS rank
  FROM skill_registry sr
  WHERE sr.is_active = true
    AND sr.search_vector @@ plainto_tsquery('simple', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 标签匹配搜索函数
CREATE OR REPLACE FUNCTION search_skills_by_tags(
  search_keywords text[],
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  match_score int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.name,
    sr.description,
    sr.category::TEXT,
    (SELECT COUNT(*)::int FROM unnest(search_keywords) k
     WHERE k = ANY(sr.keywords) OR k = ANY(sr.triggers)) AS match_score
  FROM skill_registry sr
  WHERE sr.is_active = true
    AND (sr.keywords && search_keywords OR sr.triggers && search_keywords)
  ORDER BY match_score DESC
  LIMIT match_count;
END;
$$;
