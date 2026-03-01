-- Storage Buckets and Policies
-- 创建文件存储 bucket 和访问策略

-- 创建 attachments bucket (私有访问,无文件格式限制)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,  -- 私有访问,仅用户自己可见
  52428800,  -- 50MB 限制
  NULL  -- 不限制文件格式
)
ON CONFLICT (id) DO NOTHING;

-- Storage 访问策略

-- 1. 允许认证用户上传文件到自己的目录
CREATE POLICY "Users can upload files to own directory"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. 允许认证用户更新自己的文件
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. 允许认证用户删除自己的文件
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. 允许认证用户查看自己的文件
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
