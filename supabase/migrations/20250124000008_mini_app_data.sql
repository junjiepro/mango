-- Mini App Data Table
CREATE TABLE mini_app_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES mini_app_installations(id) ON DELETE CASCADE,

  -- 数据
  key VARCHAR(200) NOT NULL,
  value JSONB NOT NULL,
  value_type VARCHAR(50),

  -- 元数据
  metadata JSONB DEFAULT '{
    "size_bytes": 0,
    "expires_at": null
  }'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  UNIQUE (installation_id, key),
  CONSTRAINT valid_key CHECK (char_length(key) >= 1)
);

-- 索引
CREATE INDEX idx_mini_app_data_installation ON mini_app_data(installation_id, key);
CREATE INDEX idx_mini_app_data_accessed ON mini_app_data(accessed_at);

-- RLS 策略
ALTER TABLE mini_app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own app data"
  ON mini_app_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mini_app_installations
      WHERE mini_app_installations.id = mini_app_data.installation_id
        AND mini_app_installations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_app_installations
      WHERE mini_app_installations.id = mini_app_data.installation_id
        AND mini_app_installations.user_id = auth.uid()
    )
  );

-- 触发器
CREATE TRIGGER update_mini_app_data_timestamp
BEFORE UPDATE ON mini_app_data
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
