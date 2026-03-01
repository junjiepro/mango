-- Triggers and Functions for Automation

-- Function: Auto-increment sequence number for messages
CREATE OR REPLACE FUNCTION set_message_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM messages
    WHERE conversation_id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_message_sequence_trigger
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION set_message_sequence_number();

-- Function: Update user last_active_at
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_last_active_on_message
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.sender_type = 'user')
EXECUTE FUNCTION update_user_last_active();

-- Function: Update conversation stats on task completion
CREATE OR REPLACE FUNCTION update_conversation_task_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE conversations
    SET stats = jsonb_set(
      stats,
      '{task_count}',
      ((stats->>'task_count')::int + 1)::text::jsonb
    )
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_task_stats_trigger
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_conversation_task_stats();

-- Function: Update mini_app stats on installation
CREATE OR REPLACE FUNCTION update_miniapp_install_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mini_apps
    SET stats = jsonb_set(
      stats,
      '{install_count}',
      ((stats->>'install_count')::int + 1)::text::jsonb
    )
    WHERE id = NEW.mini_app_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mini_apps
    SET stats = jsonb_set(
      stats,
      '{install_count}',
      GREATEST((stats->>'install_count')::int - 1, 0)::text::jsonb
    )
    WHERE id = OLD.mini_app_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_miniapp_install_stats_trigger
AFTER INSERT OR DELETE ON mini_app_installations
FOR EACH ROW EXECUTE FUNCTION update_miniapp_install_stats();

-- Function: Soft delete for feedback records
CREATE OR REPLACE FUNCTION soft_delete_feedback()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Soft delete 需要在应用层触发 UPDATE 而非 DELETE

-- Function: Expire old notifications
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET status = 'archived'
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status = 'unread';
END;
$$ LANGUAGE plpgsql;

-- 可以通过 pg_cron 或 Supabase Edge Functions 定期调用此函数
