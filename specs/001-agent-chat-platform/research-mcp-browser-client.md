# MCP 浏览器客户端技术调研

**调研日期**: 2026-01-06
**目标**: 调研 mcp-use/browser 和 mcp-ui 客户端技术

## 1. mcp-use HTTP 客户端基础

### 1.1 HTTP MCP Server 配置

mcp-use 支持通过 HTTP/HTTPS 连接 MCP Server：

```json
{
  "mcpServers": {
    "miniapp_server": {
      "url": "https://your-project.supabase.co/functions/v1/miniapp-mcp/todo-app-id",
      "headers": {
        "Authorization": "Bearer ${AUTH_TOKEN}"
      }
    }
  }
}
```

**关键特性**：
- 支持标准 HTTP/HTTPS 协议
- 可自定义请求头（如 Authorization）
- 适合无状态操作和现有 HTTP 基础设施集成

### 1.2 连接测试

```bash
# 测试 MiniApp MCP 端点
curl -v https://your-project.supabase.co/functions/v1/miniapp-mcp/todo-app-id \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

---

## 2. mcp-ui 客户端基础

### 2.1 核心组件：UIResourceRenderer

**安装**：
```bash
npm install @mcp-ui/client
```

**基本用法**：
```tsx
import { UIResourceRenderer, UIActionResult } from '@mcp-ui/client';

function MiniAppViewer({ resource }) {
  const handleUIAction = async (result: UIActionResult) => {
    switch (result.type) {
      case 'tool':
        // 调用 MCP Tool
        console.log('Tool call:', result.payload.toolName, result.payload.params);
        break;
      case 'prompt':
        // 处理提示
        console.log('Prompt:', result.payload.prompt);
        break;
      case 'link':
        // 处理链接
        console.log('Link:', result.payload.url);
        break;
      case 'notify':
        // 显示通知
        console.log('Notification:', result.payload.message);
        break;
    }
    return { status: 'handled' };
  };

  return (
    <UIResourceRenderer
      resource={resource}
      onUIAction={handleUIAction}
    />
  );
}
```

---

### 2.2 UI Action 类型详解

**UIActionResult 类型定义**：

```typescript
type UIActionResult =
  | { type: 'tool'; payload: { toolName: string; params: any } }
  | { type: 'prompt'; payload: { prompt: string } }
  | { type: 'link'; payload: { url: string } }
  | { type: 'intent'; payload: { intent: string; params?: any } }
  | { type: 'notify'; payload: { message: string } };
```

**各类型说明**：

1. **tool**: 调用 MCP Tool
   - 用于执行 MiniApp 的功能
   - 需要通过 MCP 客户端调用对应的 Tool

2. **prompt**: 向用户显示提示
   - 用于收集用户输入
   - 可以触发对话流程

3. **link**: 导航到链接
   - 用于打开外部链接或内部路由

4. **intent**: 触发意图
   - 用于复杂的交互流程
   - 可以携带参数

5. **notify**: 显示通知
   - 用于向用户反馈信息

---

## 3. 完整的 MiniApp 集成示例

### 3.1 MiniApp 查看器组件

```tsx
// MiniAppViewer.tsx
import React, { useState, useEffect } from 'react';
import { UIResourceRenderer, UIActionResult } from '@mcp-ui/client';

interface MiniAppViewerProps {
  miniAppId: string;
}

export function MiniAppViewer({ miniAppId }: MiniAppViewerProps) {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMiniAppUI();
  }, [miniAppId]);

  async function loadMiniAppUI() {
    try {
      setLoading(true);

      // 调用 MCP Server 读取 UI Resource
      const response = await fetch(
        `https://your-project.supabase.co/functions/v1/miniapp-mcp/${miniAppId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'resources/read',
            params: { uri: 'ui://mango/main' },
            id: 1,
          }),
        }
      );

      const data = await response.json();
      setResource(data.result.contents[0]);
    } catch (error) {
      console.error('Failed to load MiniApp UI:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>加载中...</div>;
  if (!resource) return <div>未找到 MiniApp</div>;

  return <UIResourceRenderer resource={resource} onUIAction={handleUIAction} />;
}
```

---

**研究完成**: 第 4 部分
