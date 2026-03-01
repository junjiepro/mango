-- Migration: Full-text search for skills (no pgvector)
-- T165: 使用 PostgreSQL 全文搜索替代 pgvector

-- 为 skill_registry 添加全文搜索列
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 添加关键词和触发词列
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS triggers text[] DEFAULT '{}';

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_skill_search_vector
ON skill_registry USING gin(search_vector);

-- 创建关键词索引
CREATE INDEX IF NOT EXISTS idx_skill_keywords
ON skill_registry USING gin(keywords);

-- 更新 search_vector 的触发器
CREATE OR REPLACE FUNCTION update_skill_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.keywords, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skill_search_vector_trigger ON skill_registry;
CREATE TRIGGER skill_search_vector_trigger
BEFORE INSERT OR UPDATE ON skill_registry
FOR EACH ROW EXECUTE FUNCTION update_skill_search_vector();
