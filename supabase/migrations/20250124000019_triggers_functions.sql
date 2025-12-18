-- Triggers and Functions for Automation

-- Function: Increment mini_app invocation count
CREATE OR REPLACE FUNCTION increment_miniapp_invocations(miniapp_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE mini_apps
  SET stats = jsonb_set(
    stats,
    '{total_invocations}',
    (COALESCE((stats->>'total_invocations')::int, 0) + 1)::text::jsonb
  )
  WHERE id = miniapp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;