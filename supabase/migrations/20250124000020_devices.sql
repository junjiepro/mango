-- Create devices table for User Story 3
-- Stores information about local devices running the CLI tool

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);

-- Add comments
COMMENT ON TABLE devices IS 'Local devices running the Mango CLI tool';
COMMENT ON COLUMN devices.device_id IS 'Unique device identifier based on hardware information';
COMMENT ON COLUMN devices.device_name IS 'User-defined device name';
COMMENT ON COLUMN devices.platform IS 'Operating system platform (windows/macos/linux)';
COMMENT ON COLUMN devices.last_seen_at IS 'Last time the device was active';
