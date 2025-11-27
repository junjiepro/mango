-- Mini Apps and Installations Tables
CREATE TABLE mini_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,

  -- 代码与配置
  code TEXT NOT NULL,
  code_hash VARCHAR(64),
  manifest JSONB NOT NULL DEFAULT '{
    "version": "1.0.0",
    "required_permissions": [],
    "apis": [],
    "triggers": []
  }'::jsonb,

  -- 运行时配置
  runtime_config JSONB DEFAULT '{
    "sandbox_level": "strict",
    "max_memory_mb": 10,
    "max_execution_time_ms": 5000,
    "allowed_domains": []
  }'::jsonb,

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'suspended', 'archived')
  ),
  is_public BOOLEAN DEFAULT false,
  is_shareable BOOLEAN DEFAULT true,

  -- 使用统计
  stats JSONB DEFAULT '{
    "install_count": 0,
    "active_users": 0,
    "total_invocations": 0,
    "avg_rating": 0
  }'::jsonb,

  -- 审核与安全
  security_review JSONB DEFAULT '{
    "reviewed": false,
    "reviewed_at": null,
    "reviewer_id": null,
    "risk_level": "unknown"
  }'::jsonb,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_name CHECK (char_length(name) >= 2),
  CONSTRAINT valid_code CHECK (char_length(code) >= 10)
);

-- Mini App Installations Table
CREATE TABLE mini_app_installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mini_app_id UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,

  -- 安装信息
  installed_version VARCHAR(20) NOT NULL,
  custom_name VARCHAR(100),

  -- 权限
  granted_permissions TEXT[] DEFAULT '{}',

  -- 配置
  user_config JSONB DEFAULT '{}'::jsonb,

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'uninstalled')
  ),

  -- 使用统计
  stats JSONB DEFAULT '{
    "invocation_count": 0,
    "last_used_at": null,
    "total_runtime_ms": 0
  }'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,

  -- 约束
  UNIQUE (user_id, mini_app_id)
);

-- 索引
CREATE INDEX idx_mini_apps_creator ON mini_apps(creator_id, created_at DESC);
CREATE INDEX idx_mini_apps_status ON mini_apps(status) WHERE status = 'active';
CREATE INDEX idx_mini_apps_public ON mini_apps(is_public) WHERE is_public = true;
CREATE INDEX idx_mini_apps_tags ON mini_apps USING gin(tags);
CREATE INDEX idx_mini_apps_search ON mini_apps USING gin(
  to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(description, ''))
);

CREATE INDEX idx_installations_user ON mini_app_installations(user_id, status);
CREATE INDEX idx_installations_app ON mini_app_installations(mini_app_id, status);

-- RLS 策略
ALTER TABLE mini_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public or own mini apps"
  ON mini_apps FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can manage own mini apps"
  ON mini_apps FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

ALTER TABLE mini_app_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own installations"
  ON mini_app_installations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 触发器
CREATE TRIGGER update_mini_apps_timestamp
BEFORE UPDATE ON mini_apps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installations_timestamp
BEFORE UPDATE ON mini_app_installations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
