-- Create workspace_states table for User Story 5
-- User workspace state and configuration

CREATE TABLE IF NOT EXISTS workspace_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Workspace configuration
  is_open BOOLEAN DEFAULT false,
  active_tab VARCHAR(50) DEFAULT 'resources' CHECK (
    active_tab IN ('resources', 'devices', 'files', 'terminal', 'git')
  ),

  -- Layout configuration
  layout JSONB DEFAULT '{
    "split_ratio": 0.6,
    "direction": "horizontal",
    "breakpoint": "desktop"
  }',

  -- Tab states
  tabs_state JSONB DEFAULT '{
    "resources": {"filters": [], "sort": "created_at"},
    "devices": {"selected_device_id": null},
    "files": {"current_path": "/", "open_files": []},
    "terminal": {"sessions": []},
    "git": {"current_repo": null}
  }',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (user_id, conversation_id)
);

-- Indexes
CREATE INDEX idx_workspace_user ON workspace_states(user_id);
CREATE INDEX idx_workspace_conversation ON workspace_states(conversation_id) WHERE conversation_id IS NOT NULL;

-- RLS Policies
ALTER TABLE workspace_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace states"
  ON workspace_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workspace_states_timestamp
BEFORE UPDATE ON workspace_states
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
