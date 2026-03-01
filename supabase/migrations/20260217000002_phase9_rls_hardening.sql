-- Phase 9: RLS Policy Hardening
-- Fix missing policies identified in security audit

-- messages: add UPDATE policy (users can update messages in own conversations)
CREATE POLICY "Users can update messages in own conversations"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- messages: add DELETE policy
CREATE POLICY "Users can delete messages in own conversations"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- attachments: add DELETE policy
CREATE POLICY "Users can delete attachments in own messages"
  ON attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON messages.conversation_id = conversations.id
      WHERE attachments.message_id = messages.id
        AND conversations.user_id = auth.uid()
    )
  );

-- a2ui_components: add INSERT policy
CREATE POLICY "Users can insert a2ui components in own conversations"
  ON a2ui_components FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- a2ui_components: add DELETE policy
CREATE POLICY "Users can delete a2ui components in own conversations"
  ON a2ui_components FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- audit_logs: enable RLS with read-only for own logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = actor_id);

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
