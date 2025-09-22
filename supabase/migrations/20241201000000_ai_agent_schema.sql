-- AI Agent Database Schema Migration for Supabase
-- Migration: 20241201000000_ai_agent_schema
-- Description: Creates the complete AI Agent system schema with tables, types, functions, and security policies

-- Enable necessary extensions in extensions schema
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Create custom types
create type user_mode as enum ('simple', 'advanced');
create type session_status as enum ('active', 'paused', 'completed', 'error', 'deleted');
create type plugin_type as enum ('mcp', 'native', 'custom');
create type plugin_status as enum ('loading', 'active', 'error', 'disabled');
create type server_status as enum ('connecting', 'connected', 'disconnected', 'error');
create type message_role as enum ('user', 'assistant', 'system', 'tool');
create type content_type as enum ('text', 'code', 'html', 'image', 'audio', 'file');

-- ===============================================
-- AI Agent Sessions Table
-- ===============================================
create table public.ai_agent_sessions (
    id uuid default extensions.uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,

    -- Session metadata
    title text not null default 'New Conversation',
    mode user_mode not null default 'simple',
    status session_status not null default 'active',

    -- Session configuration
    context jsonb default '{}'::jsonb,
    capabilities text[] default array[]::text[],
    plugins jsonb default '[]'::jsonb,
    mcp_config jsonb default '{}'::jsonb,
    preferences jsonb default '{}'::jsonb,

    -- Usage tracking
    message_count integer default 0,
    usage jsonb default '{
        "promptTokens": 0,
        "completionTokens": 0,
        "totalTokens": 0
    }'::jsonb,

    -- Metadata
    tags text[] default array[]::text[],
    metadata jsonb default '{}'::jsonb,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    last_activity timestamp with time zone default now() not null,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,

    -- Constraints
    constraint ai_agent_sessions_title_length check (char_length(title) >= 1 and char_length(title) <= 200),
    constraint ai_agent_sessions_message_count_positive check (message_count >= 0)
);

-- ===============================================
-- AI Agent Messages Table
-- ===============================================
create table public.ai_agent_messages (
    id uuid default extensions.uuid_generate_v4() primary key,
    session_id uuid references public.ai_agent_sessions(id) on delete cascade not null,

    -- Message content
    role message_role not null,
    content text not null,
    multimodal_content jsonb default '[]'::jsonb,

    -- Tool interactions
    tool_invocations jsonb default '[]'::jsonb,
    tool_calls jsonb default '[]'::jsonb,

    -- Message metadata
    metadata jsonb default '{}'::jsonb,

    -- Performance tracking
    processing_time_ms integer,
    token_count integer default 0,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,

    -- Constraints
    constraint ai_agent_messages_content_not_empty check (char_length(content) >= 1),
    constraint ai_agent_messages_token_count_positive check (token_count >= 0),
    constraint ai_agent_messages_processing_time_positive check (processing_time_ms >= 0)
);

-- ===============================================
-- MCP Servers Table
-- ===============================================
create table public.mcp_servers (
    id uuid default extensions.uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,

    -- Server identification
    name text not null,
    type text not null,
    url text,

    -- Configuration
    config jsonb not null default '{}'::jsonb,
    capabilities text[] default array[]::text[],

    -- Status tracking
    status server_status not null default 'disconnected',
    last_activity timestamp with time zone,
    error_count integer default 0,
    last_error text,

    -- Performance metrics
    tool_count integer default 0,
    response_time_avg_ms integer,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,

    -- Constraints
    constraint mcp_servers_name_length check (char_length(name) >= 1 and char_length(name) <= 100),
    constraint mcp_servers_error_count_positive check (error_count >= 0),
    constraint mcp_servers_tool_count_positive check (tool_count >= 0),
    constraint mcp_servers_user_name_unique unique (user_id, name)
);

-- ===============================================
-- Plugins Table
-- ===============================================
create table public.ai_agent_plugins (
    id uuid default extensions.uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,

    -- Plugin identification
    plugin_id text not null, -- Unique plugin identifier
    name text not null,
    version text not null default '1.0.0',
    type plugin_type not null,

    -- Plugin metadata
    description text,
    author text,
    homepage_url text,
    repository_url text,

    -- Configuration
    config jsonb default '{}'::jsonb,
    capabilities text[] default array[]::text[],

    -- Status tracking
    status plugin_status not null default 'loading',
    enabled boolean default true,
    last_activity timestamp with time zone,
    error_count integer default 0,
    last_error text,

    -- MCP integration (for MCP plugins)
    mcp_server_id uuid references public.mcp_servers(id) on delete set null,
    mcp_config jsonb default '{}'::jsonb,

    -- Tool schemas (for plugin tools)
    tool_schemas jsonb default '[]'::jsonb,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    installed_at timestamp with time zone default now() not null,

    -- Constraints
    constraint ai_agent_plugins_name_length check (char_length(name) >= 1 and char_length(name) <= 100),
    constraint ai_agent_plugins_error_count_positive check (error_count >= 0),
    constraint ai_agent_plugins_user_plugin_unique unique (user_id, plugin_id)
);

-- ===============================================
-- Tool Execution Records Table
-- ===============================================
create table public.tool_execution_records (
    id uuid default extensions.uuid_generate_v4() primary key,
    session_id uuid references public.ai_agent_sessions(id) on delete cascade not null,
    message_id uuid references public.ai_agent_messages(id) on delete cascade,

    -- Tool identification
    tool_name text not null,
    plugin_id uuid references public.ai_agent_plugins(id) on delete set null,
    mcp_server_id uuid references public.mcp_servers(id) on delete set null,

    -- Execution details
    parameters jsonb default '{}'::jsonb,
    result jsonb,
    error_message text,

    -- Performance tracking
    execution_time_ms integer,
    status text not null default 'pending', -- pending, running, completed, failed

    -- Timestamps
    started_at timestamp with time zone default now() not null,
    completed_at timestamp with time zone,

    -- Constraints
    constraint tool_execution_records_tool_name_not_empty check (char_length(tool_name) >= 1),
    constraint tool_execution_records_execution_time_positive check (execution_time_ms >= 0)
);

-- ===============================================
-- Multimodal Content Table
-- ===============================================
create table public.multimodal_content (
    id uuid default extensions.uuid_generate_v4() primary key,
    message_id uuid references public.ai_agent_messages(id) on delete cascade not null,

    -- Content identification
    content_type content_type not null,
    content_order integer not null default 0,

    -- Content data
    content_data jsonb not null,
    file_url text,
    file_size bigint,
    mime_type text,

    -- Processing status
    processed boolean default false,
    processing_result jsonb,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,

    -- Constraints
    constraint multimodal_content_content_order_positive check (content_order >= 0),
    constraint multimodal_content_file_size_positive check (file_size >= 0)
);

-- ===============================================
-- User Preferences Table
-- ===============================================
create table public.ai_agent_user_preferences (
    user_id uuid references auth.users(id) on delete cascade primary key,

    -- UI preferences
    default_mode user_mode default 'simple',
    theme text default 'system',
    language text default 'zh',

    -- AI preferences
    default_model text default 'gpt-4o',
    temperature real default 0.7,
    max_tokens integer default 4096,

    -- Feature preferences
    auto_save boolean default true,
    show_token_usage boolean default false,
    enable_notifications boolean default true,

    -- Privacy preferences
    data_retention_days integer default 30,
    share_analytics boolean default false,

    -- Configuration
    custom_prompts jsonb default '[]'::jsonb,
    quick_actions jsonb default '[]'::jsonb,

    -- Timestamps
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,

    -- Constraints
    constraint ai_agent_user_preferences_temperature_range check (temperature >= 0.0 and temperature <= 2.0),
    constraint ai_agent_user_preferences_max_tokens_positive check (max_tokens > 0),
    constraint ai_agent_user_preferences_retention_positive check (data_retention_days >= 1)
);

-- ===============================================
-- Indexes for Performance
-- ===============================================

-- Sessions table indexes
create index idx_ai_agent_sessions_user_id on public.ai_agent_sessions(user_id);
create index idx_ai_agent_sessions_status on public.ai_agent_sessions(status);
create index idx_ai_agent_sessions_last_activity on public.ai_agent_sessions(last_activity desc);
create index idx_ai_agent_sessions_user_status on public.ai_agent_sessions(user_id, status);
create index idx_ai_agent_sessions_mode on public.ai_agent_sessions(mode);

-- Messages table indexes
create index idx_ai_agent_messages_session_id on public.ai_agent_messages(session_id);
create index idx_ai_agent_messages_created_at on public.ai_agent_messages(created_at desc);
create index idx_ai_agent_messages_role on public.ai_agent_messages(role);
create index idx_ai_agent_messages_session_created on public.ai_agent_messages(session_id, created_at desc);

-- MCP servers indexes
create index idx_mcp_servers_user_id on public.mcp_servers(user_id);
create index idx_mcp_servers_status on public.mcp_servers(status);
create index idx_mcp_servers_type on public.mcp_servers(type);
create index idx_mcp_servers_last_activity on public.mcp_servers(last_activity desc);

-- Plugins indexes
create index idx_ai_agent_plugins_user_id on public.ai_agent_plugins(user_id);
create index idx_ai_agent_plugins_type on public.ai_agent_plugins(type);
create index idx_ai_agent_plugins_status on public.ai_agent_plugins(status);
create index idx_ai_agent_plugins_enabled on public.ai_agent_plugins(enabled);
create index idx_ai_agent_plugins_mcp_server on public.ai_agent_plugins(mcp_server_id);

-- Tool execution records indexes
create index idx_tool_execution_records_session_id on public.tool_execution_records(session_id);
create index idx_tool_execution_records_message_id on public.tool_execution_records(message_id);
create index idx_tool_execution_records_plugin_id on public.tool_execution_records(plugin_id);
create index idx_tool_execution_records_started_at on public.tool_execution_records(started_at desc);
create index idx_tool_execution_records_status on public.tool_execution_records(status);

-- Multimodal content indexes
create index idx_multimodal_content_message_id on public.multimodal_content(message_id);
create index idx_multimodal_content_type on public.multimodal_content(content_type);
create index idx_multimodal_content_order on public.multimodal_content(message_id, content_order);

-- Full-text search indexes
create index idx_ai_agent_sessions_title_gin on public.ai_agent_sessions using gin (title extensions.gin_trgm_ops);
create index idx_ai_agent_messages_content_gin on public.ai_agent_messages using gin (content extensions.gin_trgm_ops);
create index idx_mcp_servers_name_gin on public.mcp_servers using gin (name extensions.gin_trgm_ops);
create index idx_ai_agent_plugins_name_gin on public.ai_agent_plugins using gin (name extensions.gin_trgm_ops);

-- ===============================================
-- Row Level Security (RLS) Policies
-- ===============================================

-- Enable RLS on all tables
alter table public.ai_agent_sessions enable row level security;
alter table public.ai_agent_messages enable row level security;
alter table public.mcp_servers enable row level security;
alter table public.ai_agent_plugins enable row level security;
alter table public.tool_execution_records enable row level security;
alter table public.multimodal_content enable row level security;
alter table public.ai_agent_user_preferences enable row level security;

-- Sessions policies
create policy "Users can view their own sessions" on public.ai_agent_sessions
    for select using (auth.uid() = user_id);

create policy "Users can insert their own sessions" on public.ai_agent_sessions
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own sessions" on public.ai_agent_sessions
    for update using (auth.uid() = user_id);

create policy "Users can delete their own sessions" on public.ai_agent_sessions
    for delete using (auth.uid() = user_id);

-- Messages policies
create policy "Users can view messages from their sessions" on public.ai_agent_messages
    for select using (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

create policy "Users can insert messages to their sessions" on public.ai_agent_messages
    for insert with check (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

create policy "Users can update messages in their sessions" on public.ai_agent_messages
    for update using (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

create policy "Users can delete messages from their sessions" on public.ai_agent_messages
    for delete using (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

-- MCP servers policies
create policy "Users can manage their own MCP servers" on public.mcp_servers
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Plugins policies
create policy "Users can manage their own plugins" on public.ai_agent_plugins
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Tool execution records policies
create policy "Users can view tool executions from their sessions" on public.tool_execution_records
    for select using (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

create policy "Users can insert tool executions to their sessions" on public.tool_execution_records
    for insert with check (
        exists (
            select 1 from public.ai_agent_sessions
            where id = session_id and user_id = auth.uid()
        )
    );

-- Multimodal content policies
create policy "Users can view multimodal content from their messages" on public.multimodal_content
    for select using (
        exists (
            select 1 from public.ai_agent_messages m
            join public.ai_agent_sessions s on m.session_id = s.id
            where m.id = message_id and s.user_id = auth.uid()
        )
    );

create policy "Users can insert multimodal content to their messages" on public.multimodal_content
    for insert with check (
        exists (
            select 1 from public.ai_agent_messages m
            join public.ai_agent_sessions s on m.session_id = s.id
            where m.id = message_id and s.user_id = auth.uid()
        )
    );

-- User preferences policies
create policy "Users can manage their own preferences" on public.ai_agent_user_preferences
    for all using (auth.uid() = user_id)
    with check (auth.uid() = user_id);