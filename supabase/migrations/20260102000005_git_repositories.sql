-- Create git_repositories table for User Story 5
-- Git repositories on devices

CREATE TABLE IF NOT EXISTS git_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Repository information
  path TEXT NOT NULL,
  name VARCHAR(200) NOT NULL,

  -- Git configuration
  remote_url TEXT,
  default_branch VARCHAR(100) DEFAULT 'main',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'error')
  ),

  -- Statistics
  stats JSONB DEFAULT '{
    "commit_count": 0,
    "branch_count": 0,
    "last_commit_at": null,
    "last_sync_at": null
  }',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (device_binding_id, path)
);

-- Indexes
CREATE INDEX idx_git_repos_device ON git_repositories(device_binding_id);
CREATE INDEX idx_git_repos_user ON git_repositories(user_id);
CREATE INDEX idx_git_repos_status ON git_repositories(status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE git_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own git repositories"
  ON git_repositories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own git repositories"
  ON git_repositories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_git_repositories_timestamp
BEFORE UPDATE ON git_repositories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
