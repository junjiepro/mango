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

## 11. 获取帮助

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
