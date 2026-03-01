-- Create mcp_services table for User Story 3
-- Stores MCP service configurations for each device binding

CREATE TABLE IF NOT EXISTS mcp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id UUID REFERENCES device_bindings(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  command TEXT NOT NULL,
  args JSONB DEFAULT '[]',
  env JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(binding_id, service_name)
);

-- Create indexes
CREATE INDEX idx_mcp_services_binding ON mcp_services(binding_id);
CREATE INDEX idx_mcp_services_status ON mcp_services(status);

-- Add comments
COMMENT ON TABLE mcp_services IS 'MCP service configurations for device bindings';
COMMENT ON COLUMN mcp_services.service_name IS 'MCP service name (unique identifier)';
COMMENT ON COLUMN mcp_services.command IS 'Startup command (e.g., "npx", "python")';
COMMENT ON COLUMN mcp_services.args IS 'Command arguments array';
COMMENT ON COLUMN mcp_services.env IS 'Environment variables key-value pairs';
COMMENT ON COLUMN mcp_services.status IS 'Service status (active/inactive)';
