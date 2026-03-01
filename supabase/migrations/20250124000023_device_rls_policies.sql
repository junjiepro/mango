-- RLS policies for devices, device_bindings, and mcp_services tables
-- User Story 3: CLI工具与设备服务

-- Enable RLS on all device-related tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_services ENABLE ROW LEVEL SECURITY;

-- Devices table policies
-- Users can view devices that are bound to them
CREATE POLICY "Users can view their bound devices"
  ON devices FOR SELECT
  USING (
    id IN (
      SELECT device_id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

-- Device bindings table policies
-- Users can view their own bindings
CREATE POLICY "Users can view their own bindings"
  ON device_bindings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own bindings
CREATE POLICY "Users can create their own bindings"
  ON device_bindings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bindings
CREATE POLICY "Users can update their own bindings"
  ON device_bindings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bindings
CREATE POLICY "Users can delete their own bindings"
  ON device_bindings FOR DELETE
  USING (auth.uid() = user_id);

-- MCP services table policies
-- Users can view MCP services for their own bindings
CREATE POLICY "Users can view their own MCP services"
  ON mcp_services FOR SELECT
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

-- Users can create MCP services for their own bindings
CREATE POLICY "Users can create their own MCP services"
  ON mcp_services FOR INSERT
  WITH CHECK (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

-- Users can update MCP services for their own bindings
CREATE POLICY "Users can update their own MCP services"
  ON mcp_services FOR UPDATE
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

-- Users can delete MCP services for their own bindings
CREATE POLICY "Users can delete their own MCP services"
  ON mcp_services FOR DELETE
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );
