-- AI Agent Functions and Triggers Migration
-- Migration: 20241201000001_ai_agent_functions
-- Description: Creates all necessary functions, triggers, and utility operations for AI Agent system

-- ===============================================
-- Triggers for Automated Updates
-- ===============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Apply updated_at triggers to relevant tables
create trigger update_ai_agent_sessions_updated_at
    before update on public.ai_agent_sessions
    for each row execute function update_updated_at_column();

create trigger update_ai_agent_messages_updated_at
    before update on public.ai_agent_messages
    for each row execute function update_updated_at_column();

create trigger update_mcp_servers_updated_at
    before update on public.mcp_servers
    for each row execute function update_updated_at_column();

create trigger update_ai_agent_plugins_updated_at
    before update on public.ai_agent_plugins
    for each row execute function update_updated_at_column();

create trigger update_multimodal_content_updated_at
    before update on public.multimodal_content
    for each row execute function update_updated_at_column();

create trigger update_ai_agent_user_preferences_updated_at
    before update on public.ai_agent_user_preferences
    for each row execute function update_updated_at_column();

-- Function to update session last_activity on message insert
create or replace function update_session_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.ai_agent_sessions
    set last_activity = now(),
        message_count = message_count + 1
    where id = new.session_id;
    return new;
end;
$$;

create trigger update_session_activity_on_message
    after insert on public.ai_agent_messages
    for each row execute function update_session_last_activity();

-- Function to update message count on message delete
create or replace function update_session_message_count_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.ai_agent_sessions
    set message_count = greatest(0, message_count - 1)
    where id = old.session_id;
    return old;
end;
$$;

create trigger update_session_count_on_message_delete
    after delete on public.ai_agent_messages
    for each row execute function update_session_message_count_on_delete();

-- ===============================================
-- Functions for Common Operations
-- ===============================================

-- Function to create a new AI agent session
create or replace function create_ai_agent_session(
    p_user_id uuid,
    p_title text default 'New Conversation',
    p_mode user_mode default 'simple'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    session_id uuid;
begin
    insert into public.ai_agent_sessions (user_id, title, mode)
    values (p_user_id, p_title, p_mode)
    returning id into session_id;

    return session_id;
end;
$$;

-- Function to get session statistics for a user
create or replace function get_user_session_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    stats jsonb;
begin
    select jsonb_build_object(
        'total_sessions', count(*),
        'active_sessions', count(*) filter (where status = 'active'),
        'total_messages', coalesce(sum(message_count), 0),
        'total_tokens', coalesce(sum((usage->>'totalTokens')::integer), 0),
        'last_activity', max(last_activity)
    )
    into stats
    from public.ai_agent_sessions
    where user_id = p_user_id and status != 'deleted';

    return stats;
end;
$$;

-- Function to cleanup old deleted sessions
create or replace function cleanup_deleted_sessions(days_old integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    deleted_count integer;
begin
    delete from public.ai_agent_sessions
    where status = 'deleted'
    and deleted_at < now() - interval '1 day' * days_old;

    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

-- ===============================================
-- Initial Data and Migrations
-- ===============================================

-- Create default user preferences for existing users
insert into public.ai_agent_user_preferences (user_id)
select id from auth.users
where id not in (select user_id from public.ai_agent_user_preferences)
on conflict (user_id) do nothing;

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ===============================================
-- Table and Function Comments
-- ===============================================

comment on table public.ai_agent_sessions is 'AI Agent conversation sessions with configuration and usage tracking';
comment on table public.ai_agent_messages is 'Messages within AI Agent sessions with multimodal content support';
comment on table public.mcp_servers is 'Model Context Protocol server configurations and status';
comment on table public.ai_agent_plugins is 'AI Agent plugins including MCP and native plugins';
comment on table public.tool_execution_records is 'Records of tool executions for monitoring and debugging';
comment on table public.multimodal_content is 'Multimodal content associated with messages';
comment on table public.ai_agent_user_preferences is 'User preferences for AI Agent behavior and interface';

comment on function create_ai_agent_session(uuid, text, user_mode) is 'Creates a new AI agent session for a user';
comment on function get_user_session_stats(uuid) is 'Returns comprehensive statistics for a user''s AI agent sessions';
comment on function cleanup_deleted_sessions(integer) is 'Removes old deleted sessions to maintain database performance';