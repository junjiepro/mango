/**
 * Mini App Share Links Table Migration
 * 创建小应用分享链接表
 */

-- 创建小应用分享链接表
CREATE TABLE IF NOT EXISTS mini_app_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_app_id UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,
  share_token VARCHAR(32) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 过期和使用限制
  expires_at TIMESTAMPTZ,
  max_uses INT,
  use_count INT DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_share_token CHECK (char_length(share_token) >= 16),
  CONSTRAINT valid_use_count CHECK (use_count >= 0),
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- 索引
CREATE INDEX idx_share_links_token ON mini_app_share_links(share_token);
CREATE INDEX idx_share_links_mini_app ON mini_app_share_links(mini_app_id);
CREATE INDEX idx_share_links_creator ON mini_app_share_links(created_by, created_at DESC);
CREATE INDEX idx_share_links_expires ON mini_app_share_links(expires_at) WHERE expires_at IS NOT NULL;

-- RLS 策略
ALTER TABLE mini_app_share_links ENABLE ROW LEVEL SECURITY;

-- 创建者可以查看和管理自己的分享链接
CREATE POLICY "Users can view own share links"
  ON mini_app_share_links FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create share links for own mini apps"
  ON mini_app_share_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_apps
      WHERE mini_apps.id = mini_app_share_links.mini_app_id
        AND mini_apps.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own share links"
  ON mini_app_share_links FOR DELETE
  USING (auth.uid() = created_by);

-- 任何人都可以通过 share_token 查看分享链接(用于安装)
CREATE POLICY "Anyone can view share links by token"
  ON mini_app_share_links FOR SELECT
  USING (true);

-- 更新时间戳触发器
CREATE TRIGGER update_share_links_timestamp
BEFORE UPDATE ON mini_app_share_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE mini_app_share_links IS '小应用分享链接表';
COMMENT ON COLUMN mini_app_share_links.share_token IS '唯一的分享令牌';
COMMENT ON COLUMN mini_app_share_links.expires_at IS '过期时间,NULL表示永不过期';
COMMENT ON COLUMN mini_app_share_links.max_uses IS '最大使用次数,NULL表示无限制';
COMMENT ON COLUMN mini_app_share_links.use_count IS '已使用次数';
