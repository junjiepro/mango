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
registerAppTool(
  'add_todo',
  '添加待办事项',
  z.object({ title: z.string() }),
  async ({ title }) => {
    const todos = await storage.get('todos') || [];
    todos.push({ id: crypto.randomUUID(), title });
    await storage.set('todos', todos);
    return { success: true };
  }
);

// 注册 UI Resource（HTML 格式）
registerAppResource('ui://mango/main', `
  <!DOCTYPE html>
  <html>
  <head><title>TodoList</title></head>
  <body>
    <h2>待办事项</h2>
    <input type="text" id="title" placeholder="输入标题" />
    <button onclick="addTodo()">添加</button>
    <div id="todo-list"></div>
  </body>
  </html>
`);
```

---

## 3. 前端集成方案

### 3.1 使用 MiniAppContainer + HTML iframe

> **架构变更说明**：原 `UIResourceRenderer` + JSON 组件树方案已废弃。
> 当前架构使用 `MiniAppContainer` 组件，通过 `registerAppResource` 注册 HTML 资源，
> 前端统一使用 HTML iframe 渲染 MiniApp UI。

```tsx
import { MiniAppContainer } from '@/components/miniapp/MiniAppContainer';

function MiniAppViewer({ miniAppId }) {
  // MiniAppContainer 内部通过 MCP 协议获取 HTML 资源
  // 并使用 iframe 沙箱渲染
  return (
    <MiniAppContainer
      miniAppId={miniAppId}
      resourceUri="ui://mango/main"
    />
  );
}
```

---

**文档完成**: 第 3 部分
