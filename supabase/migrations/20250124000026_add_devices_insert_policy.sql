-- Add missing INSERT and UPDATE policies for devices table
-- 允许认证用户创建和更新设备记录

-- 认证用户可以创建设备记录
CREATE POLICY "Authenticated users can create devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 认证用户可以更新设备的 last_seen_at
CREATE POLICY "Authenticated users can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
