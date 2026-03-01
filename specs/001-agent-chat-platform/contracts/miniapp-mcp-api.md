# API 契约文档

**Feature**: User Story 4 - Agent上下文工程与持续改进
**Version**: 1.0.0
**Date**: 2026-01-06

## 1. MiniApp MCP Server API

### 1.1 端点信息

**Base URL**: `https://your-project.supabase.co/functions/v1/miniapp-mcp`

**端点格式**: `POST /miniapp-mcp/{miniAppId}`

**认证**: Bearer Token (Supabase Auth)

---

## 2. MCP 协议规范

### 2.1 请求格式

所有请求遵循 JSON-RPC 2.0 规范：

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": {},
  "id": 1
}
```

---

### 2.2 响应格式

成功响应：
```json
{
  "jsonrpc": "2.0",
  "result": {},
  "id": 1
}
```

错误响应：
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  },
  "id": 1
}
```

---

## 3. MCP 方法

### 3.1 resources/list

列出 MiniApp 提供的所有资源。

**请求**：
```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 1
}
```

**响应**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "ui://mango/main",
        "name": "MiniApp UI",
        "mimeType": "text/html"
      }
    ]
  },
  "id": 1
}
```

---

### 3.2 resources/read

读取指定的资源内容。

**请求**：
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "ui://mango/main"
  },
  "id": 1
}
```

**响应**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://mango/main",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html><html><head><title>MiniApp</title></head><body>...</body></html>"
      }
    ]
  },
  "id": 1
}
```

---

### 3.3 tools/list

列出 MiniApp 提供的所有工具。

**请求**：
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 1
}
```

**响应**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "add_todo",
        "description": "添加待办事项",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": { "type": "string" }
          },
          "required": ["title"]
        }
      }
    ]
  },
  "id": 1
}
```

---

### 3.4 tools/call

调用 MiniApp 的工具。

**请求**：
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add_todo",
    "arguments": {
      "title": "完成项目文档"
    }
  },
  "id": 1
}
```

**响应**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"todo\":{\"id\":\"...\"}}"
      }
    ]
  },
  "id": 1
}
```

---

## 4. 错误码

| 错误码 | 说明 |
|--------|------|
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32700 | Parse error |

---

**API 契约文档完成**
**版本**: 1.0.0
**日期**: 2026-01-06
