-- Additional Indexes for Query Optimization

-- Composite indexes for common query patterns
CREATE INDEX idx_conversations_user_status_updated
  ON conversations(user_id, status, updated_at DESC)
  WHERE status = 'active';

CREATE INDEX idx_messages_conversation_sender
  ON messages(conversation_id, sender_type, created_at DESC);

CREATE INDEX idx_tasks_user_conversation
  ON tasks(user_id, conversation_id, created_at DESC);

CREATE INDEX idx_mini_apps_creator_status
  ON mini_apps(creator_id, status)
  WHERE status = 'active';

CREATE INDEX idx_installations_user_active
  ON mini_app_installations(user_id, status)
  WHERE status = 'active';

CREATE INDEX idx_feedback_user_type_rating
  ON feedback_records(user_id, feedback_type, rating, created_at DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX idx_conversations_archived
  ON conversations(user_id, archived_at)
  WHERE status = 'archived';

CREATE INDEX idx_messages_failed
  ON messages(conversation_id, created_at DESC)
  WHERE status = 'failed';

CREATE INDEX idx_tasks_failed
  ON tasks(user_id, created_at DESC)
  WHERE status = 'failed';

CREATE INDEX idx_learning_active_confidence
  ON learning_records(user_id, confidence DESC)
  WHERE is_active = true AND confidence >= 0.7;

-- GIN indexes for JSONB queries
CREATE INDEX idx_conversations_context_model
  ON conversations USING gin((context -> 'model'));

CREATE INDEX idx_messages_agent_metadata
  ON messages USING gin(agent_metadata);

CREATE INDEX idx_tasks_agent_config
  ON tasks USING gin(agent_config);

CREATE INDEX idx_mini_apps_manifest
  ON mini_apps USING gin(manifest);

-- Full-text search optimization
CREATE INDEX idx_feedback_reason_search
  ON feedback_records USING gin(to_tsvector('simple', coalesce(reason, '')))
  WHERE reason IS NOT NULL;
