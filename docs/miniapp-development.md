# MiniApp 开发指南

## 概述

MiniApp（小应用）是 Mango 平台的可扩展功能模块，运行在沙箱环境中，通过 Agent 智能调用或用户主动触发。

## 快速开始

### 1. 创建小应用

通过 API 创建：

```bash
POST /api/miniapps
Content-Type: application/json

{
  "name": "my-todo",
  "display_name": "待办管理",
  "description": "管理待办事项",
  "code": "switch(action) { case 'read': return await storage.get('items') || []; }",
  "manifest": {
    "version": "1.0.0",
    "required_permissions": ["storage"],
    "apis": ["storage"],
    "triggers": []
  }
}
```

### 2. 代码结构

每个 MiniApp 接收以下上下文变量：

| 变量 | 类型 | 说明 |
|------|------|------|
| `action` | `'create' \| 'read' \| 'update' \| 'delete'` | 当前操作 |
| `params` | `object` | 操作参数 |
| `storage` | `StorageAPI` | 数据持久化 API |

### 3. Storage API

```javascript
// 写入
await storage.set('key', value);

// 读取
const value = await storage.get('key');
```

## Manifest 配置

```typescript
interface MiniAppManifest {
  version: string;
  required_permissions: string[];  // 'storage' | 'network' | 'notification'
  apis: string[];                  // 可用 API 列表
  triggers: Array<{
    type: 'schedule' | 'event';
    config: Record<string, any>;
  }>;
}
```

## 运行时配置

```typescript
interface RuntimeConfig {
  sandbox_level: 'strict' | 'moderate' | 'relaxed';
  max_memory_mb: number;           // 默认 10
  max_execution_time_ms: number;   // 默认 5000
  allowed_domains: string[];
}
```

## 安全约束

- 代码在 iframe sandbox 中执行
- 最大执行时间 5 秒，内存 10MB
- 无法访问 DOM、localStorage 等浏览器 API
- 网络请求受 allowed_domains 限制

## 版本管理

小应用支持版本控制：

```bash
# 创建新版本
POST /api/miniapps/:id/versions

# 回滚到指定版本
POST /api/miniapps/:id/versions/:version/rollback
```

## 分享

```bash
# 创建分享链接
POST /api/miniapps/:id/share

# 通过分享链接安装
POST /api/miniapps/share/:shareToken/install
```
