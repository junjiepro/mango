-- Create a2ui_components table for User Story 5
-- Agent-generated rich interactive UI components

CREATE TABLE IF NOT EXISTS a2ui_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Component information
  component_type VARCHAR(50) NOT NULL CHECK (
    component_type IN ('form', 'input', 'select', 'button', 'chart', 'table', 'card', 'tabs', 'list', 'grid')
  ),

  -- Component definition (A2UI Schema)
  schema JSONB NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'expired')
  ),

  -- Interaction data
  interaction_data JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{
    "render_count": 0,
    "last_interaction_at": null
  }',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_a2ui_message ON a2ui_components(message_id);
CREATE INDEX idx_a2ui_conversation ON a2ui_components(conversation_id);
CREATE INDEX idx_a2ui_type ON a2ui_components(component_type);
CREATE INDEX idx_a2ui_status ON a2ui_components(status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE a2ui_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view A2UI in own conversations"
  ON a2ui_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update A2UI interaction data"
  ON a2ui_components FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_a2ui_components_timestamp
BEFORE UPDATE ON a2ui_components
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
