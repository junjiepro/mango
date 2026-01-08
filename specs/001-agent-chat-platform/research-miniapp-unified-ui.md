# MiniApp 架构设计更新

**更新日期**: 2026-01-06
**基于**: 统一 UI Resource URI 规范

## 1. 核心变更

### 1.1 统一 UI Resource URI

**变更前**：每个 MiniApp 有独立的 UI Resource URI
```
miniapp://todo-app-id/ui
miniapp://weather-app-id/ui
```

**变更后**：所有 MiniApp 统一使用固定 URI
```
ui://mango/main
```

**理由**：
- 简化前端实现，统一的 URI 便于缓存和管理
- MiniApp ID 通过 HTTP 路径传递，不需要在 URI 中体现
- 符合 MCP UI Resource 的最佳实践

---

## 2. MiniApp MCP Server 实现

### 2.1 Edge Function 端点

```typescript
// supabase/functions/miniapp-mcp/index.ts
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { createUIResource } from '@mcp-ui/server';

const app = new Hono();

app.all('/:id', async (c) => {
  const miniAppId = c.req.param('id');

  // 获取 MiniApp
  const miniApp = await getMiniApp(miniAppId);

  // 创建 MCP Server
  const mcpServer = new McpServer({
    name: `miniapp-${miniApp.name}`,
    version: '1.0.0',
  });

  // 执行 MiniApp 代码，注册工具和资源
  await executeMiniAppCode(mcpServer, miniApp.code);

  // 连接传输层
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);

  return transport.handleRequest(c);
});
```

---

### 2.2 MiniApp 代码示例

```javascript
// TodoList MiniApp Code
// 注册工具
mcpServer.tool({
  name: 'add_todo',
  description: '添加待办事项',
  parameters: z.object({
    title: z.string(),
  }),
  execute: async ({ title }) => {
    const todos = await storage.get('todos') || [];
    todos.push({ id: crypto.randomUUID(), title });
    await storage.set('todos', todos);
    return { success: true };
  },
});

// 注册统一的 UI Resource
const uiResource = createUIResource({
  uri: 'ui://mango/main',  // 统一 URI
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

## 3. 前端集成方案

### 3.1 使用 UIResourceRenderer

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

function MiniAppViewer({ miniAppId }) {
  const [resource, setResource] = useState(null);

  useEffect(() => {
    // 通过 HTTP 调用 MCP Server
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
    <UIResourceRenderer
      resource={resource}
      onUIAction={handleAction}
    />
  ) : null;
}
```

---

**文档完成**: 第 3 部分
