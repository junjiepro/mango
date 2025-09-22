-- Supabase seed data for AI Agent system
-- This file contains sample data for development and testing

-- Note: This seed data is for development purposes only
-- It assumes you have at least one user in auth.users table

-- Sample user preferences (will be created automatically via trigger)
-- This is just an example - the system will create preferences automatically

-- Sample MCP server configurations for testing
INSERT INTO public.mcp_servers (user_id, name, type, url, config, capabilities, status)
VALUES
  (
    (SELECT id FROM auth.users LIMIT 1),
    'GitHub MCP Server',
    'github',
    'http://localhost:3001',
    '{"apiKey": "test", "organization": "test-org"}'::jsonb,
    ARRAY['repository', 'issues', 'pull_requests'],
    'disconnected'
  ),
  (
    (SELECT id FROM auth.users LIMIT 1),
    'Database MCP Server',
    'database',
    'http://localhost:3002',
    '{"host": "localhost", "database": "test"}'::jsonb,
    ARRAY['query', 'schema'],
    'disconnected'
  )
ON CONFLICT (user_id, name) DO NOTHING;

-- Sample plugins for testing
INSERT INTO public.ai_agent_plugins (user_id, plugin_id, name, version, type, description, author, capabilities, status)
VALUES
  (
    (SELECT id FROM auth.users LIMIT 1),
    'code-analyzer-v1',
    'Code Analyzer',
    '1.2.0',
    'mcp',
    'Advanced code analysis and suggestions',
    'Mango Team',
    ARRAY['code_analysis', 'suggestions', 'refactoring'],
    'disabled'
  ),
  (
    (SELECT id FROM auth.users LIMIT 1),
    'file-manager-v2',
    'File Manager',
    '2.1.0',
    'native',
    'File system operations and management',
    'Community',
    ARRAY['file_operations', 'directory_management'],
    'disabled'
  )
ON CONFLICT (user_id, plugin_id) DO NOTHING;

-- Sample AI agent session for testing
INSERT INTO public.ai_agent_sessions (user_id, title, mode, status)
VALUES
  (
    (SELECT id FROM auth.users LIMIT 1),
    'Welcome to AI Agent',
    'simple',
    'active'
  )
ON CONFLICT DO NOTHING;

-- Sample messages for the welcome session
INSERT INTO public.ai_agent_messages (session_id, role, content)
VALUES
  (
    (SELECT id FROM public.ai_agent_sessions WHERE title = 'Welcome to AI Agent' LIMIT 1),
    'system',
    'Welcome to the AI Agent system! This is a demonstration conversation to help you get started.'
  ),
  (
    (SELECT id FROM public.ai_agent_sessions WHERE title = 'Welcome to AI Agent' LIMIT 1),
    'assistant',
    'Hello! I''m your AI Assistant. I can help you with various tasks including code analysis, content creation, and much more. How can I assist you today?'
  )
ON CONFLICT DO NOTHING;