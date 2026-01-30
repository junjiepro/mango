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
│  Feedback   │─────▶│LearningRec  │ 学习记录 (时序扩展)
└─────────────┘ N:M  └──────┬──────┘
       │                    │
       │ 1:N                │ superseded_by
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│IntentEntity │      │ExtensionSkl │ 扩展Skill (向量)
└─────────────┘      └─────────────┘
  (pgvector)
```

### 1.2 记忆层架构图 (Context Engineering)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Temporal Knowledge Graph                           │
│   └── learning_records (valid_from/valid_until)             │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Entity Memory (pgvector)                           │
│   └── user_intent_entities, extension_skills.embedding      │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Long-term Memory (PostgreSQL)                      │
│   └── learning_records, extension_skills, context_budget    │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Short-term Memory (Session Cache)                  │
│   └── Redis/内存缓存 (不持久化)                               │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Working Memory (Context Window)                    │
│   └── 运行时上下文 (不持久化)                                 │
└─────────────────────────────────────────────────────────────┘
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

  -- ========== v1.3.0 新增: Skill + MCP 架构 ==========
  -- Skill 定义 (Markdown 格式，遵循 Claude Agent Skill 规格)
  skill_content TEXT,

  -- 架构版本标识
  architecture_version VARCHAR(10) DEFAULT 'v1' CHECK (
    architecture_version IN ('v1', 'v2-mcp')
  ),
  -- ===================================================

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
CREATE INDEX idx_mini_apps_architecture ON mini_apps(architecture_version);

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
- `skill_content`：Skill 定义（Markdown 格式，v2-mcp 架构使用）
- `architecture_version`：架构版本（v1=原有架构，v2-mcp=MCP 协议架构）

**架构版本说明**：
- `v1`: 原有架构，使用 code 字段存储 UI 和逻辑
- `v2-mcp`: 新架构，使用 skill_content + code 字段，通过 MCP 协议提供服务

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
  device_id TEXT UNIQUE NOT NULL,  -- 设备唯一标识（基于硬件信息生成）
  device_name TEXT,                -- 用户自定义设备名称
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
  hostname TEXT,                   -- 主机名
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
- `hostname`: 主机名
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

-- 允许匿名用户创建设备记录（CLI 工具调用）
CREATE POLICY "Anyone can create devices"
  ON devices FOR INSERT
  WITH CHECK (true);

-- 允许设备更新自己的 last_seen_at
CREATE POLICY "Devices can update their own last_seen_at"
  ON devices FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

---

## 2.15 设备绑定 (device_bindings) - User Story 3

**描述**：设备与用户之间的绑定关系，支持多对多关系

**表结构**：

```sql
CREATE TABLE device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  binding_name TEXT,               -- 用户自定义绑定名称（如"工作电脑"）
  device_url TEXT NOT NULL,        -- 设备当前 URL（可能是 cloudflare_url 或 localhost_url）
  binding_code TEXT UNIQUE NOT NULL,  -- 正式绑定码（256位随机字符串）
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  config JSONB DEFAULT '{}',       -- 绑定级别的配置数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,          -- 可选的过期时间
  UNIQUE(device_id, user_id, binding_name)
);

CREATE INDEX idx_device_bindings_user ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_device ON device_bindings(device_id);
CREATE INDEX idx_device_bindings_code ON device_bindings(binding_code);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);
```

**字段说明**：
- `binding_name`: 用户自定义绑定名称（如"工作电脑"、"家用Mac"）
- `device_url`: 设备当前 URL（设备会主动更新此字段）
- `binding_code`: 正式绑定码（256位随机字符串，用于设备认证）
- `status`: 绑定状态（active/inactive/expired）
- `config`: 绑定级别的配置数据

**绑定流程**：

```
1. CLI 启动 → 生成临时绑定码（运行时内存中）→ 建立 Realtime Channel → 发送设备 URL
2. 用户访问绑定页面 → 输入临时绑定码 → 订阅 Channel → 获取设备 URL
3. 页面进行 health check → 访问正常 → 显示可绑定状态
4. 用户触发绑定 → 通过设备 URL 发送绑定请求 → 设备生成正式绑定码
5. 设备返回绑定码 → Mango 记录绑定关系 → CLI 关闭 Realtime Channel
6. 后续设备 URL 变更 → 设备调用 Edge Function 更新 device_url
```

**说明**：
- 临时绑定码仅存在于 CLI 运行时内存中，不持久化到数据库
- Realtime Channel 名称为 `binding:${临时绑定码}`
- 临时绑定码在绑定完成后即可丢弃，Channel 自动关闭

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

-- 允许设备通过 binding_code 更新自己的 device_url
CREATE POLICY "Devices can update their own device_url"
  ON device_bindings FOR UPDATE
  USING (true)
  WITH CHECK (true);
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

## 2.16 A2UI 组件 (a2ui_components) - User Story 5

**描述**：Agent 生成的富交互界面组件

**表结构**：

```sql
CREATE TABLE a2ui_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- 组件信息
  component_type VARCHAR(50) NOT NULL CHECK (
    component_type IN ('form', 'input', 'select', 'button', 'chart', 'table', 'card', 'tabs', 'list', 'grid')
  ),

  -- 组件定义（JSON Schema）
  schema JSONB NOT NULL, -- A2UI Schema 定义

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'expired')
  ),

  -- 交互数据
  interaction_data JSONB DEFAULT '{}', -- 用户交互产生的数据

  -- 元数据
  metadata JSONB DEFAULT '{
    "render_count": 0,
    "last_interaction_at": null
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_a2ui_message ON a2ui_components(message_id);
CREATE INDEX idx_a2ui_conversation ON a2ui_components(conversation_id);
CREATE INDEX idx_a2ui_type ON a2ui_components(component_type);
CREATE INDEX idx_a2ui_status ON a2ui_components(status) WHERE status = 'active';
```

**RLS策略**：

```sql
ALTER TABLE a2ui_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view A2UI in own conversations"
  ON a2ui_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update A2UI interaction data"
  ON a2ui_components FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = a2ui_components.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
```

---

## 2.17 资源 (resources) - User Story 5

**描述**：对话中检测到的资源（文件、链接、小应用等）

**表结构**：

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- 资源信息
  resource_type VARCHAR(50) NOT NULL CHECK (
    resource_type IN ('file', 'link', 'miniapp', 'code', 'image', 'video', 'audio')
  ),
  content TEXT NOT NULL, -- 资源内容（URL、文件路径等）

  -- 元数据
  metadata JSONB DEFAULT '{
    "filename": null,
    "domain": null,
    "size": null,
    "mime_type": null
  }',

  -- 位置信息
  position JSONB, -- {start: number, end: number}

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deleted')
  ),

  -- 访问统计
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_conversation ON resources(conversation_id, created_at DESC);
CREATE INDEX idx_resources_message ON resources(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_status ON resources(status) WHERE status = 'active';
```

**RLS策略**：

```sql
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources in own conversations"
  ON resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage resources in own conversations"
  ON resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = resources.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
```

---

## 2.18 工作区状态 (workspace_states) - User Story 5

**描述**：用户的工作区状态和配置

**表结构**：

```sql
CREATE TABLE workspace_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- 工作区配置
  is_open BOOLEAN DEFAULT false,
  active_tab VARCHAR(50) DEFAULT 'resources' CHECK (
    active_tab IN ('resources', 'devices', 'files', 'terminal')
  ),

  -- 布局配置
  layout JSONB DEFAULT '{
    "split_ratio": 0.6,
    "direction": "horizontal",
    "breakpoint": "desktop"
  }',

  -- 标签页状态
  tabs_state JSONB DEFAULT '{
    "resources": {"filters": [], "sort": "created_at"},
    "devices": {"selected_device_id": null},
    "files": {"current_path": "/", "open_files": []},
    "terminal": {"sessions": []}
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  UNIQUE (user_id, conversation_id)
);

CREATE INDEX idx_workspace_user ON workspace_states(user_id);
CREATE INDEX idx_workspace_conversation ON workspace_states(conversation_id) WHERE conversation_id IS NOT NULL;
```

**RLS策略**：

```sql
ALTER TABLE workspace_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace states"
  ON workspace_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 2.19 终端会话 (terminal_sessions) - User Story 5

**描述**：工作区中的终端会话

**表结构**：

```sql
CREATE TABLE terminal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 会话信息
  session_name VARCHAR(100),
  shell_type VARCHAR(50) DEFAULT 'bash', -- bash, zsh, cmd, powershell

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'closed')
  ),

  -- 会话配置
  config JSONB DEFAULT '{
    "cwd": "~",
    "env": {},
    "cols": 80,
    "rows": 24
  }',

  -- 统计
  stats JSONB DEFAULT '{
    "command_count": 0,
    "total_output_bytes": 0,
    "duration_ms": 0
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_terminal_user ON terminal_sessions(user_id, status);
CREATE INDEX idx_terminal_device ON terminal_sessions(device_binding_id);
CREATE INDEX idx_terminal_conversation ON terminal_sessions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_terminal_status ON terminal_sessions(status) WHERE status = 'active';
```

**RLS策略**：

```sql
ALTER TABLE terminal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own terminal sessions"
  ON terminal_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own terminal sessions"
  ON terminal_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 2.20 Git 仓库 (git_repositories) - User Story 5 Git 支持

**描述**：设备上的 Git 仓库信息

**表结构**：

```sql
CREATE TABLE git_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 仓库信息
  path TEXT NOT NULL, -- 仓库在设备上的路径
  name VARCHAR(200) NOT NULL,

  -- Git 配置
  remote_url TEXT, -- 远程仓库 URL
  default_branch VARCHAR(100) DEFAULT 'main',

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'error')
  ),

  -- 统计信息
  stats JSONB DEFAULT '{
    "commit_count": 0,
    "branch_count": 0,
    "last_commit_at": null,
    "last_sync_at": null
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  UNIQUE (device_binding_id, path)
);

CREATE INDEX idx_git_repos_device ON git_repositories(device_binding_id);
CREATE INDEX idx_git_repos_user ON git_repositories(user_id);
CREATE INDEX idx_git_repos_status ON git_repositories(status) WHERE status = 'active';
```

**RLS策略**：

```sql
ALTER TABLE git_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own git repositories"
  ON git_repositories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own git repositories"
  ON git_repositories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 2.21 Skill 执行历史 (skill_executions) - User Story 4 扩展

**描述**：记录 Skill 的执行历史，用于统计和优化

**说明**：
- Edge Function Skills 和设备 Skills 基于文件系统，不需要 skills 表
- 仅 Remote Skills（用户自定义）需要数据库存储
- 所有 Skill 的执行历史统一记录在此表

**表结构**：

```sql
CREATE TABLE skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Skill 信息
  skill_id TEXT NOT NULL,  -- 格式: edge:a2ui, remote:uuid, device:file-ops
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL CHECK (
    skill_category IN ('edge', 'remote', 'device')
  ),

  -- 执行信息
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL,
  result JSONB,

  -- 状态
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- 性能指标
  execution_time_ms INT NOT NULL,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_executions_user ON skill_executions(user_id, created_at DESC);
CREATE INDEX idx_skill_executions_skill ON skill_executions(skill_id, created_at DESC);
CREATE INDEX idx_skill_executions_conversation ON skill_executions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_skill_executions_success ON skill_executions(success);
CREATE INDEX idx_skill_executions_category ON skill_executions(skill_category);
```

**RLS策略**：

```sql
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill executions"
  ON skill_executions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 2.22 MiniApp 改造（更新 mini_apps 表）- User Story 4 扩展

**描述**：将 MiniApp 改造为 Skill + MCP Server 架构

**更新后的表结构**：

```sql
-- mini_apps 表不需要 ui_resource_uri 字段
-- 所有 MiniApp 统一使用 ui://mango/main 作为 UI Resource URI
-- MiniApp ID 通过 HTTP 路径传递

-- 无需额外的 ALTER TABLE 语句
-- 原有的 mini_apps 表结构已经满足需求
```

**字段说明**：
- MiniApp 的 `code` 字段存储完整的 MCP Server 代码
- 所有 MiniApp 统一实现 `ui://mango/main` UI Resource
- 不需要在数据库中存储 UI Resource URI

---

## 2.23 扩展 Skills (extension_skills) - User Story 4 扩展

**描述**：基于用户反馈自动生成的扩展 Skill（Good vs Bad 实践）

**表结构**：

```sql
CREATE TABLE extension_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Skill 类型
  skill_type TEXT NOT NULL CHECK (
    skill_type IN ('good_practice', 'bad_practice')
  ),

  -- 行为模式
  user_intent TEXT NOT NULL,
  tools_used TEXT[] NOT NULL,

  -- 置信度
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- 示例案例
  examples JSONB NOT NULL DEFAULT '[]', -- [{action, outcome, rating}]

  -- 样本大小
  sample_size INT NOT NULL DEFAULT 0,

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_sample_size CHECK (sample_size >= 0)
);

CREATE INDEX idx_extension_skills_user ON extension_skills(user_id, is_active);
CREATE INDEX idx_extension_skills_type ON extension_skills(skill_type);
CREATE INDEX idx_extension_skills_intent ON extension_skills(user_intent);
CREATE INDEX idx_extension_skills_confidence ON extension_skills(confidence DESC);
```

**RLS策略**：

```sql
ALTER TABLE extension_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own extension skills"
  ON extension_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 架构说明：Skill 存储策略

**重要变更**（基于 User Story 4 额外说明）：

1. **Edge Function Skills**: 基于文件系统（`supabase/functions/skills/*.md`），不需要数据库表
2. **设备 Skills**: 基于文件系统（`~/.mango/skills/*.md`），不需要数据库表
3. **Remote Skills**: 仅 MiniApp 和扩展 Skill 需要数据库存储

**理由**：
- Edge Function Skills 是系统内置能力，随代码部署
- 设备 Skills 存储在设备本地，通过配置文件管理
- 只有用户创建的动态内容需要数据库持久化

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

## 10. Context Engineering 优化 (User Story 4 增强)

基于 Context Engineering 最佳实践，为 Agent 持续学习系统添加分层记忆架构支持。

### 10.1 实体关系图（记忆层扩展）

```
┌─────────────────────────────────────────────────────────────────┐
│                    五层记忆架构                                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Working Memory (Context Window)                        │
│   └── 运行时上下文，不持久化                                      │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Short-term Memory (Session Cache)                      │
│   └── Redis/内存缓存，会话级别                                    │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Long-term Memory (PostgreSQL)                          │
│   └── learning_records, extension_skills                        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Entity Memory (pgvector)                               │
│   └── user_intent_entities (语义相似度检索)                      │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Temporal Knowledge Graph                               │
│   └── learning_records + valid_from/valid_until                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 用户意图实体 (user_intent_entities) - Layer 4

**描述**：存储用户意图的向量嵌入，支持语义相似度检索，用于扩展 Skill 生成时的意图聚类。

**前置条件**：
```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
```

**表结构**：

```sql
CREATE TABLE user_intent_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 意图信息
  intent_text TEXT NOT NULL,           -- 原始意图文本
  intent_embedding vector(1536),       -- OpenAI text-embedding-3-small 维度
  intent_category VARCHAR(100),        -- 意图分类（可选）

  -- 关联信息
  source_feedback_id UUID REFERENCES feedback_records(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- 聚类信息
  cluster_id UUID,                     -- 所属聚类（用于扩展 Skill 生成）
  cluster_confidence FLOAT CHECK (cluster_confidence >= 0 AND cluster_confidence <= 1),

  -- 元数据
  metadata JSONB DEFAULT '{
    "tools_used": [],
    "outcome": null,
    "rating": null
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_intent_text CHECK (char_length(intent_text) >= 3)
);

-- 向量相似度索引（IVFFlat，适合中等规模数据）
CREATE INDEX idx_intent_embedding ON user_intent_entities
  USING ivfflat (intent_embedding vector_cosine_ops)
  WITH (lists = 100);

-- 常规索引
CREATE INDEX idx_intent_user ON user_intent_entities(user_id, created_at DESC);
CREATE INDEX idx_intent_cluster ON user_intent_entities(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_intent_category ON user_intent_entities(intent_category) WHERE intent_category IS NOT NULL;
```

**RLS策略**：

```sql
ALTER TABLE user_intent_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own intent entities"
  ON user_intent_entities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**语义检索示例**：

```sql
-- 查找与给定意图最相似的 Top 10 意图
SELECT
  id,
  intent_text,
  intent_category,
  1 - (intent_embedding <=> $1::vector) as similarity
FROM user_intent_entities
WHERE user_id = $2
ORDER BY intent_embedding <=> $1::vector
LIMIT 10;
```

---

### 10.3 学习记录时序扩展 (learning_records 增强) - Layer 5

**描述**：为 learning_records 表添加时序有效性字段，支持时间旅行查询和防止上下文冲突。

**ALTER TABLE 语句**：

```sql
-- 添加时序有效性字段
ALTER TABLE learning_records
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES learning_records(id);

-- 添加时序索引
CREATE INDEX idx_learning_temporal ON learning_records(user_id, valid_from, valid_until)
  WHERE is_active = true;

-- 添加 GiST 索引支持时间范围查询
CREATE INDEX idx_learning_temporal_range ON learning_records
  USING gist (tstzrange(valid_from, valid_until, '[)'));
```

**时序查询示例**：

```sql
-- 查询某时间点有效的学习规则
SELECT * FROM learning_records
WHERE user_id = $1
  AND is_active = true
  AND valid_from <= $2
  AND (valid_until IS NULL OR valid_until > $2);

-- 查询规则的历史版本
SELECT * FROM learning_records
WHERE user_id = $1
  AND record_type = $2
  AND rule_content->>'condition' = $3
ORDER BY valid_from DESC;
```

---

### 10.4 记忆整合任务 (memory_consolidation_jobs)

**描述**：记录记忆整合任务的执行状态，用于定期清理过期记忆和合并相似规则。

**表结构**：

```sql
CREATE TABLE memory_consolidation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 任务类型
  job_type VARCHAR(50) NOT NULL CHECK (
    job_type IN ('cleanup', 'merge', 'archive', 'reindex')
  ),

  -- 执行状态
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  ),

  -- 执行结果
  result JSONB DEFAULT '{
    "records_processed": 0,
    "records_merged": 0,
    "records_archived": 0,
    "errors": []
  }',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 调度信息
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT DEFAULT 0
);

CREATE INDEX idx_consolidation_user ON memory_consolidation_jobs(user_id, created_at DESC);
CREATE INDEX idx_consolidation_status ON memory_consolidation_jobs(status, scheduled_for)
  WHERE status IN ('pending', 'running');
```

**RLS策略**：

```sql
ALTER TABLE memory_consolidation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consolidation jobs"
  ON memory_consolidation_jobs FOR SELECT
  USING (auth.uid() = user_id);
```

---

### 10.5 上下文预算配置 (context_budget_configs)

**描述**：存储用户级别的上下文预算配置，用于优化 Token 使用。

**表结构**：

```sql
CREATE TABLE context_budget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 预算配置
  config JSONB NOT NULL DEFAULT '{
    "total_budget": 8000,
    "allocation": {
      "system_prompt": 1000,
      "tool_definitions": 500,
      "learning_rules": 2000,
      "message_history": 3500,
      "reserved_buffer": 1000
    },
    "compaction_threshold": 0.8,
    "rule_priority_weights": {
      "confidence": 0.4,
      "recency": 0.3,
      "success_rate": 0.3
    }
  }',

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  UNIQUE (user_id)
);

CREATE INDEX idx_context_budget_user ON context_budget_configs(user_id) WHERE is_active = true;
```

**RLS策略**：

```sql
ALTER TABLE context_budget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own context budget config"
  ON context_budget_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 10.6 扩展 Skills 向量索引 (extension_skills 增强)

**描述**：为 extension_skills 表添加向量嵌入支持，实现语义聚类。

**ALTER TABLE 语句**：

```sql
-- 添加向量嵌入字段
ALTER TABLE extension_skills
  ADD COLUMN IF NOT EXISTS intent_embedding vector(1536);

-- 添加向量相似度索引
CREATE INDEX idx_extension_skills_embedding ON extension_skills
  USING ivfflat (intent_embedding vector_cosine_ops)
  WITH (lists = 50)
  WHERE intent_embedding IS NOT NULL;
```

**语义聚类查询示例**：

```sql
-- 查找与当前意图相似的扩展 Skill
SELECT
  id,
  skill_type,
  user_intent,
  confidence,
  1 - (intent_embedding <=> $1::vector) as similarity
FROM extension_skills
WHERE user_id = $2
  AND is_active = true
  AND intent_embedding IS NOT NULL
ORDER BY intent_embedding <=> $1::vector
LIMIT 5;
```

---

### 10.7 性能基准与监控视图

**描述**：创建视图用于监控记忆系统性能。

```sql
-- 用户记忆系统健康度视图
CREATE VIEW user_memory_health AS
SELECT
  u.id as user_id,
  -- 学习规则统计
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.is_active = true) as active_rules,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.valid_until IS NOT NULL) as superseded_rules,
  AVG(lr.confidence) FILTER (WHERE lr.is_active = true) as avg_confidence,
  -- 意图实体统计
  COUNT(DISTINCT uie.id) as total_intents,
  COUNT(DISTINCT uie.cluster_id) as intent_clusters,
  -- 扩展 Skill 统计
  COUNT(DISTINCT es.id) FILTER (WHERE es.is_active = true) as active_extension_skills,
  -- 最近活动
  MAX(lr.updated_at) as last_rule_update,
  MAX(uie.created_at) as last_intent_capture
FROM auth.users u
LEFT JOIN learning_records lr ON u.id = lr.user_id
LEFT JOIN user_intent_entities uie ON u.id = uie.user_id
LEFT JOIN extension_skills es ON u.id = es.user_id
GROUP BY u.id;

-- 记忆整合效率视图
CREATE VIEW memory_consolidation_stats AS
SELECT
  user_id,
  job_type,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  SUM((result->>'records_processed')::int) as total_records_processed,
  SUM((result->>'records_merged')::int) as total_records_merged
FROM memory_consolidation_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, job_type;
```

---

### 10.8 数据迁移脚本

**迁移文件**: `20250126000001_context_engineering_optimization.sql`

```sql
-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建 user_intent_entities 表
-- (完整 DDL 见 10.2)

-- 3. 扩展 learning_records 表
ALTER TABLE learning_records
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES learning_records(id);

-- 4. 扩展 extension_skills 表
ALTER TABLE extension_skills
  ADD COLUMN IF NOT EXISTS intent_embedding vector(1536);

-- 5. 创建 memory_consolidation_jobs 表
-- (完整 DDL 见 10.4)

-- 6. 创建 context_budget_configs 表
-- (完整 DDL 见 10.5)

-- 7. 创建索引
-- (见各节索引定义)

-- 8. 创建视图
-- (见 10.7)

-- 9. 回填现有数据的 valid_from
UPDATE learning_records
SET valid_from = created_at
WHERE valid_from IS NULL;
```

---

## 11. Skill 架构优化 (v2)

> ⚠️ **DEPRECATED**: 此架构已被 §12 Skill 统一注册架构 (v3) 取代。
> v3 架构针对 Supabase Edge Function 无状态环境进行了优化，采用数据库缓存替代内存缓存。
> 新项目请直接使用 §12 架构，现有项目请参考 §12.5 迁移脚本。

基于 skill-creator 最佳实践，优化三层 Skill 架构，支持语义匹配、版本管理和 Skill 组合。

### 11.1 统一 Skills 表（优化版）

> ⚠️ **DEPRECATED**: 请使用 §12.1 `skill_registry` 表替代。

**描述**：整合 User Skills、MiniApp Skills、Extension Skills 到统一表结构，支持版本管理和语义搜索。

**表结构**：

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL CHECK (
    skill_type IN ('user', 'miniapp', 'extension')
  ),

  -- 所有者
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  miniapp_id UUID REFERENCES mini_apps(id) ON DELETE CASCADE,

  -- 版本管理
  version TEXT NOT NULL DEFAULT '1.0.0',

  -- Skill 内容（Markdown 格式）
  skill_content TEXT NOT NULL,

  -- 语义向量（用于智能匹配）
  description_embedding vector(1536),

  -- 触发条件
  trigger_conditions JSONB DEFAULT '{
    "keywords": [],
    "intentPatterns": [],
    "contextRequirements": {}
  }',

  -- 依赖声明
  dependencies JSONB DEFAULT '{
    "required": [],
    "optional": [],
    "conflicts": []
  }',

  -- 元数据
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags TEXT[] DEFAULT '{}',

  -- 使用统计
  usage_stats JSONB DEFAULT '{
    "callCount": 0,
    "successCount": 0,
    "avgExecutionTimeMs": 0,
    "lastUsedAt": null
  }',

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_skill_owner CHECK (
    (skill_type = 'user' AND user_id IS NOT NULL) OR
    (skill_type = 'miniapp' AND miniapp_id IS NOT NULL) OR
    (skill_type = 'extension' AND user_id IS NOT NULL)
  )
);

-- 语义搜索索引
CREATE INDEX idx_skills_embedding ON skills
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE description_embedding IS NOT NULL;

-- 常规索引
CREATE INDEX idx_skills_user ON skills(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_skills_miniapp ON skills(miniapp_id) WHERE miniapp_id IS NOT NULL;
CREATE INDEX idx_skills_type ON skills(skill_type);
CREATE INDEX idx_skills_active ON skills(is_active) WHERE is_active = true;
CREATE INDEX idx_skills_tags ON skills USING gin(tags);
CREATE INDEX idx_skills_priority ON skills(priority DESC) WHERE is_active = true;
```

**RLS策略**：

```sql
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON skills FOR SELECT
  USING (
    auth.uid() = user_id OR
    miniapp_id IN (
      SELECT id FROM mini_apps WHERE is_public = true OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own skills"
  ON skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 11.2 Skill 版本历史表

**描述**：记录 Skill 的版本变更历史，支持回滚。

**表结构**：

```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  -- 版本信息
  version TEXT NOT NULL,
  skill_content TEXT NOT NULL,
  change_summary TEXT,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 约束
  UNIQUE (skill_id, version)
);

CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id, created_at DESC);
```

**RLS策略**：

```sql
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill versions"
  ON skill_versions FOR SELECT
  USING (
    skill_id IN (SELECT id FROM skills WHERE user_id = auth.uid())
  );
```

---

### 11.3 Skill 执行日志表

**描述**：记录 Skill 执行历史，用于统计和优化。

**表结构**：

```sql
CREATE TABLE skill_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_category TEXT NOT NULL CHECK (
    skill_category IN ('edge', 'remote', 'device')
  ),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 执行信息
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN ('semantic', 'rule', 'manual', 'preload')
  ),
  match_score FLOAT CHECK (match_score >= 0 AND match_score <= 1),
  match_reason TEXT,

  -- 结果
  success BOOLEAN NOT NULL,
  execution_time_ms INT NOT NULL,
  error_message TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_logs_skill ON skill_execution_logs(skill_id, created_at DESC);
CREATE INDEX idx_skill_logs_user ON skill_execution_logs(user_id, created_at DESC);
CREATE INDEX idx_skill_logs_category ON skill_execution_logs(skill_category);
CREATE INDEX idx_skill_logs_success ON skill_execution_logs(success);
```

**RLS策略**：

```sql
ALTER TABLE skill_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill logs"
  ON skill_execution_logs FOR SELECT
  USING (auth.uid() = user_id);
```

---

### 11.4 Skill 语义匹配查询

**描述**：基于 pgvector 的语义匹配查询示例。

```sql
-- 根据用户意图语义匹配 Skill
SELECT
  id,
  name,
  description,
  skill_type,
  priority,
  1 - (description_embedding <=> $1::vector) as similarity
FROM skills
WHERE user_id = $2
  AND is_active = true
  AND description_embedding IS NOT NULL
ORDER BY
  priority DESC,
  description_embedding <=> $1::vector
LIMIT 5;

-- 查找依赖某 Skill 的其他 Skill
SELECT * FROM skills
WHERE is_active = true
  AND (
    dependencies->'required' ? $1 OR
    dependencies->'optional' ? $1
  );

-- 查找与某 Skill 冲突的 Skill
SELECT * FROM skills
WHERE is_active = true
  AND dependencies->'conflicts' ? $1;
```

---

### 11.5 Skill 统计视图

**描述**：Skill 使用统计和健康度监控。

```sql
-- Skill 使用统计视图
CREATE VIEW skill_usage_stats AS
SELECT
  s.id,
  s.name,
  s.skill_type,
  s.priority,
  (s.usage_stats->>'callCount')::int as call_count,
  (s.usage_stats->>'successCount')::int as success_count,
  CASE
    WHEN (s.usage_stats->>'callCount')::int > 0
    THEN (s.usage_stats->>'successCount')::float / (s.usage_stats->>'callCount')::float
    ELSE 0
  END as success_rate,
  (s.usage_stats->>'avgExecutionTimeMs')::int as avg_execution_time_ms,
  (s.usage_stats->>'lastUsedAt')::timestamptz as last_used_at,
  s.created_at,
  s.updated_at
FROM skills s
WHERE s.is_active = true;

-- Skill 执行趋势视图（最近 30 天）
CREATE VIEW skill_execution_trends AS
SELECT
  skill_id,
  skill_category,
  DATE(created_at) as execution_date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE success = true) as successful_executions,
  AVG(execution_time_ms) as avg_execution_time_ms
FROM skill_execution_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY skill_id, skill_category, DATE(created_at)
ORDER BY execution_date DESC;
```

---

### 11.6 数据迁移脚本

**迁移文件**: `20250126000002_skill_architecture_v2.sql`

```sql
-- 1. 创建 skills 表
-- (完整 DDL 见 11.1)

-- 2. 创建 skill_versions 表
-- (完整 DDL 见 11.2)

-- 3. 创建 skill_execution_logs 表
-- (完整 DDL 见 11.3)

-- 4. 迁移 extension_skills 数据到 skills 表
INSERT INTO skills (
  user_id,
  name,
  description,
  skill_type,
  skill_content,
  trigger_conditions,
  priority,
  tags,
  is_active,
  created_at,
  updated_at
)
SELECT
  user_id,
  CASE skill_type
    WHEN 'good_practice' THEN '推荐做法: ' || user_intent
    WHEN 'bad_practice' THEN '避免做法: ' || user_intent
  END as name,
  user_intent as description,
  'extension' as skill_type,
  -- 生成 Markdown 内容
  '# ' || user_intent || E'\n\n' ||
  '## When to Use\n\n' ||
  CASE skill_type
    WHEN 'good_practice' THEN '推荐在以下场景使用此做法。'
    WHEN 'bad_practice' THEN '避免在以下场景使用此做法。'
  END as skill_content,
  jsonb_build_object(
    'keywords', '[]'::jsonb,
    'intentPatterns', jsonb_build_array(user_intent),
    'contextRequirements', '{}'::jsonb
  ) as trigger_conditions,
  CASE skill_type
    WHEN 'good_practice' THEN 7
    WHEN 'bad_practice' THEN 9
  END as priority,
  ARRAY['extension', skill_type] as tags,
  is_active,
  created_at,
  updated_at
FROM extension_skills;

-- 5. 创建视图
-- (见 11.5)

-- 6. 添加 RLS 策略
-- (见各节 RLS 定义)
```

---

## 12. Skill 统一注册架构 (v3)

基于 Supabase Edge Function 环境限制，设计统一的 Skill 注册与缓存架构。

**与 v2 的主要区别**：

| 方面 | v2 架构 (§11) | v3 架构 (§12) |
|------|---------------|---------------|
| 缓存策略 | 内存缓存 | 数据库缓存 (skill_content_cache) |
| Manifest | 运行时扫描 | 构建时生成 (skill-manifest.json) |
| 设备同步 | 无 | device_skill_sync 表支持离线降级 |
| 主表 | skills | skill_registry |

**迁移路径**: v2 `skills` 表 → v3 `skill_registry` 表（见 §12.5）

### 12.1 Skill 注册表 (skill_registry)

**描述**：统一存储所有三层 Skill 的元数据，作为单一数据源。

**表结构**：

```sql
CREATE TABLE skill_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 标识（格式: edge:a2ui, remote:uuid, device:file-ops）
  skill_id TEXT NOT NULL UNIQUE,

  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',

  -- 分类
  category TEXT NOT NULL CHECK (category IN ('edge', 'remote', 'device')),
  skill_type TEXT CHECK (skill_type IN ('system', 'user', 'miniapp', 'extension')),

  -- 内容位置引用
  content_ref JSONB NOT NULL,
  -- edge:   {"path": "skills/a2ui-skill.md"}
  -- remote: {"table": "skills", "id": "uuid"}
  -- device: {"device_id": "uuid", "path": "file-ops-skill.md"}

  -- 触发条件
  trigger_keywords TEXT[] DEFAULT '{}',
  trigger_patterns TEXT[] DEFAULT '{}',

  -- 依赖声明
  dependencies TEXT[] DEFAULT '{}',
  conflicts TEXT[] DEFAULT '{}',

  -- 优先级和标签
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags TEXT[] DEFAULT '{}',

  -- 语义向量
  embedding vector(1536),

  -- 内容哈希（用于缓存失效）
  content_hash TEXT,

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**索引**：

```sql
CREATE INDEX idx_registry_category ON skill_registry(category);
CREATE INDEX idx_registry_active ON skill_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_registry_keywords ON skill_registry USING gin(trigger_keywords);
CREATE INDEX idx_registry_tags ON skill_registry USING gin(tags);
CREATE INDEX idx_registry_embedding ON skill_registry
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  WHERE embedding IS NOT NULL;
```

**RLS策略**：

```sql
ALTER TABLE skill_registry ENABLE ROW LEVEL SECURITY;

-- 所有用户可查看活跃的 Skill 元数据
CREATE POLICY "Anyone can view active skills"
  ON skill_registry FOR SELECT
  USING (is_active = true);
```

---

### 12.2 Skill 内容缓存表 (skill_content_cache)

**描述**：缓存 Skill 内容，减少重复加载，适配 Edge Function 无状态特性。

**表结构**：

```sql
CREATE TABLE skill_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL REFERENCES skill_registry(skill_id) ON DELETE CASCADE,

  -- 缓存内容
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- 缓存元数据
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  hit_count INT DEFAULT 0,

  UNIQUE(skill_id)
);
```

**索引**：

```sql
CREATE INDEX idx_cache_skill ON skill_content_cache(skill_id);
CREATE INDEX idx_cache_expires ON skill_content_cache(expires_at);
```

**RLS策略**：

```sql
ALTER TABLE skill_content_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
  ON skill_content_cache FOR SELECT
  USING (true);

-- 仅系统可写入缓存（通过 service_role）
CREATE POLICY "System can manage cache"
  ON skill_content_cache FOR ALL
  USING (auth.role() = 'service_role');
```

---

### 12.3 设备 Skill 同步表 (device_skill_sync)

**描述**：记录设备 Skill 的同步状态，支持离线降级。

**表结构**：

```sql
CREATE TABLE device_skill_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_binding_id UUID NOT NULL REFERENCES device_bindings(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,

  -- 同步状态
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  content_hash TEXT,

  -- 离线缓存内容
  cached_content TEXT,

  UNIQUE(device_binding_id, skill_id)
);

CREATE INDEX idx_device_sync_binding ON device_skill_sync(device_binding_id);
CREATE INDEX idx_device_sync_skill ON device_skill_sync(skill_id);
```

---

### 12.4 Skill 版本历史表 (skill_versions)

**描述**：记录 Skill 的版本变更历史，支持版本回滚。

**表结构**：

```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL REFERENCES skill_registry(skill_id) ON DELETE CASCADE,

  -- 版本信息
  version TEXT NOT NULL,
  content_snapshot TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- 变更说明
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(skill_id, version)
);

CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id, created_at DESC);
```

---

### 12.5 Skill 执行日志表 (skill_execution_logs)

**描述**：记录 Skill 执行统计，用于分析和优化。

**表结构**：

```sql
CREATE TABLE skill_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),

  -- 执行信息
  execution_time_ms INT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- 上下文
  conversation_id UUID,
  task_id UUID,

  -- 时间戳
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exec_logs_skill ON skill_execution_logs(skill_id, executed_at DESC);
CREATE INDEX idx_exec_logs_user ON skill_execution_logs(user_id, executed_at DESC);
```

---

### 12.6 统一查询示例

```sql
-- 列出所有可用 Skill（元数据）
SELECT skill_id, name, description, category, priority
FROM skill_registry
WHERE is_active = true
ORDER BY priority DESC;

-- 按关键词搜索 Skill
SELECT * FROM skill_registry
WHERE is_active = true
  AND trigger_keywords && ARRAY['表单', '图表'];

-- 语义搜索 Skill
SELECT
  skill_id, name, description,
  1 - (embedding <=> $1::vector) as similarity
FROM skill_registry
WHERE is_active = true
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- 获取缓存内容（带命中计数更新）
UPDATE skill_content_cache
SET hit_count = hit_count + 1
WHERE skill_id = $1
  AND expires_at > NOW()
RETURNING content;

-- 清理过期缓存
DELETE FROM skill_content_cache
WHERE expires_at < NOW();
```

---

### 12.5 数据迁移脚本

```sql
-- 从 v2 skills 表迁移到 v3 skill_registry
INSERT INTO skill_registry (
  skill_id, name, description, version, category, skill_type,
  content_ref, trigger_keywords, priority, tags, embedding,
  is_active, created_at, updated_at
)
SELECT
  CASE
    WHEN source = 'edge' THEN 'edge:' || skill_name
    WHEN source = 'remote' THEN 'remote:' || id::text
    ELSE 'device:' || skill_name
  END as skill_id,
  skill_name as name,
  description,
  version,
  source as category,
  skill_type,
  CASE
    WHEN source = 'edge' THEN jsonb_build_object('path', 'skills/' || skill_name || '-skill.md')
    WHEN source = 'remote' THEN jsonb_build_object('table', 'skills', 'id', id::text)
    ELSE jsonb_build_object('device_id', device_id, 'path', skill_name || '-skill.md')
  END as content_ref,
  trigger_keywords,
  priority,
  tags,
  embedding,
  is_active,
  created_at,
  updated_at
FROM skills
ON CONFLICT (skill_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
```

---

**数据模型版本**: 1.3.0
**最后更新**: 2026-01-27
**变更说明**:
- v1.3.0: 添加 Skill 统一注册架构 v3（skill_registry、skill_content_cache、device_skill_sync）
- v1.2.0: 添加 Skill 架构优化 v2（统一 Skills 表、版本管理、语义匹配、执行日志）
**下一步**: Phase 1 - 生成API契约（contracts/）
