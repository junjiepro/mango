-- Additional RLS Policies for fine-grained access control

-- Conversations: 允许用户创建
CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Messages: 允许用户更新自己的消息
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Attachments: 允许用户插入附件
CREATE POLICY "Users can insert attachments in own messages"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON messages.conversation_id = conversations.id
      WHERE attachments.message_id = messages.id
        AND conversations.user_id = auth.uid()
    )
  );

-- Tasks: 允许用户插入任务
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tools: 允许系统管理员管理公共工具 (需要自定义角色)
-- 注意: 这个策略需要在应用层面实现,因为 Supabase Auth 不直接支持角色

-- Mini Apps: 允许用户插入自己的小应用
CREATE POLICY "Users can insert own mini apps"
  ON mini_apps FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Mini App Installations: 允许用户查看已安装的应用
CREATE POLICY "Users can view own installations"
  ON mini_app_installations FOR SELECT
  USING (auth.uid() = user_id);

-- Feedback: 允许用户插入反馈
CREATE POLICY "Users can insert own feedback"
  ON feedback_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learning Records: 允许用户查看自己的学习记录
CREATE POLICY "Users can view own learning records"
  ON learning_records FOR SELECT
  USING (auth.uid() = user_id);

-- Notifications: 允许用户插入(系统生成)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- 将在 Edge Functions 中控制
