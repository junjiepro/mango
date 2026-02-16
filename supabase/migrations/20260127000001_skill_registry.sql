-- Migration: skill_registry
-- Description: 统一 Skill 注册表，支持 Edge/Remote/Device 三层 Skill 元数据管理
-- Version: v3 架构 (无 embedding，使用关键词匹配)

-- 创建 skill_registry 表
CREATE TABLE skill_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 标识（格式: edge:a2ui, remote:uuid, device:file-ops）
  skill_id TEXT NOT NULL UNIQUE,

  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',

  -- 分类
  category TEXT NOT NULL CHECK (category IN ('edge', 'remote', 'device')),
  skill_type TEXT CHECK (skill_type IN ('system', 'user', 'miniapp', 'extension')),

  -- 内容位置引用
  content_ref JSONB NOT NULL,

  -- 触发条件
  trigger_keywords TEXT[] DEFAULT '{}',
  trigger_patterns TEXT[] DEFAULT '{}',

  -- 依赖声明
  dependencies TEXT[] DEFAULT '{}',
  conflicts TEXT[] DEFAULT '{}',

  -- 优先级和标签
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags TEXT[] DEFAULT '{}',

  -- 关键词搜索支持（替代 embedding）
  keywords TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',

  -- 内容哈希（用于缓存失效）
  content_hash TEXT,

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE skill_registry IS '统一 Skill 注册表 (v3 架构，关键词匹配)';
COMMENT ON COLUMN skill_registry.skill_id IS '唯一标识，格式: edge:name, remote:uuid, device:name';
COMMENT ON COLUMN skill_registry.category IS 'Skill 来源: edge(Edge Function), remote(数据库), device(设备)';
COMMENT ON COLUMN skill_registry.content_ref IS '内容位置引用 JSON';
COMMENT ON COLUMN skill_registry.keywords IS '关键词数组，用于全文搜索';
COMMENT ON COLUMN skill_registry.triggers IS '触发词数组，用于意图匹配';
