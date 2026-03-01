# MiniApp MCP 服务实现方案

**更新日期**: 2026-01-06
**基于**: @hono/mcp + MCP Server HTML 资源

## 1. MiniApp MCP Edge Function 实现

### 1.1 核心架构

```typescript
// supabase/functions/miniapp-mcp/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// MiniApp MCP 端点
app.all('/:id', async (c) => {
  const miniAppId = c.req.param('id');

  // 1. 鉴权
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 2. 获取 MiniApp
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: miniApp, error } = await supabase
    .from('mini_apps')
    .select('*')
    .eq('id', miniAppId)
    .single();

  if (error || !miniApp) {
    return c.json({ error: 'MiniApp not found' }, 404);
  }

  // 3. 创建 MCP Server
  const mcpServer = new McpServer({
    name: `miniapp-${miniApp.name}`,
    version: miniApp.manifest.version || '1.0.0',
  });

  // 4. 创建沙箱上下文
  const context = await createMiniAppContext(c, miniApp);

  // 5. 在沙箱中执行 MiniApp 代码
  await executeMiniAppCode(mcpServer, miniApp.code, context);

  // 6. 初始化传输层
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);

  // 7. 处理请求
  return transport.handleRequest(c);
});

export default app;
```

---

## 2. 沙箱上下文创建

### 2.1 上下文接口定义

```typescript
interface MiniAppContext {
  // 注入的全局对象
  registerAppTool: (name: string, description: string, schema: any, handler: Function) => void;
  registerAppResource: (uri: string, html: string) => void;
  z: typeof z;

  // 用户信息
  user: {
    id: string;
    name: string;
    email: string;
  };

  // 存储 API
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };

  // 通知 API
  notification: {
    send: (title: string, body: string) => Promise<void>;
  };
}
```

### 2.2 上下文创建实现

```typescript
async function createMiniAppContext(
  c: Context,
  miniApp: MiniApp
): Promise<MiniAppContext> {
  // 解析用户信息
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    token!
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found');
  }

  // 创建存储 API
  const storage = {
    async get(key: string) {
      const { data } = await supabase
        .from('mini_app_data')
        .select('value')
        .eq('installation_id', miniApp.installation_id)
        .eq('key', key)
        .single();

      return data?.value;
    },

    async set(key: string, value: any) {
      await supabase
        .from('mini_app_data')
        .upsert({
          installation_id: miniApp.installation_id,
          key,
          value,
        });
    },

    async delete(key: string) {
      await supabase
        .from('mini_app_data')
        .delete()
        .eq('installation_id', miniApp.installation_id)
        .eq('key', key);
    },
  };

  // 创建通知 API
  const notification = {
    async send(title: string, body: string) {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          source_type: 'miniapp',
          source_id: miniApp.id,
          title,
          body,
          category: 'info',
        });
    },
  };

  return {
    registerAppTool: null as any, // 将在执行时注入
    registerAppResource: null as any, // 将在执行时注入
    z,
    user: {
      id: user.id,
      name: user.user_metadata?.name || user.email || '',
      email: user.email || '',
    },
    storage,
    notification,
  };
}
```

---

## 3. 沙箱执行实现

### 3.1 安全沙箱执行

```typescript
async function executeMiniAppCode(
  mcpServer: McpServer,
  code: string,
  context: MiniAppContext
): Promise<void> {
  // 注入 registerAppTool / registerAppResource 到上下文
  context.registerAppTool = (name, desc, schema, handler) => {
    mcpServer.tool({ name, description: desc, parameters: schema, execute: handler });
  };
  context.registerAppResource = (uri, html) => {
    mcpServer.resource({ uri, mimeType: 'text/html', text: html });
  };

  // 创建受限的全局对象
  const sandbox = {
    // MCP 相关
    registerAppTool: context.registerAppTool,
    registerAppResource: context.registerAppResource,
    z,

    // 上下文 API
    user: Object.freeze(context.user),
    storage: context.storage,
    notification: context.notification,

    // 工具函数
    console: {
      log: (...args: any[]) => console.log('[MiniApp]', ...args),
      error: (...args: any[]) => console.error('[MiniApp]', ...args),
    },

    // 禁止的全局对象
    fetch: undefined,
    Deno: undefined,
    eval: undefined,
    Function: undefined,
  };

  // 包装代码
  const wrappedCode = `
    (async function(context) {
      const { registerAppTool, registerAppResource, z, user, storage, notification, console } = context;

      ${code}
    })(sandbox);
  `;

  // 执行代码
  try {
    await eval(wrappedCode);
  } catch (error) {
    console.error('MiniApp execution error:', error);
    throw new Error(`Failed to execute MiniApp: ${error.message}`);
  }
}
```

---

## 4. MiniApp 代码示例

### 4.1 TodoList MiniApp（使用新架构）

```javascript
// TodoList MiniApp Code
// 注册工具
registerAppTool(
  'add_todo',
  '添加新的待办事项',
  z.object({
    title: z.string().describe('待办事项标题'),
    description: z.string().optional().describe('详细描述'),
    dueDate: z.string().optional().describe('截止日期'),
  }),
  async ({ title, description, dueDate }) => {
    const todos = await storage.get('todos') || [];

    const newTodo = {
      id: crypto.randomUUID(),
      title,
      description: description || '',
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      userId: user.id,
    };

    todos.push(newTodo);
    await storage.set('todos', todos);
    await notification.send('新待办', `已添加：${title}`);

    return { success: true, todo: newTodo };
  }
);

registerAppTool(
  'list_todos',
  '列出所有待办事项',
  z.object({
    filter: z.enum(['all', 'active', 'completed']).optional(),
  }),
  async ({ filter = 'all' }) => {
    const todos = await storage.get('todos') || [];

    let filtered = todos;
    if (filter === 'active') {
      filtered = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = todos.filter(t => t.completed);
    }

    return { todos: filtered };
  }
);

// 注册 UI Resource（HTML 格式）
registerAppResource('ui://mango/main', `
  <!DOCTYPE html>
  <html>
  <head>
    <title>待办事项</title>
    <style>
      body { font-family: sans-serif; padding: 16px; }
      .todo-item { padding: 8px; border-bottom: 1px solid #eee; }
      .completed { text-decoration: line-through; color: #999; }
    </style>
  </head>
  <body>
    <h2>待办事项</h2>
    <form id="add-form">
      <input type="text" id="title" placeholder="输入待办标题" required />
      <button type="submit">添加</button>
    </form>
    <div id="todo-list"></div>
    <script>
      // MiniApp 前端逻辑通过 postMessage 与宿主通信
    </script>
  </body>
  </html>
`);
```

---

**更新完成日期**: 2026-01-06
**下一部分**: Skill 文件系统架构
