-- Create device_bindings table for User Story 3
-- Stores the many-to-many relationship between devices and users

CREATE TABLE IF NOT EXISTS device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  binding_name TEXT,
  tunnel_url TEXT NOT NULL,
  binding_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(device_id, user_id, binding_name)
);

-- Create indexes
CREATE INDEX idx_device_bindings_user ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_device ON device_bindings(device_id);
CREATE INDEX idx_device_bindings_token ON device_bindings(binding_token);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);

-- Add comments
COMMENT ON TABLE device_bindings IS 'Bindings between devices and users (many-to-many relationship)';
COMMENT ON COLUMN device_bindings.binding_name IS 'User-defined binding name (e.g., "Work PC", "Home Mac")';
COMMENT ON COLUMN device_bindings.tunnel_url IS 'Cloudflare Tunnel public URL';
COMMENT ON COLUMN device_bindings.binding_token IS 'Token for API authentication (256-bit random string)';
COMMENT ON COLUMN device_bindings.status IS 'Binding status (active/inactive/expired)';
COMMENT ON COLUMN device_bindings.config IS 'Binding-level configuration data';
