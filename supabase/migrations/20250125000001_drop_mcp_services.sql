-- Drop mcp_services table
-- MCP configurations should be stored on the CLI device side, not in the database

-- Drop indexes first
DROP INDEX IF EXISTS idx_mcp_services_binding;
DROP INDEX IF EXISTS idx_mcp_services_status;

-- Drop the table
DROP TABLE IF EXISTS mcp_services;
