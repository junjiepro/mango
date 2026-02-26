-- Phase 9: Database Index Optimization
-- Adds missing indexes identified from query pattern analysis

-- learning_records: confidence range query + sort
CREATE INDEX IF NOT EXISTS idx_learning_confidence_score
  ON learning_records(user_id, confidence DESC)
  WHERE is_active = true;

-- skill_registry: skill_id + active status lookup
CREATE INDEX IF NOT EXISTS idx_registry_skill_active
  ON skill_registry(skill_id, is_active)
  WHERE is_active = true;

-- skill_registry: category + active filter
CREATE INDEX IF NOT EXISTS idx_registry_category_active
  ON skill_registry(category, is_active)
  WHERE is_active = true;

-- messages: sequence_number ordering (hot path for conversation history)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_seq_desc
  ON messages(conversation_id, sequence_number DESC);

-- mini_app_installations: triple condition lookup
CREATE INDEX IF NOT EXISTS idx_installations_user_app_status
  ON mini_app_installations(user_id, mini_app_id, status)
  WHERE status = 'active';

-- a2ui_components: time series query
CREATE INDEX IF NOT EXISTS idx_a2ui_conversation_created
  ON a2ui_components(conversation_id, created_at DESC);

-- terminal_sessions: user session list
CREATE INDEX IF NOT EXISTS idx_terminal_user_created
  ON terminal_sessions(user_id, created_at DESC);

-- git_repositories: user + status filter
CREATE INDEX IF NOT EXISTS idx_git_repos_user_status
  ON git_repositories(user_id, status)
  WHERE status = 'active';
