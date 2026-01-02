-- Create terminal_sessions table for User Story 5
-- Terminal sessions in workspace

CREATE TABLE IF NOT EXISTS terminal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Session information
  session_name VARCHAR(100),
  shell_type VARCHAR(50) DEFAULT 'bash',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'closed')
  ),

  -- Session configuration
  config JSONB DEFAULT '{
    "cwd": "~",
    "env": {},
    "cols": 80,
    "rows": 24
  }',

  -- Statistics
  stats JSONB DEFAULT '{
    "command_count": 0,
    "total_output_bytes": 0,
    "duration_ms": 0
  }',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_terminal_user ON terminal_sessions(user_id, status);
CREATE INDEX idx_terminal_device ON terminal_sessions(device_binding_id);
CREATE INDEX idx_terminal_conversation ON terminal_sessions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_terminal_status ON terminal_sessions(status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE terminal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own terminal sessions"
  ON terminal_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own terminal sessions"
  ON terminal_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_terminal_sessions_timestamp
BEFORE UPDATE ON terminal_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
