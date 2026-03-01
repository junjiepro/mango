-- Generated Files Storage Policies
-- 允许认证用户查看自己对话中生成的文件

-- 创建辅助函数：从文件路径中提取 conversation_id
CREATE OR REPLACE FUNCTION extract_conversation_id_from_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
  path_parts TEXT[];
  conversation_id_str TEXT;
BEGIN
  -- 路径格式: generated-images/{conversationId}/{filename}
  path_parts := string_to_array(file_path, '/');

  -- 获取第二部分（conversationId）
  IF array_length(path_parts, 1) >= 2 THEN
    conversation_id_str := path_parts[2];

    -- 验证是否为有效的 UUID
    BEGIN
      RETURN conversation_id_str::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建辅助函数：检查用户是否拥有该对话
CREATE OR REPLACE FUNCTION user_owns_conversation(conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为 attachments bucket 添加新策略：允许用户查看自己对话中生成的文件
CREATE POLICY "Users can view generated files in own conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    name LIKE 'generated-images/%' AND
    user_owns_conversation(extract_conversation_id_from_path(name))
  );

-- 允许系统（Edge Functions）上传生成的文件到对话目录
-- 注意：这需要 Edge Function 使用 service_role key
CREATE POLICY "Service role can upload generated files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    name LIKE 'generated-images/%'
  );

-- 允许用户删除自己对话中的生成文件
CREATE POLICY "Users can delete generated files in own conversations"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    name LIKE 'generated-images/%' AND
    user_owns_conversation(extract_conversation_id_from_path(name))
  );

-- 添加注释
COMMENT ON FUNCTION extract_conversation_id_from_path IS '从存储路径中提取 conversation_id，路径格式: generated-images/{conversationId}/{filename}';
COMMENT ON FUNCTION user_owns_conversation IS '检查当前认证用户是否拥有指定的对话';
