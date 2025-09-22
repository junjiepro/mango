# AI Agent Supabase Migrations

This directory contains the database migrations for the AI Agent system in Mango project.

## Migration Files

### 20241201000000_ai_agent_schema.sql
- **Purpose**: Creates the complete AI Agent database schema
- **Contents**:
  - Custom types (enums)
  - 7 main tables with proper relationships
  - Performance indexes
  - Row Level Security (RLS) policies
  - Full-text search capabilities

### 20241201000001_ai_agent_functions.sql
- **Purpose**: Creates functions, triggers, and utility operations
- **Contents**:
  - Automated timestamp triggers
  - Session management functions
  - User statistics functions
  - Data cleanup utilities

## Tables Created

1. **ai_agent_sessions** - Main conversation sessions
2. **ai_agent_messages** - Individual messages within sessions
3. **mcp_servers** - Model Context Protocol server configurations
4. **ai_agent_plugins** - Plugin management and configuration
5. **tool_execution_records** - Tool execution tracking
6. **multimodal_content** - Multimodal content storage
7. **ai_agent_user_preferences** - User preferences and settings

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - users can only access their own data
- **Secure functions** with `security definer` and explicit `search_path`
- **Extensions isolation** - pg_trgm and uuid-ossp in separate schema

## How to Apply Migrations

### Using Supabase CLI

1. **Initialize Supabase** (if not already done):
   ```bash
   supabase init
   ```

2. **Link to your Supabase project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Apply migrations**:
   ```bash
   supabase db push
   ```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content of each migration file
4. Run them in order:
   - First: `20241201000000_ai_agent_schema.sql`
   - Second: `20241201000001_ai_agent_functions.sql`

### Manual Application

If you need to apply these manually via psql or another SQL client:

```bash
# Connect to your database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Apply schema migration
\i supabase/migrations/20241201000000_ai_agent_schema.sql

# Apply functions migration
\i supabase/migrations/20241201000001_ai_agent_functions.sql
```

## Environment Setup

Make sure your environment variables are properly configured:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Verification

After applying the migrations, you can verify the setup:

1. **Check tables**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'ai_agent%';
   ```

2. **Check RLS policies**:
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename LIKE 'ai_agent%';
   ```

3. **Check functions**:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE '%ai_agent%';
   ```

## Rollback

If you need to rollback these migrations:

```sql
-- Drop all AI Agent tables (in dependency order)
DROP TABLE IF EXISTS public.multimodal_content CASCADE;
DROP TABLE IF EXISTS public.tool_execution_records CASCADE;
DROP TABLE IF EXISTS public.ai_agent_messages CASCADE;
DROP TABLE IF EXISTS public.ai_agent_plugins CASCADE;
DROP TABLE IF EXISTS public.mcp_servers CASCADE;
DROP TABLE IF EXISTS public.ai_agent_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_agent_user_preferences CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS content_type CASCADE;
DROP TYPE IF EXISTS message_role CASCADE;
DROP TYPE IF EXISTS server_status CASCADE;
DROP TYPE IF EXISTS plugin_status CASCADE;
DROP TYPE IF EXISTS plugin_type CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS user_mode CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_deleted_sessions(integer);
DROP FUNCTION IF EXISTS get_user_session_stats(uuid);
DROP FUNCTION IF EXISTS create_ai_agent_session(uuid, text, user_mode);
DROP FUNCTION IF EXISTS update_session_message_count_on_delete();
DROP FUNCTION IF EXISTS update_session_last_activity();
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Notes

- These migrations are designed to be idempotent where possible
- All tables include proper timestamps and audit fields
- Full-text search is enabled on text fields using pg_trgm
- Performance is optimized with strategic indexes
- Security is enforced through RLS policies

For more information about the AI Agent system, see the main documentation in `docs/AI-AGENT.md`.