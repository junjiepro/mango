-- Fix devices table INSERT policy
-- 移除之前的策略并创建新的策略

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "Authenticated users can create devices" ON devices;

-- 创建新的 INSERT 策略,验证用户已认证
CREATE POLICY "Authenticated users can create devices"
  ON devices FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 删除旧的 UPDATE 策略
DROP POLICY IF EXISTS "Authenticated users can update devices" ON devices;

-- 创建新的 UPDATE 策略,验证用户已认证
CREATE POLICY "Authenticated users can update devices"
  ON devices FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
