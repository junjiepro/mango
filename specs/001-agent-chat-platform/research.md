# Research Document: Mango - 智能Agent对话平台

**Feature**: 001-agent-chat-platform
**Date**: 2025-11-24
**Purpose**: Phase 0 技术研究 - 解决技术上下文中的所有待澄清项

---

## 研究目标

本文档解决实现计划中标记为 "NEEDS CLARIFICATION" 的技术问题，为 Phase 1 设计提供坚实的技术基础。

---

## 1. MCP (Model Context Protocol) 协议研究

### 1.1 核心架构

**三层架构模型**：
- **Host（宿主）**：整体协调者，管理LLM交互和多个客户端连接
- **Clients（客户端）**：与Server建立1:1关系，代表使用者连接到具体服务
- **Servers（服务器）**：提供专业化能力（工具、资源、提示模板）

**传输方式**：
1. **stdio传输**：进程间通信，适合本地/CLI集成
2. **HTTP + SSE**：HTTP用于命令，SSE用于服务器推送，适合Web应用

### 1.2 四大核心能力

| 能力 | 描述 | Mango应用场景 |
|------|------|--------------|
| **工具调用 (Tools)** | 结构化接口，支持参数定义和验证 | Agent调用外部工具完成任务 |
| **资源访问 (Resources)** | URI-based资源读取，支持订阅 | 访问文件、数据源 |
| **提示模板 (Prompts)** | 可复用的提示词库 | Agent快速初始化 |
| **采样支持 (Sampling)** | 双向LLM交互 | Agent间协作 |

### 1.3 TypeScript实现方案

**推荐架构**（分层设计）：

```typescript
// 1. 传输层 (Transport Layer)
//    - stdio: child_process管理
//    - HTTP/SSE: fetch + EventSource

// 2. 协议层 (Protocol Layer)
//    - JSON-RPC 2.0消息处理
//    - 请求-响应匹配
//    - 能力协商状态机

// 3. 业务层 (Business Layer)
//    - Tool Registry
//    - Resource Handler
//    - Error Handling

// 4. 应用层 (Application Layer)
//    - 具体Server实现
//    - 业务逻辑编排
```

**关键决策**：
- ✅ 类型安全：严格的TypeScript类型 + Zod参数校验
- ✅ 错误处理：标准化MCP错误码 + 30s超时
- ✅ 性能优化：消息批处理、连接复用
- ✅ 安全性：后端代理模式，前端不直接访问MCP Server

### 1.4 Web应用安全集成

**架构决策**：
```
Web前端 → Next.js后端（MCP Client） → MCP Server
         ↑
         统一认证、权限控制点
```

**安全措施**：
1. **多层认证**：用户认证（Supabase Auth） + MCP服务认证（API Key）
2. **权限隔离**：用户级、Tool级、资源级权限控制
3. **数据保护**：HTTPS传输 + 敏感凭证后端管理
4. **注入防护**：参数校验 + Schema验证 + 黑名单过滤

### 1.5 与A2A/ACP协议的关系

| 协议 | 核心目标 | 通信模式 | Mango使用场景 |
|------|---------|---------|--------------|
| **MCP** | AI系统与工具/资源集成 | Host-Clients-Servers | CLI接入本地工具、调用外部服务 |
| **A2A** | Agent间点对点通信 | 对等通信 | 多Agent协作完成复杂任务 |
| **ACP** | IDE与Coding Agent通信 | Agent-Client | 接入coding agents进行代码修改 |

**决策：协议优先级**
- **P1 (MVP)**：MCP - 核心工具调用能力
- **P2**：ACP - Coding agents集成
- **P3**：A2A - Agent协作（未来扩展）

---

## 2. Supabase Realtime + Next.js 实时架构

### 2.1 Supabase Realtime 架构

**核心组件**：
- **协议层**：WebSocket双向通信
- **后端**：Elixir + Phoenix Framework（高并发性能）
- **数据集成**：PostgreSQL Logical Replication（变更捕获）
- **安全**：RLS (Row-Level Security) 自动过滤

**工作流程**：
```
客户端连接 → JWT认证 → 订阅频道 → 监听数据库变更 → 实时推送更新
```

### 2.2 Next.js App Router 集成方案

**推荐分层架构**：

```typescript
// Layer 1: UI层 (React Components)
//   - 使用 useEffect + Context

// Layer 2: Hook层 (useRealtimeSubscription)
//   - 管理订阅生命周期
//   - 状态同步

// Layer 3: Realtime Client层 (supabase-js)
//   - WebSocket连接
//   - 频道管理

// Layer 4: Server Action / API Route
//   - 认证、RLS验证
//   - 数据初始化

// Layer 5: Supabase Backend
//   - 数据库、Realtime Server
```

**实现模式（混合方案）**：
1. Server Component加载初始数据（更快的FCP）
2. Client Component建立实时订阅
3. Context全局状态管理
4. Suspense处理加载状态

### 2.3 性能优化策略

**订阅层优化**：
- 防抖状态更新（300-500ms）
- 批量处理多个更新
- 选择性订阅（只订阅需要的列和事件）
- 频道分割（按功能模块）

**数据库优化**：
```sql
-- 索引优化
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_room_user ON messages(room_id, user_id);

-- 表分区（处理大数据量）
PARTITION TABLE messages BY RANGE (created_at);

-- 连接池配置
-- PgBouncer: min_pool_size=25, max_pool_size=100
```

### 2.4 离线重连与消息同步

**三层重连机制**：
1. **自动重连**：Supabase JS内置（指数退避：1s→2s→4s→8s）
2. **心跳检测**：应用层30s超时检测
3. **用户交互恢复**：窗口focus时主动同步

**消息同步策略**：
```typescript
// 1. 记录断线时间
const disconnectTime = Date.now();

// 2. 重连后查询增量消息
SELECT * FROM messages
WHERE created_at > disconnect_time
  AND room_id = ?
ORDER BY created_at ASC;

// 3. 合并本地缓存 + 远端消息
// 4. 去重并排序
// 5. 恢复订阅
```

### 2.5 后台任务执行

**架构方案**：
```
Next.js Server Action → Supabase Edge Functions → PostgreSQL Triggers
        ↓                       ↓
   同步任务              异步/长运行任务
```

**任务状态管理**：
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID,
  status VARCHAR(20), -- pending, processing, completed, failed
  progress INT,       -- 0-100
  result JSONB
);

-- Realtime推送任务进度更新
```

### 2.6 扩展至1000并发用户

**架构方案**：
```
CDN/Global Routing
    ↓
Next.js Edge (Multi-Region)
    ↓
Supabase Realtime Cluster (3个实例 × 400连接)
    ↓
PostgreSQL HA (主 + 2从 + 故障转移)
```

**容量规划**：
- 1000并发 + 20%缓冲 = 1200连接
- 3个Realtime实例 × 400连接 = 1200连接
- 负载均衡器（Nginx/HAProxy）
- Redis缓存（可选）

---

## 3. 小应用沙箱运行时设计

### 3.1 沙箱技术方案对比

| 方案 | 隔离强度 | DOM访问 | 性能 | 适用场景 |
|------|---------|---------|------|---------|
| **iframe沙箱** | 中 | 受限 | 低 | 通用小应用（推荐） |
| **Web Workers** | 高 | 无 | 高 | 计算密集型 |
| **SES (Secure ECMAScript)** | 高 | 受限 | 中 | 严格隔离 |

**决策：iframe沙箱 + Web Workers组合**
- iframe：主要小应用运行环境
- Web Workers：后台计算、定时任务

### 3.2 iframe沙箱配置

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  allow=""
  csp="default-src 'self'; script-src 'self'"
  src="..."
/>
```

**隔离机制**：
- JS执行仅允许合法操作
- 网络受CORS限制
- 独立localStorage/IndexedDB
- 禁止Flash等插件
- 无法修改top.location

### 3.3 安全通信机制

**消息协议设计**：
```typescript
interface SecureMessage {
  id: string;              // 用于追踪与响应匹配
  type: "REQUEST" | "RESPONSE" | "EVENT";
  action: string;          // 明确的操作类型
  version: string;         // API版本
  nonce: string;           // 防重放
  timestamp: number;       // 时间戳
  payload: any;
  signature?: string;      // 完整性校验
}
```

**验证流程**：
1. 验证Origin
2. 验证nonce（防重放）
3. 验证签名（可选）
4. 检查权限
5. 执行业务逻辑
6. 发送响应

### 3.4 权限系统设计

**RBAC + 能力模型混合**：

```typescript
const PERMISSION_CATALOG = {
  // 数据权限
  'user:read': '读取当前用户信息',
  'user:write': '修改当前用户信息',

  // API权限
  'api:analytics': '调用分析API',
  'api:storage': '使用存储服务',

  // 系统权限
  'system:notification': '发送系统通知',
  'system:navigation': '导航到其他页面',

  // 网络权限
  'network:external': '请求外部API',

  // 存储权限
  'storage:local': '访问本地存储',
};
```

**权限授予流程**：
```
小应用声明权限 → 用户同意对话框 → 授予Token → 运行时检查
```

### 3.5 数据存储和状态管理

**存储架构**：
```
L1: Memory State (<1MB, 会话)
L2: SessionStorage (5-10MB, 页面刷新)
L3: LocalStorage (5-10MB, 永久)
L4: IndexedDB (50MB+, 永久)
L5: Backend API (无限, 永久)
```

**隔离方案**：
- iframe的localStorage自动与父窗口隔离
- IndexedDB按origin自动隔离
- 虚拟存储服务：逻辑隔离，物理共享

### 3.6 主动触发消息机制

**推荐方案组合**：

| 方案 | 延迟 | 跨标签页 | 可靠性 | 推荐度 |
|------|------|---------|--------|--------|
| **Service Worker** | 低 | 是 | 极高 | ⭐⭐⭐⭐⭐ |
| **消息队列+轮询** | 中 | 是 | 高 | ⭐⭐⭐⭐ |
| **localStorage事件** | 中 | 是 | 中 | ⭐⭐⭐ |
| **Web Notification API** | 极低 | 是 | 极高 | ⭐⭐⭐⭐⭐ |

**实现策略（优先级降级）**：
```
1. Web Notification API + Push Service
   ↓ (如不支持)
2. Service Worker消息队列
   ↓ (如不支持)
3. localStorage事件广播
   ↓ (如不支持)
4. 定期轮询
```

---

## 4. Agent持续学习与个性化

### 4.1 反馈记录机制

**数据库设计**：
```sql
CREATE TABLE feedback_records (
  id UUID PRIMARY KEY,
  user_id UUID,
  conversation_id UUID,
  message_id UUID,
  feedback_type ENUM('satisfaction', 'accuracy', 'usefulness', 'safety'),
  rating INT,              -- 1-5星
  tags TEXT[],             -- ["helpful", "too_verbose"]
  reason TEXT,             -- 用户自述原因
  metadata JSONB,          -- 设备类型、响应时间、模型版本
  created_at TIMESTAMP
);
```

**反馈类型**：
- ✅ 五星评分 + 标签：相比二值反馈粒度更细
- ✅ 多粒度：消息级 + 任务级反馈
- ✅ 版本历史：支持Soft Delete

### 4.2 学习与优化机制

**三层学习架构**：

```
Layer 1: 信号提取与聚合
├─ 反馈信号: feedback_records → 归一化评分
├─ 行为信号: messages → 用户编辑/重做行为
└─ 隐式信号: interactions → 停留时间、点击

Layer 2: 模式识别与规则生成
├─ 聚类分析: K-Means聚类相似任务
├─ 规则提取: 低反馈场景的共同特征
└─ 偏好提炼: 格式、详细度、语气

Layer 3: 优化应用（三种路径）
├─ 路径A: 提示词优化（即时, <100ms）
├─ 路径B: 微调适配（离线, 增量学习）
└─ 路径C: RAG增强（即时, <200ms）
```

### 4.3 个性化方案选择

**推荐：组合方案（提示词 + RAG + 规则库）**

| 功能 | 学习周期 | 实现方案 | 成本 | 隐私 |
|------|---------|---------|------|------|
| **格式偏好** | 实时 | 提示词注入 | 低 | ✅ |
| **任务类偏好** | 每天 | 动态规则库 | 低 | ✅ |
| **个性化语气** | 周级 | 微调层 | 中 | ✅ |

**决策理由**：
- ✅ MVP快速实现（3-4周）
- ✅ 性价比高
- ✅ 隐私完全可控（无需中央模型微调）
- ✅ 预期满足SC-007（20%准确率提升）

### 4.4 数据结构设计

```sql
-- 用户偏好表
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,
  format_preference JSONB DEFAULT '{
    "output_format": "concise",
    "language": "zh-CN",
    "tone": "professional"
  }',
  task_preferences JSONB
);

-- 学习记录表
CREATE TABLE learning_records (
  id UUID PRIMARY KEY,
  user_id UUID,
  record_type ENUM('format', 'accuracy', 'safety', 'efficiency'),
  rule_content JSONB,
  confidence FLOAT,       -- 0-1, 基于反馈加权
  is_active BOOLEAN,
  expires_at TIMESTAMP
);
```

### 4.5 用户数据管理

**用户学习数据管理中心**：

```
📊 数据查看层
├─ 学习档案总览
├─ 规则透明度视图
└─ 隐私审计日志

🗑️ 数据删除层
├─ 精细化删除（按标签、对话、时间）
├─ 批量操作（一键清空、导出）
└─ 删除影响预览

⚙️ 管理操作
├─ 操作日志
├─ 验证确认
└─ 通知反馈
```

**API设计**：
```typescript
// 查看学习数据
GET /api/learning/summary
GET /api/learning/rules?type=format

// 删除与管理
DELETE /api/learning/rules/:ruleId
POST /api/learning/cleanup

// 导出与备份
GET /api/learning/export?format=json
```

### 4.6 隐私保护设计

**多层隐私保护**：

```
Layer 0: 架构隐私 (Privacy by Design)
├─ 学习数据仅在用户本地数据库
├─ 无跨用户学习模型
└─ 反馈不用于训练全局模型

Layer 1: 数据最小化
├─ 仅记录必要反馈
├─ 不记录消息完整内容
└─ 使用UUID隔离

Layer 2: 访问控制
├─ RLS (Row Level Security)
├─ API权限检查
└─ 审计日志

Layer 3: 数据保护
├─ TLS传输
├─ PostgreSQL加密
└─ 敏感字段应用层加密

Layer 4: 用户权利
├─ 访问权（导出）
├─ 纠正权（修改）
├─ 遗忘权（删除）
└─ 可携带权（标准格式）

Layer 5: 合规
├─ GDPR（欧盟）
├─ CCPA（加州）
├─ LGPD（巴西）
└─ PIPL（中国）
```

---

## 5. ACP (Agent Client Protocol) 协议研究

### 5.1 核心定位

**ACP vs MCP**：
- **MCP**：通用工具/资源访问协议
- **ACP**：专注于IDE与Coding Agent通信

**核心价值**：
- 标准化IDE与AI代码助手的通信
- 类似LSP之于语言服务器
- Agent作为编辑器的子进程运行

### 5.2 通信机制

**协议特性**：
- JSON-RPC over stdio（与MCP相似）
- 复用MCP的JSON表示
- 自定义类型：代码diff、编辑操作
- 默认格式：Markdown

**架构模式**：
```
Code Editor/IDE
    ↓ (stdio)
Coding Agent (subprocess)
    ↓
执行代码修改任务
```

### 5.3 TypeScript实现

**SDK**：`@agentclientprotocol/sdk`

```typescript
import { AgentSideConnection } from '@agentclientprotocol/sdk';

// Agent端实现
const connection = new AgentSideConnection(/* ... */);

// 处理来自IDE的请求
connection.onRequest('edit', async (params) => {
  // 执行代码修改
  return { diff: '...' };
});
```

### 5.4 Mango集成方案

**使用场景**：
- 用户通过对话让Agent修改代码
- Agent调用ACP-compatible工具（如Gemini CLI）
- 小应用中集成代码编辑能力

**架构设计**：
```
Mango Web UI
    ↓
Next.js Backend
    ↓ (启动子进程)
ACP Agent (Gemini CLI / Custom Agent)
    ↓
修改代码文件
    ↓
返回diff供用户审查
```

**决策**：
- ✅ Phase 2优先级（P2）
- ✅ 通过CLI工具接入（与FR-017/018对齐）
- ✅ 复用MCP基础设施（通信层相似）

---

## 6. CLI工具与设备服务技术研究 (User Story 3)

### 6.1 Cloudflare Tunnel 集成方案

**决策：使用 Cloudflare Tunnel (cloudflared)**

**选择理由**：
- **零配置公网暴露**：无需配置端口转发、防火墙规则或购买域名
- **自动 HTTPS**：Cloudflare 自动提供 TLS 加密，确保通信安全
- **高可用性**：Cloudflare 的全球网络提供低延迟和高可用性
- **免费使用**：个人和小型项目可免费使用
- **官方支持**：提供 CLI 工具，易于集成

**实现方案**：

```typescript
import { spawn } from 'child_process';

class TunnelManager {
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;

  async createTunnel(localPort: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // 启动 cloudflared tunnel
      this.process = spawn('cloudflared', [
        'tunnel',
        '--url', `http://localhost:${localPort}`,
        '--no-autoupdate',
        '--metrics', 'localhost:0'  // 禁用 metrics 端口
      ]);

      // 解析输出获取公网 URL
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (match && !this.tunnelUrl) {
          this.tunnelUrl = match[0];
          resolve(this.tunnelUrl);
        }
      });

      this.process.stderr?.on('data', (data) => {
        console.error('Tunnel error:', data.toString());
      });

      this.process.on('error', (error) => {
        reject(new Error(`Failed to start tunnel: ${error.message}`));
      });

      // 超时处理
      setTimeout(() => {
        if (!this.tunnelUrl) {
          reject(new Error('Tunnel creation timeout'));
        }
      }, 30000);
    });
  }

  async cleanup() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.tunnelUrl = null;
    }
  }
}
```

**替代方案考虑**：
- **ngrok**：需要账户注册，免费版有连接限制和超时
- **localtunnel**：稳定性较差，经常断连
- **frp/nps**：需要自建服务器，增加运维成本
- **Tailscale**：需要所有端安装客户端，不适合 Web 访问

**结论**：Cloudflare Tunnel 是最佳选择，提供免费、稳定、安全的公网暴露能力。

### 6.2 Hono 框架选择

**决策：使用 Hono 作为设备服务的 HTTP 框架**

**选择理由**：
- **轻量高性能**：比 Express 快 3-4 倍，内存占用更低（<25MB）
- **跨运行时**：同时支持 Node.js、Deno、Bun、Cloudflare Workers
- **现代 API**：基于 Web 标准 API，完整的 TypeScript 类型支持
- **中间件生态**：内置常用中间件（CORS、JWT、日志等）
- **零依赖**：核心包无外部依赖，打包体积小

**性能对比**：

| 框架 | 请求/秒 | 内存占用 | 启动时间 | 跨运行时 |
|------|---------|----------|----------|----------|
| Hono | 45,000 | 25MB | 0.5s | ✅ |
| Express | 12,000 | 50MB | 1.2s | ❌ |
| Fastify | 38,000 | 35MB | 0.8s | ❌ |
| Oak (Deno) | 30,000 | 30MB | 0.6s | Deno only |

**实现示例**：

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bearerAuth } from 'hono/bearer-auth';

const app = new Hono();

// 全局中间件
app.use('*', cors());
app.use('*', logger());

// 健康检查（无需认证）
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: Date.now()
}));

// 设备绑定（需要 device_secret）
app.post('/bind', async (c) => {
  const { device_secret, user_id } = await c.req.json();
  // ... 绑定逻辑
  return c.json({ binding_token: '...' });
});

// MCP 代理（需要 binding_token 认证）
app.use('/mcp/*', bearerAuth({
  verifyToken: async (token, c) => {
    const binding = await verifyBindingToken(token);
    if (binding) {
      c.set('binding', binding);
      return true;
    }
    return false;
  }
}));

app.post('/mcp/:service/tools/:tool', async (c) => {
  const { service, tool } = c.req.param();
  const args = await c.req.json();
  const binding = c.get('binding');

  const result = await mcpProxy.callTool(service, tool, args);
  return c.json(result);
});

// 配置管理
app.get('/setting', async (c) => {
  const binding = c.get('binding');
  const config = await getBindingConfig(binding.id);
  return c.json(config);
});

app.post('/setting', async (c) => {
  const binding = c.get('binding');
  const config = await c.req.json();
  await updateBindingConfig(binding.id, config);
  return c.json({ success: true });
});

export default app;
```

**替代方案考虑**：
- **Express**：生态成熟但性能较差，不支持 Deno
- **Fastify**：性能好但 API 较复杂，不支持 Deno
- **Oak (Deno)**：仅支持 Deno，无法在 Node.js 运行

**结论**：Hono 是最佳选择，满足性能、跨平台和开发体验的要求。

### 6.3 设备认证和安全机制

**决策：基于 device_secret + binding_token 的双层认证**

**安全架构**：

```
┌─────────────┐                    ┌──────────────┐
│  Mango Web  │                    │ Local Device │
│   (Agent)   │                    │   Service    │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ 1. 用户访问 /bind 页面            │
       │    输入 device_secret            │
       ├──────────────────────────────────>
       │                                  │
       │ 2. 验证 device_secret            │
       │    创建 binding 记录              │
       │    生成 binding_token            │
       <──────────────────────────────────┤
       │                                  │
       │ 3. Agent 请求 (带 binding_token) │
       ├──────────────────────────────────>
       │                                  │
       │ 4. 验证 binding_token            │
       │    调用本地 MCP 服务              │
       │                                  │
       │ 5. 返回结果                      │
       <──────────────────────────────────┤
```

**实现方案**：

1. **device_secret 生成和存储**：

```typescript
import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

class SecretManager {
  private secretPath: string;

  constructor() {
    // 存储在用户目录下的隐藏文件
    const configDir = join(homedir(), '.mango');
    this.secretPath = join(configDir, 'device_secret');
  }

  getOrCreateSecret(): string {
    if (existsSync(this.secretPath)) {
      return readFileSync(this.secretPath, 'utf-8').trim();
    }

    // 生成 256 位随机密钥
    const secret = randomBytes(32).toString('base64url');

    // 安全存储（仅当前用户可读）
    mkdirSync(dirname(this.secretPath), { recursive: true, mode: 0o700 });
    writeFileSync(this.secretPath, secret, { mode: 0o600 });

    console.log(`Generated device secret: ${secret}`);
    console.log(`Stored at: ${this.secretPath}`);

    return secret;
  }

  getSecret(): string {
    if (!existsSync(this.secretPath)) {
      throw new Error('Device secret not found. Please run the service first.');
    }
    return readFileSync(this.secretPath, 'utf-8').trim();
  }
}
```

2. **设备绑定验证**：

```typescript
// 设备服务端验证
app.post('/bind', async (c) => {
  const { device_secret, user_id } = await c.req.json();

  // 验证 device_secret
  const localSecret = secretManager.getSecret();
  if (device_secret !== localSecret) {
    return c.json({ error: 'Invalid device_secret' }, 401);
  }

  // 生成设备 ID（基于硬件信息）
  const deviceId = await generateDeviceId();

  // 创建或更新设备记录
  const { data: device } = await supabase
    .from('devices')
    .upsert({
      device_id: deviceId,
      platform: process.platform,
      last_seen_at: new Date().toISOString()
    })
    .select()
    .single();

  // 创建绑定记录
  const bindingToken = randomBytes(32).toString('base64url');
  const { data: binding } = await supabase
    .from('device_bindings')
    .insert({
      device_id: device.id,
      user_id: user_id,
      tunnel_url: tunnelUrl,
      binding_token: bindingToken,
      status: 'active'
    })
    .select()
    .single();

  return c.json({
    binding_id: binding.id,
    binding_token: bindingToken,
    tunnel_url: tunnelUrl
  });
});

// Agent 请求验证中间件
app.use('/mcp/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization' }, 401);
  }

  const bindingToken = authHeader.replace('Bearer ', '');

  // 验证 binding_token
  const { data: binding, error } = await supabase
    .from('device_bindings')
    .select('*')
    .eq('binding_token', bindingToken)
    .eq('status', 'active')
    .single();

  if (error || !binding) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // 更新最后访问时间
  await supabase
    .from('device_bindings')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', binding.id);

  c.set('binding', binding);
  await next();
});
```

**安全措施**：
- device_secret 存储在本地文件系统，权限设置为仅当前用户可读（0o600）
- binding_token 用于 API 请求认证，存储在数据库中
- Cloudflare Tunnel 自动提供 HTTPS 加密
- 支持绑定撤销和 token 过期机制
- 设备 ID 基于硬件信息生成，确保唯一性

**结论**：采用双层认证机制，device_secret 用于设备绑定，binding_token 用于 API 请求认证，确保安全性。

### 6.4 跨平台 CLI 工具最佳实践

**决策：使用 Commander.js + TypeScript + pkg 打包**

**CLI 框架选择**：

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('mango')
  .description('Mango CLI - Connect local MCP/ACP services to Mango platform')
  .version('1.0.0');

program
  .command('start')
  .description('Start device service and create tunnel')
  .option('--ignore-open-bind-url', 'Do not open bind URL automatically')
  .option('--app-url <url>', 'Mango Web URL', process.env.MANGO_APP_URL || 'https://app.mango.ai')
  .option('--supabase-url <url>', 'Supabase URL', process.env.SUPABASE_URL)
  .option('--supabase-anon-key <key>', 'Supabase anon key', process.env.SUPABASE_ANON_KEY)
  .option('--device-secret <secret>', 'Device secret (auto-generated if not provided)', process.env.DEVICE_SECRET)
  .option('--port <port>', 'Local service port', '3000')
  .action(async (options) => {
    await startDeviceService(options);
  });

program
  .command('config')
  .description('Manage MCP/ACP service configuration')
  .option('--list', 'List all configured services')
  .option('--add <name>', 'Add a new service')
  .option('--remove <name>', 'Remove a service')
  .action(async (options) => {
    await manageConfig(options);
  });

program
  .command('status')
  .description('Show device service status')
  .action(async () => {
    await showStatus();
  });

program.parse();
```

**用户体验优化**：

```typescript
async function startDeviceService(options: any) {
  console.log(chalk.blue.bold('\n🥭 Mango Device Service\n'));

  // 1. 加载配置
  const spinner = ora('Loading configuration...').start();
  try {
    const config = await loadConfig(options);
    spinner.succeed('Configuration loaded');
  } catch (error) {
    spinner.fail(`Configuration error: ${error.message}`);
    process.exit(1);
  }

  // 2. 生成或加载 device_secret
  spinner.start('Loading device secret...');
  const secret = secretManager.getOrCreateSecret();
  spinner.succeed(`Device secret: ${chalk.yellow(secret.substring(0, 16) + '...')}`);

  // 3. 启动 HTTP 服务
  spinner.start('Starting HTTP server...');
  try {
    await startServer(config);
    spinner.succeed(`Server running on port ${chalk.green(config.port)}`);
  } catch (error) {
    spinner.fail(`Failed to start server: ${error.message}`);
    process.exit(1);
  }

  // 4. 创建 Cloudflare Tunnel
  spinner.start('Creating Cloudflare Tunnel...');
  try {
    const tunnelUrl = await tunnelManager.createTunnel(config.port);
    spinner.succeed(`Tunnel URL: ${chalk.green(tunnelUrl)}`);
  } catch (error) {
    spinner.fail(`Failed to create tunnel: ${error.message}`);
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log('  1. Check if cloudflared is installed: cloudflared --version');
    console.log('  2. Verify network connection');
    console.log('  3. Try running with sudo/admin privileges\n');
    process.exit(1);
  }

  // 5. 显示绑定信息
  console.log(chalk.green('\n✓ Device service is ready!\n'));
  console.log(chalk.bold('Bind URL:'));
  console.log(`  ${chalk.cyan(`${config.appUrl}/devices/bind?secret=${secret}`)}\n`);
  console.log(chalk.dim('Press Ctrl+C to stop the service\n'));

  // 6. 自动打开浏览器
  if (!options.ignoreOpenBindUrl) {
    await open(`${config.appUrl}/devices/bind?secret=${secret}`);
  }
}
```

**环境变量管理**：

```typescript
import { config } from 'dotenv';
import { z } from 'zod';

// 加载 .env 文件
config();

// 配置验证 schema
const configSchema = z.object({
  appUrl: z.string().url(),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  deviceSecret: z.string().optional(),
  port: z.number().int().min(1024).max(65535)
});

export async function loadConfig(options: any) {
  const rawConfig = {
    appUrl: options.appUrl || process.env.MANGO_APP_URL,
    supabaseUrl: options.supabaseUrl || process.env.SUPABASE_URL,
    supabaseAnonKey: options.supabaseAnonKey || process.env.SUPABASE_ANON_KEY,
    deviceSecret: options.deviceSecret || process.env.DEVICE_SECRET,
    port: parseInt(options.port || process.env.PORT || '3000')
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(chalk.red('\nConfiguration validation failed:'));
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.log(chalk.yellow('\nPlease provide missing configuration via:'));
      console.log('  1. Command line options (--supabase-url, --supabase-anon-key)');
      console.log('  2. Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)');
      console.log('  3. .env file in current directory\n');
    }
    throw error;
  }
}
```

**跨平台打包方案**：

```json
{
  "name": "@mango/cli",
  "version": "1.0.0",
  "bin": {
    "mango": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "package": "pkg . --out-path bin",
    "package:all": "pkg . --targets node20-win-x64,node20-macos-x64,node20-macos-arm64,node20-linux-x64 --out-path bin"
  },
  "pkg": {
    "targets": [
      "node20-win-x64",
      "node20-macos-x64",
      "node20-macos-arm64",
      "node20-linux-x64"
    ],
    "outputPath": "bin",
    "assets": [
      "node_modules/cloudflared/**/*"
    ]
  }
}
```

**结论**：使用 Commander.js 构建 CLI，提供友好的用户体验，使用 pkg 打包为跨平台可执行文件。

### 6.5 MCP 服务代理实现

**决策：使用 @modelcontextprotocol/sdk 实现 MCP 客户端**

**实现方案**：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface MCPServiceConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

class MCPProxy {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServiceConfig> = new Map();

  async addService(config: MCPServiceConfig) {
    try {
      // 创建 MCP 客户端
      const client = new Client({
        name: 'mango-device-service',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          resources: {}
        }
      });

      // 创建 stdio 传输层
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...config.env }
      });

      // 连接到 MCP 服务
      await client.connect(transport);

      // 保存客户端和配置
      this.clients.set(config.name, client);
      this.configs.set(config.name, config);

      console.log(`MCP service "${config.name}" connected`);
    } catch (error) {
      console.error(`Failed to connect to MCP service "${config.name}":`, error);
      throw error;
    }
  }

  async removeService(name: string) {
    const client = this.clients.get(name);
    if (client) {
      await client.close();
      this.clients.delete(name);
      this.configs.delete(name);
      console.log(`MCP service "${name}" disconnected`);
    }
  }

  async listTools(serviceName: string) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.listTools();
    return result.tools;
  }

  async callTool(serviceName: string, toolName: string, args: any) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`Tool call failed: ${serviceName}/${toolName}`, error);
      throw error;
    }
  }

  async listResources(serviceName: string) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.listResources();
    return result.resources;
  }

  async readResource(serviceName: string, uri: string) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.readResource({ uri });
    return result;
  }

  getServices() {
    return Array.from(this.configs.values());
  }
}

// 全局单例
export const mcpProxy = new MCPProxy();
```

**HTTP 端点实现**：

```typescript
// 列出所有 MCP 服务
app.get('/mcp/services', async (c) => {
  const services = mcpProxy.getServices();
  return c.json({ services });
});

// 列出服务的工具
app.get('/mcp/:service/tools', async (c) => {
  const { service } = c.req.param();
  try {
    const tools = await mcpProxy.listTools(service);
    return c.json({ tools });
  } catch (error) {
    return c.json({ error: error.message }, 404);
  }
});

// 调用工具
app.post('/mcp/:service/tools/:tool', async (c) => {
  const { service, tool } = c.req.param();
  const args = await c.req.json();

  try {
    const result = await mcpProxy.callTool(service, tool, args);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// 列出资源
app.get('/mcp/:service/resources', async (c) => {
  const { service } = c.req.param();
  try {
    const resources = await mcpProxy.listResources(service);
    return c.json({ resources });
  } catch (error) {
    return c.json({ error: error.message }, 404);
  }
});

// 读取资源
app.get('/mcp/:service/resources/*', async (c) => {
  const { service } = c.req.param();
  const uri = c.req.path.replace(`/mcp/${service}/resources/`, '');

  try {
    const result = await mcpProxy.readResource(service, uri);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 404);
  }
});
```

**结论**：使用官方 MCP SDK，设备服务作为 MCP 客户端连接本地服务，并通过 HTTP 端点暴露给 Agent。

### 6.6 数据库设计

**设备绑定表结构**：

```sql
-- devices 表
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,  -- 设备唯一标识（基于硬件信息生成）
  device_name TEXT,                -- 用户自定义设备名称
  platform TEXT NOT NULL,          -- 操作系统平台 (windows/macos/linux)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- device_bindings 表
CREATE TABLE device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  binding_name TEXT,               -- 用户自定义绑定名称
  tunnel_url TEXT NOT NULL,        -- Cloudflare Tunnel URL
  binding_token TEXT UNIQUE NOT NULL,  -- 用于 API 认证的 token
  status TEXT DEFAULT 'active',    -- active/inactive/expired
  config JSONB DEFAULT '{}',       -- 绑定的配置数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,          -- 可选的过期时间
  UNIQUE(device_id, user_id, binding_name)
);

-- mcp_services 表
CREATE TABLE mcp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id UUID REFERENCES device_bindings(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,      -- MCP 服务名称
  command TEXT NOT NULL,           -- 启动命令
  args JSONB DEFAULT '[]',         -- 命令参数
  env JSONB DEFAULT '{}',          -- 环境变量
  status TEXT DEFAULT 'active',    -- active/inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(binding_id, service_name)
);

-- 索引
CREATE INDEX idx_device_bindings_user ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_token ON device_bindings(binding_token);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);
CREATE INDEX idx_mcp_services_binding ON mcp_services(binding_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);

-- RLS 策略
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_services ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的绑定
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

-- 用户只能访问自己绑定的 MCP 服务
CREATE POLICY "Users can view their own MCP services"
  ON mcp_services FOR SELECT
  USING (
    binding_id IN (
      SELECT id FROM device_bindings WHERE user_id = auth.uid()
    )
  );
```

**设计要点**：
- 设备与用户多对多关系，通过 device_bindings 表实现
- 每个绑定有独立的 tunnel_url 和 binding_token
- 支持绑定级别的配置隔离（config JSONB 字段）
- MCP 服务配置存储在 mcp_services 表，关联到具体绑定
- 使用 RLS 策略确保用户只能访问自己的数据

---

## 7. 技术决策总结

### 6.1 协议支持决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **MCP实现位置** | 后端集中管理 | 安全性、认证控制 |
| **MCP传输方式** | HTTP/SSE（Web端）+ stdio（CLI） | 适配多端场景 |
| **ACP集成方式** | CLI工具 + 子进程 | 隔离性、安全性 |
| **A2A优先级** | P3（未来扩展） | 先满足核心需求 |

### 6.2 实时通信决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **初始化** | Server Component | 更快FCP，减少JS |
| **订阅管理** | Custom Hook | 复用性、管理清晰 |
| **状态管理** | Context（简单）或Zustand（复杂） | 权衡复杂度 |
| **认证方式** | Session Cookie | 防XSS，跨Tab同步 |

### 6.3 沙箱技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **主要沙箱** | iframe沙箱 | 原生支持、平衡性能与安全 |
| **计算密集型** | Web Workers | 无DOM限制、高性能 |
| **通信方式** | postMessage + Promise包装 | 异步安全、请求响应配对 |
| **权限模型** | 声明式 + RBAC | 细粒度控制、易审计 |
| **主动通知** | Service Worker + localStorage事件 | 可靠、跨标签页 |

### 6.4 学习机制决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **反馈类型** | 五星评分 + 标签 | 粒度适中、有解释性 |
| **学习方案** | 提示词 + RAG + 规则库 | 性价比高、隐私优先 |
| **数据存储** | Supabase + RLS | 用户级隔离、安全可控 |
| **用户管理** | 完整CRUD + 透明化 | 满足GDPR/CCPA合规 |

### 6.5 性能目标实现路径

| 目标 | 实现方案 |
|------|---------|
| **首屏加载<2s** | Next.js SSR/SSG + 代码分割 + CDN |
| **交互响应<100ms** | 乐观更新 + 骨架屏 + 状态管理优化 |
| **API响应<500ms (p95)** | Supabase边缘函数 + 连接池 + 索引优化 |
| **支持1000并发** | 3实例Realtime集群 + PostgreSQL HA + 负载均衡 |

---

## 7. 实施阶段规划

### Phase 1: 基础架构（Week 1-2）

**MCP集成**：
- ✅ 后端MCP Client实现
- ✅ Tool Registry
- ✅ 基础认证和权限

**实时通信**：
- ✅ Supabase Realtime订阅
- ✅ useRealtimeSubscription Hook
- ✅ 消息实时同步

**数据库基础**：
- ✅ 核心表结构
- ✅ RLS策略
- ✅ 索引优化

### Phase 2: 核心功能（Week 3-4）

**小应用框架**：
- ✅ iframe沙箱容器
- ✅ 权限系统
- ✅ 消息通信

**反馈系统**：
- ✅ 反馈收集UI
- ✅ feedback_records表
- ✅ 基础规则提取

**ACP集成（可选）**：
- ✅ CLI工具接入
- ✅ 子进程管理

### Phase 3: 优化与扩展（Week 5-6）

**学习系统**：
- ✅ 规则库应用
- ✅ 用户管理中心
- ✅ 隐私合规

**性能优化**：
- ✅ 数据库查询优化
- ✅ 实时订阅防抖
- ✅ 负载测试

**监控告警**：
- ✅ 性能监控
- ✅ 安全审计
- ✅ 错误追踪

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **MCP Server不稳定** | 工具调用失败 | 超时重试、错误降级、备用方案 |
| **实时连接中断** | 消息丢失 | 自动重连、消息队列、增量同步 |
| **沙箱逃逸** | 安全威胁 | 多层隔离、权限最小化、定期审计 |
| **学习规则错误** | 用户体验下降 | 规则可见化、低初始置信度、用户可删除 |
| **并发性能不足** | 系统卡顿 | 负载测试、分片策略、弹性扩容 |

---

## 9. 关键指标

### 技术指标

- **MCP工具调用成功率**：> 99%
- **实时消息延迟 P95**：< 200ms
- **沙箱启动时间**：< 500ms
- **学习规则应用率**：> 80%（第3个月）

### 业务指标

- **用户反馈覆盖率**：> 50%（第3个月）
- **满意度提升**：+20%（基于学习，SC-007）
- **并发支持**：1000用户无明显延迟

### 合规指标

- **GDPR/CCPA合规**：100%
- **数据删除响应**：< 7天
- **隐私审计**：季度一次

---

## 10. 参考资源

### 官方文档
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [ACP Documentation](https://agentclientprotocol.github.io/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Next.js App Router](https://nextjs.org/docs/app)

### 示例实现
- [MCP TypeScript SDK](https://github.com/anthropics/mcp-typescript-sdk)
- [ACP TypeScript SDK](https://github.com/agentclientprotocol/typescript-sdk)
- [Gemini CLI ACP Implementation](https://github.com/google-gemini/gemini-cli)

### 安全与合规
- [GDPR Guidelines](https://gdpr-info.eu/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Best Practices](https://web.dev/secure/)

---

**研究完成日期**: 2025-11-24
**下一步**: Phase 1 - 数据模型设计（data-model.md）

