# Quick Start Guide: Mango开发入门

**Feature**: 001-agent-chat-platform
**Date**: 2025-11-24
**目标读者**: 新加入项目的开发者

---

## 1. 项目概览

Mango是一个智能Agent对话平台，核心功能包括：
- 🤖 多模态对话系统（文本、图片、文件）
- ⚙️ 后台任务执行
- 🧩 小应用生态
- 🔌 协议支持（MCP、ACP、A2A）
- 📚 持续学习与个性化

**技术栈**：
- Frontend: Next.js 14 + React 18 + TailwindCSS
- Backend: Next.js API Routes + Supabase Edge Functions
- Database: Supabase (PostgreSQL 15+)
- Realtime: Supabase Realtime
- Auth: Supabase Auth
- Storage: Supabase Storage

---

## 2. 环境准备

### 2.1 前置要求

```bash
# 必需
Node.js >= 20.0.0
pnpm >= 9.0.0 (推荐) 或 npm >= 10.0.0

# 可选（开发体验提升）
Git
VS Code + 推荐扩展
Docker (用于本地Supabase)
```

### 2.2 安装依赖

```bash
# 1. Clone 仓库
git clone https://github.com/your-org/mango.git
cd mango

# 2. 安装依赖
pnpm install

# 3. 设置环境变量
cp .env.example .env.local

# 编辑 .env.local 填入 Supabase 凭证
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.3 本地Supabase设置

```bash
# 安装 Supabase CLI
npm install -g supabase

# 初始化本地Supabase（如果使用本地开发）
supabase start

# 运行数据库迁移
supabase db push

# 或使用远程Supabase
# 在 https://supabase.com 创建项目
# 复制 API URL 和 anon key 到 .env.local
```

---

## 3. 项目结构

```
mango/
├── apps/
│   ├── web/                    # Next.js Web应用
│   │   ├── src/
│   │   │   ├── app/           # App Router页面
│   │   │   ├── components/    # React组件
│   │   │   ├── hooks/         # 自定义Hooks
│   │   │   ├── lib/           # 工具函数
│   │   │   ├── services/      # 业务服务层
│   │   │   └── types/         # TypeScript类型
│   │   ├── public/
│   │   └── tests/
│   │
│   └── cli/                    # CLI工具
│       └── src/
│
├── packages/
│   ├── shared/                 # 共享类型和工具
│   ├── protocols/              # MCP/ACP/A2A适配器
│   │   ├── mcp/
│   │   ├── acp/
│   │   └── a2a/
│   └── miniapp-runtime/        # 小应用运行时
│
├── supabase/
│   ├── migrations/            # 数据库迁移
│   ├── functions/             # Edge Functions
│   └── seed.sql              # 测试数据
│
├── specs/                     # 设计文档
│   └── 001-agent-chat-platform/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── contracts/
│       └── quickstart.md (本文档)
│
├── pnpm-workspace.yaml
├── turbo.json                # Turborepo配置
└── package.json
```

---

## 4. 快速开始

### 4.1 启动开发服务器

```bash
# 启动 Web 应用
cd apps/web
pnpm dev

# 或使用 turbo 同时启动多个应用
pnpm turbo dev
```

访问 http://localhost:3000

### 4.2 核心开发流程

#### Step 1: 创建新功能

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 如需数据库变更，创建迁移
supabase migration new your_migration_name

# 3. 编辑迁移文件
# supabase/migrations/YYYYMMDDHHMMSS_your_migration_name.sql

# 4. 应用迁移
supabase db push
```

#### Step 2: 开发组件

```typescript
// apps/web/src/components/YourComponent.tsx
'use client'

import { useState } from 'react'

export function YourComponent() {
  const [state, setState] = useState()

  return <div>Your Component</div>
}
```

#### Step 3: 创建API Route

```typescript
// apps/web/src/app/api/your-endpoint/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('your_table')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

#### Step 4: 测试

```bash
# 运行测试
pnpm test

# 运行特定测试
pnpm test -- YourComponent

# E2E测试
pnpm test:e2e
```

---

## 5. 关键概念

### 5.1 对话与消息

```typescript
// 创建对话
const { data: conversation } = await supabase
  .from('conversations')
  .insert({ title: '新对话', user_id: userId })
  .select()
  .single()

// 发送消息
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_type: 'user',
    sender_id: userId,
    content: '用户消息',
    sequence_number: nextSeq
  })
  .select()
  .single()
```

### 5.2 实时订阅

```typescript
// 订阅对话消息
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new)
      // 更新UI
    }
  )
  .subscribe()

// 清理订阅
return () => {
  supabase.removeChannel(channel)
}
```

### 5.3 任务执行

```typescript
// 创建任务
const { data: task } = await supabase
  .from('tasks')
  .insert({
    user_id: userId,
    conversation_id: conversationId,
    title: '任务标题',
    task_type: 'analysis',
    status: 'pending'
  })
  .select()
  .single()

// 更新任务进度
await supabase
  .from('tasks')
  .update({ progress: 50, status: 'running' })
  .eq('id', taskId)
```

---

## 6. 常见开发任务

### 6.1 添加新的数据库表

```bash
# 1. 创建迁移
supabase migration new add_your_table

# 2. 编辑迁移文件
```

```sql
-- supabase/migrations/xxx_add_your_table.sql
CREATE TABLE your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- 其他字段...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS策略
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);
```

```bash
# 3. 应用迁移
supabase db push

# 4. 生成TypeScript类型
pnpm run generate-types
```

### 6.2 添加新的API端点

```typescript
// apps/web/src/app/api/your-endpoint/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // 验证用户
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 处理请求
  const body = await request.json()

  // 业务逻辑...

  return NextResponse.json({ success: true })
}
```

### 6.3 创建自定义Hook

```typescript
// apps/web/src/hooks/useConversation.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useConversation(conversationId: string) {
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // 加载对话
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => {
        setConversation(data)
        setLoading(false)
      })

    // 订阅更新
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        setConversation(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return { conversation, loading }
}
```

---

## 7. 调试技巧

### 7.1 查看Supabase日志

```bash
# 本地Supabase日志
supabase logs

# 远程Supabase
# 访问 Supabase Dashboard > Logs
```

### 7.2 调试Realtime连接

```typescript
// 启用详细日志
const supabase = createClient({
  realtime: {
    params: {
      eventsPerSecond: 10,
      log_level: 'debug'
    }
  }
})
```

### 7.3 测试RLS策略

```sql
-- 在 Supabase SQL Editor 中测试
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid"}';

SELECT * FROM conversations WHERE user_id = 'user-uuid';
```

---

## 8. 部署

### 8.1 Vercel部署（推荐）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 部署
cd apps/web
vercel

# 3. 设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 8.2 生产环境检查清单

- [ ] 环境变量已设置
- [ ] 数据库迁移已应用
- [ ] RLS策略已启用
- [ ] CORS配置正确
- [ ] 性能监控已配置
- [ ] 错误追踪已设置（如Sentry）
- [ ] CI/CD流水线已配置

---

## 9. 故障排除

### 问题1: "Invalid JWT" 错误

**解决方案**：
```bash
# 检查环境变量
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 确保使用正确的 anon key（不是 service_role key）
```

### 问题2: RLS策略阻止查询

**解决方案**：
```sql
-- 检查策略
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- 暂时禁用RLS测试（仅开发环境）
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

### 问题3: Realtime订阅不触发

**解决方案**：
```typescript
// 1. 确保表启用了 Realtime
// 在 Supabase Dashboard > Database > Replication

// 2. 检查过滤条件
const channel = supabase
  .channel('test')
  .on('postgres_changes', {
    event: '*', // 先监听所有事件
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    console.log('Event:', payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

---

## 10. 学习资源

### 官方文档
- [Next.js文档](https://nextjs.org/docs)
- [Supabase文档](https://supabase.com/docs)
- [React文档](https://react.dev)
- [TailwindCSS文档](https://tailwindcss.com/docs)

### 项目文档
- [功能规格](./spec.md)
- [实现计划](./plan.md)
- [技术研究](./research.md)
- [数据模型](./data-model.md)
- [API契约](./contracts/api.openapi.yaml)
- [事件Schema](./contracts/events.schema.json)

### 代码规范
- 遵循[宪法文件](../../.specify/memory/constitution.md)中的原则
- 使用ESLint + Prettier格式化代码
- 提交前运行 `pnpm lint` 和 `pnpm test`
- Commit遵循Conventional Commits规范

---

## 11. CLI 工具快速开始 (User Story 3)

### 11.1 安装 Mango CLI

```bash
# 方式 1: 使用 npx（推荐）
npx @mango/cli start

# 方式 2: 全局安装
npm install -g @mango/cli
mango start

# 方式 3: 下载独立可执行文件
# 访问 GitHub Releases 下载适合您系统的版本
```

### 11.2 前置要求

```bash
# 安装 Cloudflare Tunnel
# macOS
brew install cloudflare/cloudflare/cloudflared

# Windows
choco install cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 验证安装
cloudflared --version
```

### 11.3 启动设备服务

```bash
# 基本启动
mango start

# 指定端口
mango start --port 8080

# 不自动打开浏览器
mango start --ignore-open-bind-url

# 使用环境变量
export MANGO_APP_URL=https://app.mango.ai
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
mango start
```

**首次运行输出示例**：

```
🥭 Mango Device Service

✓ Configuration loaded
✓ Server running on port 3000
✓ Cloudflare Tunnel created
  - Cloudflare URL: https://random-id.trycloudflare.com
  - Localhost URL: http://localhost:3000
  - Hostname URL: http://your-hostname.local:3000

✓ Temporary binding code generated: a1b2c3d4

✓ Realtime Channel established: binding:a1b2c3d4
✓ Device URLs published to channel

✓ Device service is ready!

Bind URL:
  https://app.mango.ai/devices/bind?code=a1b2c3d4

Press Ctrl+C to stop the service
```

### 11.4 绑定设备

**新的绑定流程**（使用临时绑定码 + Realtime Channel）：

1. **CLI 启动后会自动打开浏览器**
   - 浏览器会打开绑定页面，URL 中包含临时绑定码（如 `?code=a1b2c3d4`）
   - **注意**：临时绑定码仅存在于 CLI 运行时内存中，不会持久化到数据库

2. **登录您的 Mango 账户**
   - 如果未登录，系统会提示您登录

3. **页面自动获取设备信息**
   - 页面会自动订阅 Realtime Channel `binding:a1b2c3d4`
   - 从 Channel 中获取设备 URL（cloudflare_url、localhost_url、hostname_url）
   - 自动进行 health check，验证设备是否可访问

4. **设备可用后，进入绑定状态**
   - 页面显示设备信息（平台、主机名等）
   - 输入设备别名（如"工作电脑"、"家用 Mac"）
   - 点击"绑定设备"按钮

5. **完成绑定**
   - 页面通过设备 URL 发送绑定请求
   - 设备生成并保存正式绑定码（256位）
   - 设备返回绑定码给 Mango
   - Mango 记录绑定关系（设备 ID、用户 ID、设备 URL、绑定码）
   - CLI 关闭 Realtime Channel，临时绑定码自动失效

6. **后续通信**
   - Agent 通过设备 URL 调用 MCP 服务
   - 使用正式绑定码进行认证
   - 设备 URL 变更时，设备会自动更新到 Mango

**绑定流程图**：

```
CLI 启动
  ↓
生成临时绑定码 (8位，运行时内存)
  ↓
创建 Cloudflare Tunnel
  ↓
建立 Realtime Channel
  ↓
发送设备 URL 到 Channel
  ↓
打开绑定页面 ──→ 用户登录
  ↓                  ↓
等待绑定请求 ←── 订阅 Channel
  ↓                  ↓
接收绑定请求 ←── 获取设备 URL
  ↓                  ↓
生成正式绑定码 ←── Health Check
  ↓                  ↓
返回绑定码 ────→ 用户触发绑定
  ↓                  ↓
保存绑定码 ←────── 记录绑定关系
  ↓                  ↓
关闭 Channel      绑定完成
临时绑定码失效
```

**安全说明**：
- 临时绑定码仅 8 位，仅存在于 CLI 运行时内存中
- 绑定完成后，CLI 主动关闭 Realtime Channel
- 临时绑定码随 CLI 进程结束而消失，无需清理
- 正式绑定码 256 位，存储在本地 `~/.mango/binding_code` 文件中
- 后续所有 API 请求使用正式绑定码认证

### 11.5 配置 MCP 服务

**方式 1: Web 界面**

1. 访问 https://app.mango.ai/devices
2. 选择设备 → "配置 MCP 服务"
3. 添加服务配置

**方式 2: CLI 命令**

```bash
# 添加 MCP 服务
mango config --add filesystem \
  --command npx \
  --args "-y @modelcontextprotocol/server-filesystem /Users/username/Documents"

# 列出所有服务
mango config --list

# 删除服务
mango config --remove filesystem
```

**方式 3: 编辑配置文件**

编辑 `~/.mango/config.json`：

```json
{
  "mcp_services": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Documents"],
      "env": {
        "LOG_LEVEL": "info"
      },
      "status": "active"
    }
  ]
}
```

### 11.6 测试 MCP 服务

在 Mango Web 对话中：

```
请帮我读取本地文件 /Users/username/Documents/report.txt 的内容
```

Agent 会自动调用您配置的 `filesystem` MCP 服务。

### 11.7 常见 MCP 服务示例

**文件系统访问**：
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Documents"]
}
```

**GitHub 集成**：
```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx"
  }
}
```

**数据库访问**：
```json
{
  "name": "postgres",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
  }
}
```

### 11.8 CLI 故障排查

**问题 1: Tunnel 创建失败**

```bash
# 检查 cloudflared 安装
cloudflared --version

# 手动测试 tunnel
cloudflared tunnel --url http://localhost:3000
```

**问题 2: 设备绑定失败**

```bash
# 查看 device_secret
cat ~/.mango/device_secret  # macOS/Linux
type %USERPROFILE%\.mango\device_secret  # Windows
```

**问题 3: MCP 服务无法启动**

```bash
# 查看设备服务日志
mango logs

# 手动测试 MCP 服务
npx -y @modelcontextprotocol/server-filesystem /Users/username/Documents
```

**问题 4: 端口被占用**

```bash
# 使用不同端口
mango start --port 8080

# 或终止占用进程
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

### 11.9 CLI 命令参考

```bash
# 启动设备服务
mango start [options]
  --port <port>              指定端口（默认: 3000）
  --ignore-open-bind-url     不自动打开绑定页面
  --app-url <url>            Mango Web URL
  --supabase-url <url>       Supabase URL
  --supabase-anon-key <key>  Supabase anon key

# 配置管理
mango config --list                    列出所有 MCP 服务
mango config --add <name> [options]    添加 MCP 服务
mango config --remove <name>           删除 MCP 服务

# 状态查询
mango status                           查看设备服务状态

# 帮助
mango --help                           显示帮助信息
```

### 11.10 安全最佳实践

- ❌ 不要将 device_secret 提交到版本控制
- ❌ 不要在公共场合分享 device_secret
- ✅ 限制文件系统访问到特定目录
- ✅ 使用环境变量存储敏感信息（如 GitHub token）
- ✅ 定期审查设备绑定和 MCP 服务配置

### 11.11 更多资源

- 📚 [MCP 协议文档](https://spec.modelcontextprotocol.io/)
- 🛠️ [开发自定义 MCP 服务](https://github.com/modelcontextprotocol/servers)
- 📖 [完整 CLI 文档](https://docs.mango.ai/cli)
- 🐛 [报告问题](https://github.com/mango-ai/cli/issues)

---

## 12. 获取帮助

### 遇到问题？

1. **查看文档**：先查阅项目文档和官方文档
2. **搜索Issue**：在GitHub Issues中搜索类似问题
3. **提问**：在团队Slack频道提问
4. **创建Issue**：如果是Bug或功能请求，创建GitHub Issue

### 团队联系方式

- Slack: #mango-dev
- Email: dev@mango.example.com
- GitHub: https://github.com/your-org/mango

---

**祝开发顺利！🚀**

最后更新：2025-11-24

## 13. User Story 5: 富交互界面与工作区

### 13.1 A2UI 组件开发

**创建自定义 A2UI 组件**：

```typescript
// frontend/src/components/a2ui/widgets/CustomWidget.tsx
import React from 'react';

interface CustomWidgetProps {
  title: string;
  data: any;
  onEvent: (eventName: string, data: any) => void;
}

export function CustomWidget({ title, data, onEvent }: CustomWidgetProps) {
  return (
    <div className="custom-widget">
      <h3>{title}</h3>
      <button onClick={() => onEvent('click', { timestamp: Date.now() })}>
        Click Me
      </button>
    </div>
  );
}
```

**注册组件到 Registry**：

```typescript
// frontend/src/components/a2ui/ComponentRegistry.tsx
import { CustomWidget } from './widgets/CustomWidget';

export const COMPONENT_REGISTRY = {
  // 标准组件
  Text: TextWidget,
  Button: ButtonWidget,
  Card: CardWidget,
  // 自定义组件
  CustomWidget: CustomWidget,
};
```

### 13.2 工作区开发

**使用工作区 Hook**：

```typescript
// 在组件中使用工作区
import { useWorkspace } from '@/hooks/useWorkspace';

function ChatPage() {
  const { isOpen, toggle, activeTab, setActiveTab } = useWorkspace();

  return (
    <div>
      <button onClick={toggle}>
        {isOpen ? '关闭工作区' : '打开工作区'}
      </button>
      {isOpen && (
        <Workspace activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}
```

### 13.3 终端集成

**创建终端会话**：

```typescript
import { useTerminal } from '@/hooks/useTerminal';

function TerminalPanel({ deviceId, bindingCode }) {
  const { createSession, sessions } = useTerminal();

  const handleCreateTerminal = async () => {
    const session = await createSession(deviceId, bindingCode);
    console.log('Terminal session created:', session.id);
  };

  return (
    <div>
      <button onClick={handleCreateTerminal}>新建终端</button>
      {sessions.map(session => (
        <Terminal key={session.id} sessionId={session.id} />
      ))}
    </div>
  );
}
```

---

## 14. User Story 4: MiniApp 和 Skill 开发

### 14.1 MiniApp 开发快速开始

**创建 MiniApp**：

```javascript
// MiniApp 代码示例：TodoList
// 注册工具
mcpServer.tool({
  name: 'add_todo',
  description: '添加待办事项',
  parameters: z.object({
    title: z.string().describe('待办事项标题'),
  }),
  execute: async ({ title }) => {
    const todos = await storage.get('todos') || [];
    todos.push({
      id: crypto.randomUUID(),
      title,
      completed: false,
    });
    await storage.set('todos', todos);
    return { success: true };
  },
});

// 注册统一的 UI Resource
const uiResource = createUIResource({
  uri: 'ui://mango/main',
  content: {
    type: 'container',
    children: [
      { type: 'input', id: 'title' },
      { type: 'button', label: '添加' },
    ],
  },
  encoding: 'json',
});

mcpServer.resource(uiResource);
```

---

### 14.2 前端集成 MiniApp

**安装依赖**：
```bash
npm install @mcp-ui/client
```

**使用 UIResourceRenderer**：
```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

function MiniAppViewer({ miniAppId }) {
  const [resource, setResource] = useState(null);

  useEffect(() => {
    fetch(`/api/miniapp-mcp/${miniAppId}`, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: { uri: 'ui://mango/main' },
        id: 1,
      }),
    })
      .then(r => r.json())
      .then(data => setResource(data.result.contents[0]));
  }, [miniAppId]);

  return resource ? (
    <UIResourceRenderer resource={resource} onUIAction={handleAction} />
  ) : null;
}
```

---

### 14.3 更多资源

- 📚 [MiniApp API 契约](./contracts/miniapp-mcp-api.md)
- 🔬 [MCP UI 客户端研究](./research-mcp-browser-client.md)
- 🏗️ [MiniApp 架构设计](./research-miniapp-unified-ui.md)
- 📖 [Skill 文件系统架构](./research-skill-filesystem.md)

---

**完成！现在你已经掌握了 Mango 平台的核心开发技能。🎉**

最后更新：2026-01-06
