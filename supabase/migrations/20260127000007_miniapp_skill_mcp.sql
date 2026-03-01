-- Migration: miniapp_skill_mcp
-- Description: MiniApp 改造为 Skill + MCP Server 架构

-- 添加 Skill + MCP 相关字段
ALTER TABLE mini_apps
ADD COLUMN IF NOT EXISTS skill_content TEXT,
ADD COLUMN IF NOT EXISTS architecture_version VARCHAR(10) DEFAULT 'v1'
  CHECK (architecture_version IN ('v1', 'v2-mcp'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_miniapp_architecture
  ON mini_apps(architecture_version);

-- 添加注释
COMMENT ON COLUMN mini_apps.skill_content IS 'Skill 定义 (Markdown 格式)';
COMMENT ON COLUMN mini_apps.architecture_version IS '架构版本: v1=原有, v2-mcp=MCP协议';
