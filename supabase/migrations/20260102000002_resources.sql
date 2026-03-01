-- Create resources table for User Story 5
-- Detected resources in conversations (files, links, miniapps, etc.)

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Resource information
  resource_type VARCHAR(50) NOT NULL CHECK (
    resource_type IN ('file', 'link', 'miniapp', 'code', 'image', 'video', 'audio')
  ),
  content TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{
    "filename": null,
    "domain": null,
    "size": null,
    "mime_type": null
  }',

  -- Position in message
  position JSONB,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deleted')
  ),

  -- Access statistics
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resources_conversation ON resources(conversation_id, created_at DESC);
CREATE INDEX idx_resources_message ON resources(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_status ON resources(status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources in own conversations"
  ON resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage resources in own conversations"
  ON resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_resources_timestamp
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
