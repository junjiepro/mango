# Data Model: Mango - 智能Agent对话平台

**Feature**: 001-agent-chat-platform
**Date**: 2025-11-24
**Purpose**: Phase 1 数据模型设计 - 定义核心实体、关系和数据结构

---

## 1. 实体关系概览

### 1.1 核心实体图

```
┌─────────────┐
│    User     │ 用户
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│Conversation │ 对话
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐      ┌─────────────┐
│   Message   │─────▶│ Attachment  │ 附件
└──────┬──────┘ 1:N  └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐      ┌─────────────┐
│    Task     │─────▶│  TaskLog    │ 任务日志
└──────┬──────┘ 1:N  └─────────────┘
       │
       │ M:N (通过tool_calls)
       ▼
┌─────────────┐      ┌─────────────┐
│    Tool     │      │   MiniApp   │ 小应用
└─────────────┘      └──────┬──────┘
                            │ 1:N
                            ▼
                     ┌─────────────┐
                     │MiniAppData  │ 小应用数据
                     └─────────────┘

┌─────────────┐      ┌─────────────┐
│  Feedback   │─────▶│LearningRec  │ 学习记录
└─────────────┘ N:M  └─────────────┘
```

---

## 2. 核心实体定义

### 2.1 用户 (users)

**描述**：使用平台的终端用户，通过Supabase Auth管理。

```sql
-- Supabase Auth自动管理 auth.users 表
-- 扩展用户配置表
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,

  -- 用户偏好
  preferences JSONB DEFAULT '{
    "language": "zh-CN",
    "theme": "system",
    "notifications_enabled": true,
    "agent_behavior": {
      "response_style": "balanced",
      "detail_level": "medium",
      "auto_execute": false
    }
  }',

  -- 配额与限制
  quota JSONB DEFAULT '{
    "monthly_messages": 1000,
    "used_messages": 0,
    "storage_mb": 100,
    "used_storage_mb": 0
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  -- 索引
  CONSTRAINT valid_display_name CHECK (char_length(display_name) >= 2)
);

-- 索引
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

-- RLS策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**关键字段说明**：
- `preferences.agent_behavior`：Agent行为偏好（响应风格、详细程度）
- `quota`：用户配额管理（消息数、存储空间）

---

### 2.2 对话 (conversations)

**描述**：用户与Agent之间的会话容器。

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200),
  description TEXT,

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deleted')
  ),

  -- 上下文管理
  context JSONB DEFAULT '{
    "model": "claude-3-5-sonnet",
    "temperature": 0.7,
    "max_tokens": 4096,
    "system_prompt": null
  }',

  -- 统计信息
  stats JSONB DEFAULT '{
    "message_count": 0,
    "task_count": 0,
    "total_tokens": 0,
    "avg_response_time_ms": 0
  }',

  -- 元数据
  metadata JSONB DEFAULT '{}', -- 扩展字段

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- 索引约束
  CONSTRAINT valid_title CHECK (char_length(title) >= 1)
);

-- 索引
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status = 'active';
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- 全文搜索索引
CREATE INDEX idx_conversations_search ON conversations USING gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- RLS策略
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**关键字段说明**：
- `context`：对话级别的Agent配置（模型、参数、系统提示）
- `stats`：对话统计信息（消息数、任务数、token使用）

---

### 2.3 消息 (messages)

**描述**：对话中的单条信息，支持多模态内容。

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- 发送者
  sender_type VARCHAR(20) NOT NULL CHECK (
    sender_type IN ('user', 'agent', 'system', 'miniapp')
  ),
  sender_id UUID, -- user_id 或 miniapp_id

  -- 内容
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text/markdown' CHECK (
    content_type IN (
      'text/plain', 'text/markdown', 'text/html',
      'application/json', 'multipart/mixed'
    )
  ),

  -- 多模态支持
  attachments JSONB DEFAULT '[]', -- [{id, type, url, size, name}]

  -- Agent特定字段
  agent_metadata JSONB, -- {model, tokens, thinking_time_ms, tool_calls}

  -- 状态
  status VARCHAR(20) DEFAULT 'sent' CHECK (
    status IN ('pending', 'sending', 'sent', 'failed', 'edited', 'deleted')
  ),

  -- 引用与上下文
  reply_to_message_id UUID REFERENCES messages(id),
  sequence_number INT NOT NULL, -- 对话内的序号

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_content CHECK (char_length(content) >= 1),
  CONSTRAINT valid_sender CHECK (
    (sender_type = 'user' AND sender_id IS NOT NULL) OR
    (sender_type = 'agent') OR
    (sender_type = 'system') OR
    (sender_type = 'miniapp' AND sender_id IS NOT NULL)
  ),
  UNIQUE (conversation_id, sequence_number)
);

-- 索引
CREATE INDEX idx_messages_conversation_seq ON messages(conversation_id, sequence_number DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status) WHERE status = 'pending';
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- 全文搜索索引
CREATE INDEX idx_messages_search ON messages USING gin(
  to_tsvector('simple', content)
);

-- RLS策略
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
```

**关键字段说明**：
- `sender_type`：支持user/agent/system/miniapp四种发送者
- `attachments`：附件数组，支持图片、文件等多模态内容
- `agent_metadata`：Agent响应的元信息（模型、token、思考时间、工具调用）

---

### 2.4 附件 (attachments)

**描述**：消息中的媒体文件和文档。

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- 文件信息
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL, -- MIME type
  file_size BIGINT NOT NULL, -- bytes

  -- 存储
  storage_path TEXT NOT NULL, -- Supabase Storage路径
  storage_bucket VARCHAR(100) DEFAULT 'attachments',

  -- 元数据
  metadata JSONB DEFAULT '{
    "width": null,
    "height": null,
    "duration": null,
    "thumbnail_url": null
  }',

  -- 状态
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (
    status IN ('uploading', 'uploaded', 'processing', 'ready', 'failed')
  ),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800) -- 50MB
);

-- 索引
CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_type ON attachments(file_type);
CREATE INDEX idx_attachments_created ON attachments(created_at DESC);

-- RLS策略
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in own messages"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON messages.conversation_id = conversations.id
      WHERE attachments.message_id = messages.id
        AND conversations.user_id = auth.uid()
    )
  );
```

**关键字段说明**：
- `storage_path`：Supabase Storage中的文件路径
- `metadata`：根据文件类型存储不同元信息（图片尺寸、视频时长等）

---

### 2.5 任务 (tasks)

**描述**：Agent执行的具体工作单元。

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id), -- 触发该任务的消息
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 任务信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'analysis', 'generation', 'search', 'tool_call'

  -- 状态管理
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- 执行信息
  agent_config JSONB DEFAULT '{
    "model": "claude-3-5-sonnet",
    "tools": [],
    "max_iterations": 10
  }',

  -- 结果
  result JSONB, -- 任务执行结果
  error_message TEXT,

  -- 工具调用记录
  tool_calls JSONB DEFAULT '[]', -- [{tool_name, input, output, duration_ms}]

  -- 性能指标
  metrics JSONB DEFAULT '{
    "start_time": null,
    "end_time": null,
    "duration_ms": null,
    "tokens_used": 0,
    "tool_call_count": 0
  }',

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_progress CHECK (
    (status = 'completed' AND progress = 100) OR
    (status = 'failed' AND progress >= 0) OR
    (status IN ('pending', 'queued', 'running') AND progress < 100)
  )
);

-- 索引
CREATE INDEX idx_tasks_conversation ON tasks(conversation_id, created_at DESC);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status, created_at DESC);
CREATE INDEX idx_tasks_status_updated ON tasks(status, updated_at) WHERE status IN ('pending', 'queued', 'running');
CREATE INDEX idx_tasks_message ON tasks(message_id) WHERE message_id IS NOT NULL;

-- RLS策略
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**关键字段说明**：
- `status` + `progress`：细粒度的任务状态追踪
- `tool_calls`：记录Agent调用的所有工具及其结果
- `metrics`：性能监控指标

---

### 2.6 工具 (tools)

**描述**：Agent可调用的外部能力（MCP/ACP工具）。

```sql
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 工具信息
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- 'search', 'data_processing', 'code', 'communication'

  -- 协议类型
  protocol VARCHAR(20) NOT NULL CHECK (
    protocol IN ('mcp', 'acp', 'a2a', 'native')
  ),

  -- 配置
  config JSONB NOT NULL DEFAULT '{
    "endpoint": null,
    "authentication": {},
    "parameters_schema": {},
    "timeout_ms": 30000
  }',

  -- 权限要求
  required_permissions TEXT[] DEFAULT '{}', -- ['user:read', 'api:external']

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'disabled', 'deprecated')
  ),
  is_public BOOLEAN DEFAULT false, -- 公开工具 vs 用户私有

  -- 所有者（如果是用户添加的工具）
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 使用统计
  stats JSONB DEFAULT '{
    "total_calls": 0,
    "success_calls": 0,
    "avg_duration_ms": 0,
    "last_called_at": null
  }',

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_name CHECK (char_length(name) >= 2)
);

-- 索引
CREATE INDEX idx_tools_protocol ON tools(protocol);
CREATE INDEX idx_tools_category ON tools(category) WHERE category IS NOT NULL;
CREATE INDEX idx_tools_status ON tools(status) WHERE status = 'active';
CREATE INDEX idx_tools_owner ON tools(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_tools_public ON tools(is_public) WHERE is_public = true;

-- RLS策略
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view public tools"
  ON tools FOR SELECT
  USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can manage own tools"
  ON tools FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

**关键字段说明**：
- `protocol`：支持MCP/ACP/A2A/native四种协议
- `config`：工具配置（端点、认证、参数Schema、超时）
- `is_public`：区分系统工具和用户私有工具

---

### 2.7 小应用 (mini_apps)

**描述**：Agent创建的可复用功能模块。

```sql
CREATE TABLE mini_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,

  -- 代码与配置
  code TEXT NOT NULL, -- 小应用的JavaScript代码
  code_hash VARCHAR(64), -- SHA-256 hash for integrity
  manifest JSONB NOT NULL DEFAULT '{
    "version": "1.0.0",
    "required_permissions": [],
    "apis": [],
    "triggers": []
  }',

  -- 运行时配置
  runtime_config JSONB DEFAULT '{
    "sandbox_level": "strict",
    "max_memory_mb": 10,
    "max_execution_time_ms": 5000,
    "allowed_domains": []
  }',

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'suspended', 'archived')
  ),
  is_public BOOLEAN DEFAULT false,
  is_shareable BOOLEAN DEFAULT true,

  -- 使用统计
  stats JSONB DEFAULT '{
    "install_count": 0,
    "active_users": 0,
    "total_invocations": 0,
    "avg_rating": 0
  }',

  -- 审核与安全
  security_review JSONB DEFAULT '{
    "reviewed": false,
    "reviewed_at": null,
    "reviewer_id": null,
    "risk_level": "unknown"
  }',

  -- 元数据
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_name CHECK (char_length(name) >= 2),
  CONSTRAINT valid_code CHECK (char_length(code) >= 10)
);

-- 索引
CREATE INDEX idx_mini_apps_creator ON mini_apps(creator_id, created_at DESC);
CREATE INDEX idx_mini_apps_status ON mini_apps(status) WHERE status = 'active';
CREATE INDEX idx_mini_apps_public ON mini_apps(is_public) WHERE is_public = true;
CREATE INDEX idx_mini_apps_tags ON mini_apps USING gin(tags);

-- 全文搜索
CREATE INDEX idx_mini_apps_search ON mini_apps USING gin(
  to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(description, ''))
);

-- RLS策略
ALTER TABLE mini_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public or own mini apps"
  ON mini_apps FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can manage own mini apps"
  ON mini_apps FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());
```

**关键字段说明**：
- `code`：小应用的JavaScript代码（沙箱环境执行）
- `manifest`：声明式配置（版本、权限、API、触发器）
- `runtime_config`：运行时限制（内存、执行时间、网络域名）
- `security_review`：安全审核状态

---

### 2.8 小应用安装 (mini_app_installations)

**描述**：用户安装的小应用及其数据。

```sql
CREATE TABLE mini_app_installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mini_app_id UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,

  -- 安装信息
  installed_version VARCHAR(20) NOT NULL,
  custom_name VARCHAR(100), -- 用户自定义名称

  -- 权限
  granted_permissions TEXT[] DEFAULT '{}',

  -- 配置
  user_config JSONB DEFAULT '{}', -- 用户自定义配置

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'uninstalled')
  ),

  -- 使用统计
  stats JSONB DEFAULT '{
    "invocation_count": 0,
    "last_used_at": null,
    "total_runtime_ms": 0
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,

  -- 约束
  UNIQUE (user_id, mini_app_id)
);

-- 索引
CREATE INDEX idx_installations_user ON mini_app_installations(user_id, status);
CREATE INDEX idx_installations_app ON mini_app_installations(mini_app_id, status);

-- RLS策略
ALTER TABLE mini_app_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own installations"
  ON mini_app_installations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.9 小应用数据 (mini_app_data)

**描述**：小应用的持久化数据存储。

```sql
CREATE TABLE mini_app_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID NOT NULL REFERENCES mini_app_installations(id) ON DELETE CASCADE,

  -- 数据
  key VARCHAR(200) NOT NULL,
  value JSONB NOT NULL,
  value_type VARCHAR(50), -- 'string', 'number', 'object', 'array'

  -- 元数据
  metadata JSONB DEFAULT '{
    "size_bytes": 0,
    "expires_at": null
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  UNIQUE (installation_id, key),
  CONSTRAINT valid_key CHECK (char_length(key) >= 1)
);

-- 索引
CREATE INDEX idx_mini_app_data_installation ON mini_app_data(installation_id, key);
CREATE INDEX idx_mini_app_data_accessed ON mini_app_data(accessed_at);

-- RLS策略
ALTER TABLE mini_app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own app data"
  ON mini_app_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mini_app_installations
      WHERE mini_app_installations.id = mini_app_data.installation_id
        AND mini_app_installations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_app_installations
      WHERE mini_app_installations.id = mini_app_data.installation_id
        AND mini_app_installations.user_id = auth.uid()
    )
  );
```

---

### 2.10 反馈记录 (feedback_records)

**描述**：用户对Agent输出的反馈。

```sql
CREATE TABLE feedback_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- 反馈内容
  feedback_type VARCHAR(50) NOT NULL CHECK (
    feedback_type IN ('satisfaction', 'accuracy', 'usefulness', 'safety')
  ),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}', -- ["helpful", "too_verbose", "incorrect"]
  reason TEXT,

  -- 元数据
  metadata JSONB DEFAULT '{
    "device_type": null,
    "response_time_ms": null,
    "model_version": null
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- 约束
  CONSTRAINT feedback_target CHECK (
    message_id IS NOT NULL OR task_id IS NOT NULL
  )
);

-- 索引
CREATE INDEX idx_feedback_user ON feedback_records(user_id, created_at DESC);
CREATE INDEX idx_feedback_conversation ON feedback_records(conversation_id);
CREATE INDEX idx_feedback_message ON feedback_records(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_feedback_task ON feedback_records(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_feedback_type ON feedback_records(feedback_type);
CREATE INDEX idx_feedback_deleted ON feedback_records(deleted_at) WHERE deleted_at IS NULL;

-- RLS策略
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON feedback_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.11 学习记录 (learning_records)

**描述**：从反馈中提取的学习规则。

```sql
CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 规则信息
  record_type VARCHAR(50) NOT NULL CHECK (
    record_type IN ('format', 'accuracy', 'safety', 'efficiency', 'preference')
  ),

  -- 规则内容
  rule_content JSONB NOT NULL, -- {condition: {...}, action: {...}}
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 生命周期
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_applied_at TIMESTAMPTZ,

  -- 统计
  application_count INT DEFAULT 0,
  success_count INT DEFAULT 0
);

-- 索引
CREATE INDEX idx_learning_user_active ON learning_records(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_learning_type ON learning_records(record_type);
CREATE INDEX idx_learning_confidence ON learning_records(confidence DESC);

-- RLS策略
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own learning records"
  ON learning_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.12 反馈-学习关联 (learning_record_feedback_links)

**描述**：关联反馈与学习记录。

```sql
CREATE TABLE learning_record_feedback_links (
  learning_record_id UUID NOT NULL REFERENCES learning_records(id) ON DELETE CASCADE,
  feedback_record_id UUID NOT NULL REFERENCES feedback_records(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (learning_record_id, feedback_record_id)
);

-- 索引
CREATE INDEX idx_links_learning ON learning_record_feedback_links(learning_record_id);
CREATE INDEX idx_links_feedback ON learning_record_feedback_links(feedback_record_id);
```

---

## 2.13 设备 (devices) - User Story 3

**描述**：运行 CLI 工具的本地设备

**表结构**：

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);
```

**字段说明**：
- `device_id`: 设备唯一标识（基于硬件信息生成）
- `device_name`: 用户自定义设备名称
- `platform`: 操作系统平台
- `last_seen_at`: 设备最后活跃时间

**RLS策略**：

```sql
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bound devices"
  ON devices FOR SELECT
  USING (
    id IN (
      SELECT device_id FROM device_bindings WHERE user_id = auth.uid()
    )
  );
```

---

## 2.14 设备绑定 (device_bindings) - User Story 3

**描述**：设备与用户之间的绑定关系，支持多对多关系

**表结构**：

```sql
CREATE TABLE device_bindings (
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

CREATE INDEX idx_device_bindings_user ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_device ON device_bindings(device_id);
CREATE INDEX idx_device_bindings_token ON device_bindings(binding_token);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);
```

**字段说明**：
- `binding_name`: 用户自定义绑定名称（如"工作电脑"、"家用Mac"）
- `tunnel_url`: Cloudflare Tunnel 公网 URL
- `binding_token`: 用于 API 认证的 token（256位随机字符串）
- `status`: 绑定状态（active/inactive/expired）
- `config`: 绑定级别的配置数据

**状态转换**：

```
┌─────────┐
│ (创建)  │
└────┬────┘
     │
     ▼
┌─────────┐  用户停用   ┌──────────┐
│ active  │────────────>│ inactive │
└────┬────┘             └─────┬────┘
     │                        │
     │ 用户启用               │
     │<───────────────────────┘
     │
     │ 过期时间到达
     ▼
┌──────────┐
│ expired  │
└──────────┘
```

**RLS策略**：

```sql
ALTER TABLE device_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bindings"
  ON device_bindings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bindings"
  ON device_bindings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bindings"
  ON device_bindings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bindings"
  ON device_bindings FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 2.15 MCP服务配置 (mcp_services) - User Story 3

**描述**：配置在设备绑定下的本地 MCP 服务

**表结构**：

```sql
CREATE TABLE mcp_services (
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

CREATE INDEX idx_mcp_services_binding ON mcp_services(binding_id);
CREATE INDEX idx_mcp_services_status ON mcp_services(status);
```

**字段说明**：
- `service_name`: MCP 服务名称（唯一标识）
- `command`: 启动命令（如 "npx"、"python"）
- `args`: 命令参数数组
- `env`: 环境变量键值对
- `status`: 服务状态（active/inactive）

**配置示例**：

```json
{
  "service_name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Documents"],
  "env": {
    "LOG_LEVEL": "info"
  },
  "status": "active"
}
```

**RLS策略**：

```sql
ALTER TABLE mcp_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP services"
  ON mcp_services FOR SELECT
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own MCP services"
  ON mcp_services FOR INSERT
  WITH CHECK (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own MCP services"
  ON mcp_services FOR UPDATE
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own MCP services"
  ON mcp_services FOR DELETE
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );
```

---

## 3. 辅助表

### 3.1 通知 (notifications)

**描述**：系统和小应用发送的通知。

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 来源
  source_type VARCHAR(20) NOT NULL CHECK (
    source_type IN ('system', 'agent', 'miniapp', 'user')
  ),
  source_id UUID, -- mini_app_id 或其他

  -- 内容
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,

  -- 分类
  category VARCHAR(50), -- 'reminder', 'alert', 'info', 'success', 'error'
  priority VARCHAR(20) DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),

  -- 状态
  status VARCHAR(20) DEFAULT 'unread' CHECK (
    status IN ('unread', 'read', 'archived')
  ),

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
CREATE INDEX idx_notifications_source ON notifications(source_type, source_id);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- RLS策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 3.2 审计日志 (audit_logs)

**描述**：系统操作审计。

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 操作信息
  action VARCHAR(100) NOT NULL, -- 'user.login', 'tool.call', 'miniapp.install'
  actor_id UUID, -- user_id
  actor_type VARCHAR(20), -- 'user', 'system', 'agent'

  -- 目标
  resource_type VARCHAR(50), -- 'conversation', 'task', 'miniapp'
  resource_id UUID,

  -- 详情
  details JSONB DEFAULT '{}',

  -- 上下文
  ip_address INET,
  user_agent TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 索引
  CONSTRAINT valid_action CHECK (char_length(action) >= 3)
);

-- 索引
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- 分区（按月分区以提升查询性能）
-- CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 4. 视图与聚合

### 4.1 用户学习总览视图

```sql
CREATE VIEW user_learning_summary AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT f.id) as total_feedback,
  COUNT(DISTINCT CASE WHEN f.rating >= 4 THEN f.id END) as positive_feedback_count,
  COUNT(DISTINCT lr.id) as active_rules,
  AVG(lr.confidence) as avg_confidence,
  MAX(lr.updated_at) as last_update
FROM auth.users u
LEFT JOIN feedback_records f ON u.id = f.user_id AND f.deleted_at IS NULL
LEFT JOIN learning_records lr ON u.id = lr.user_id AND lr.is_active = true
GROUP BY u.id;
```

### 4.2 对话统计视图

```sql
CREATE VIEW conversation_stats AS
SELECT
  c.id as conversation_id,
  c.user_id,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT t.id) as task_count,
  AVG(CASE WHEN m.sender_type = 'agent'
    THEN (m.agent_metadata->>'tokens')::int END) as avg_tokens_per_message
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN tasks t ON c.id = t.conversation_id
GROUP BY c.id, c.user_id;
```

---

## 5. 触发器与自动化

### 5.1 自动更新时间戳

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到所有需要的表
CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_timestamp
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... 其他表类似
```

### 5.2 自动更新对话统计

```sql
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      stats = jsonb_set(
        stats,
        '{message_count}',
        ((stats->>'message_count')::int + 1)::text::jsonb
      ),
      last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
```

---

## 6. 数据完整性与约束

### 6.1 关键约束总结

1. **用户数据隔离**：所有用户相关表通过RLS强制隔离
2. **软删除**：反馈记录支持软删除（deleted_at）
3. **状态一致性**：任务状态与进度必须一致
4. **引用完整性**：级联删除确保数据一致性
5. **数据验证**：CHECK约束验证枚举值和范围

### 6.2 性能优化策略

1. **索引优化**：
   - 复合索引：(user_id, created_at DESC)
   - 部分索引：WHERE status = 'active'
   - GIN索引：全文搜索、JSONB查询

2. **分区策略**：
   - audit_logs按月分区
   - messages可按年分区（大数据量时）

3. **查询优化**：
   - 使用视图预计算统计
   - 避免N+1查询
   - 合理使用JSONB索引

---

## 7. 数据迁移与版本管理

### 7.1 Supabase迁移文件结构

```
supabase/migrations/
├── 20250124000001_initial_schema.sql
├── 20250124000002_add_rls_policies.sql
├── 20250124000003_create_indexes.sql
├── 20250124000004_create_triggers.sql
└── 20250124000005_create_views.sql
```

### 7.2 版本演进策略

- 使用Supabase CLI管理迁移
- 每次Schema变更创建新迁移文件
- 保持向后兼容性
- 生产环境部署前充分测试

---

## 8. 数据量估算

### 8.1 初期（10k用户，6个月）

| 表 | 估算行数 | 存储估算 |
|-----|---------|---------|
| user_profiles | 10,000 | 2 MB |
| conversations | 50,000 | 10 MB |
| messages | 500,000 | 500 MB |
| attachments | 100,000 | 元数据10MB + 文件5GB |
| tasks | 200,000 | 200 MB |
| feedback_records | 150,000 | 30 MB |
| learning_records | 50,000 | 10 MB |
| mini_apps | 500 | 5 MB |
| **总计** | | **~6 GB** |

### 8.2 扩展期（100k用户，2年）

| 表 | 估算行数 | 存储估算 |
|-----|---------|---------|
| messages | 10,000,000 | 10 GB |
| attachments | 2,000,000 | 元数据200MB + 文件100GB |
| tasks | 5,000,000 | 5 GB |
| audit_logs | 50,000,000 | 50 GB |
| **总计** | | **~165 GB** |

**优化措施**：
- 实施数据归档策略（6个月以上的对话）
- 压缩历史数据
- 使用对象存储（Supabase Storage）管理大文件

---

## 9. 安全考虑

### 9.1 RLS策略覆盖

- ✅ 所有用户相关表启用RLS
- ✅ 确保用户只能访问自己的数据
- ✅ 公共资源（工具、小应用）有明确的可见性控制

### 9.2 数据加密

- ✅ 传输加密：TLS 1.3
- ✅ 静态加密：PostgreSQL透明数据加密
- ✅ 应用层加密：敏感字段（如反馈原因）

### 9.3 审计与合规

- ✅ 完整的审计日志
- ✅ 软删除支持数据恢复
- ✅ GDPR/CCPA合规设计

---

**数据模型版本**: 1.0.0
**最后更新**: 2025-11-24
**下一步**: Phase 1 - 生成API契约（contracts/）
