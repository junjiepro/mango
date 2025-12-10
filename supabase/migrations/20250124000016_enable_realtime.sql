-- Enable Realtime for messages table
-- This migration ensures messages table has Realtime replication enabled

-- Enable Realtime publication for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Add UPDATE policy for messages (allow service role to update agent messages)
CREATE POLICY "Service role can update messages"
  ON messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add policy for users to view updated messages in their conversations
CREATE POLICY "Users can view message updates in own conversations"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Ensure Realtime is enabled for tasks table as well
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Ensure Realtime is enabled for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Add comment
COMMENT ON TABLE messages IS 'Messages table with Realtime replication enabled for instant updates';
