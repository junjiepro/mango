-- Add device_id field to conversations table
-- This allows conversations to remember the last selected device

ALTER TABLE conversations
ADD COLUMN device_id UUID REFERENCES device_bindings(id) ON DELETE SET NULL;

-- Add index for device_id lookups
CREATE INDEX idx_conversations_device ON conversations(device_id) WHERE device_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN conversations.device_id IS 'The device associated with this conversation';
