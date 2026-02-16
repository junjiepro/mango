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

**决策：基于临时绑定码 + Realtime Channel + 正式绑定码的三阶段认证**

**安全架构**：

```
┌─────────────┐                    ┌──────────────┐
│  Mango Web  │                    │ Local Device │
│   (Agent)   │                    │   Service    │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │                                  │ 1. CLI 启动
       │                                  │    生成临时绑定码 (8位)
       │                                  │    创建 Cloudflare Tunnel
       │                                  ├──────────────────────────>
       │                                  │ 2. 调用 API 创建临时绑定码记录
       │                                  │    建立 Realtime Channel
       │                                  │    发送设备 URL 到 Channel
       │                                  │
       │ 3. 用户访问绑定页面              │
       │    输入临时绑定码                │
       │    订阅 Realtime Channel        │
       ├──────────────────────────────────>
       │                                  │
       │ 4. 从 Channel 获取设备 URL       │
       │    进行 health check            │
       <──────────────────────────────────┤
       │                                  │
       │ 5. 用户触发绑定                  │
       │    通过设备 URL 发送绑定请求     │
       ├──────────────────────────────────>
       │                                  │
       │                                  │ 6. 设备生成正式绑定码 (256位)
       │                                  │    保存到本地
       │ 7. 返回绑定码                    │
       <──────────────────────────────────┤
       │                                  │
       │ 8. Mango 记录绑定关系            │
       │    临时绑定码失效                │
       │                                  │
       │ 9. Agent 请求 (带 binding_code)  │
       ├──────────────────────────────────>
       │                                  │
       │ 10. 验证 binding_code            │
       │     调用本地 MCP 服务             │
       │                                  │
       │ 11. 返回结果                     │
       <──────────────────────────────────┤
       │                                  │
       │                                  │ 12. 设备 URL 变更时
       │                                  │     调用 Edge Function
       │                                  │     更新 device_url
       │                                  ├──────────────────────────>
```

**实现方案**：

1. **临时绑定码生成和管理（运行时内存）**：

```typescript
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

class TempBindingManager {
  private supabase: SupabaseClient;
  private tempCode: string | null = null;
  private channel: RealtimeChannel | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 生成临时绑定码（8位随机字符串，仅存在于内存中）
  generateTempCode(): string {
    this.tempCode = randomBytes(4).toString('hex'); // 8位十六进制
    return this.tempCode;
  }

  // 建立 Realtime Channel 并发送设备 URL
  async publishDeviceUrls(deviceUrls: {
    cloudflare_url: string;
    localhost_url: string;
    hostname_url: string;
  }, deviceInfo: any) {
    if (!this.tempCode) {
      throw new Error('Temp code not generated');
    }

    // 建立 Realtime Channel
    this.channel = this.supabase.channel(`binding:${this.tempCode}`);

    // 订阅 Channel
    await this.channel.subscribe();

    // 发送设备 URL 到 Channel
    await this.channel.send({
      type: 'broadcast',
      event: 'device_urls',
      payload: {
        device_urls: deviceUrls,
        device_info: deviceInfo,
        timestamp: Date.now()
      }
    });

    console.log(`Device URLs published to channel: binding:${this.tempCode}`);
  }

  // 清理 Channel（绑定完成后调用）
  async cleanup() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.tempCode = null;
  }

  getTempCode(): string | null {
    return this.tempCode;
  }
}
```

2. **绑定页面订阅和验证**：

```typescript
// Web 端绑定页面
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function BindingPage() {
  const [tempCode, setTempCode] = useState('');
  const [deviceUrls, setDeviceUrls] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [healthCheckStatus, setHealthCheckStatus] = useState('pending');

  useEffect(() => {
    if (!tempCode) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channel = supabase.channel(`binding:${tempCode}`);

    // 订阅 Channel 获取设备 URL
    channel
      .on('broadcast', { event: 'device_urls' }, (payload) => {
        const { device_urls, device_info } = payload.payload;
        setDeviceUrls(device_urls);
        setDeviceInfo(device_info);
        performHealthCheck(device_urls);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tempCode]);

  // 进行 health check
  async function performHealthCheck(urls: any) {
    try {
      // 优先尝试 cloudflare_url
      const response = await fetch(`${urls.cloudflare_url}/health`);
      if (response.ok) {
        setHealthCheckStatus('success');
        return;
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    setHealthCheckStatus('failed');
  }

  // 用户触发绑定
  async function handleBind() {
    if (!deviceUrls || healthCheckStatus !== 'success') return;

    // 通过设备 URL 发送绑定请求
    const response = await fetch(`${deviceUrls.cloudflare_url}/bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUserId,
        binding_name: bindingName
      })
    });

    const { binding_code, device_id } = await response.json();

    // 记录绑定关系到 Mango 数据库
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('device_bindings').insert({
      device_id: device_id,
      user_id: currentUserId,
      binding_name: bindingName,
      device_url: deviceUrls.cloudflare_url,
      binding_code: binding_code,
      status: 'active'
    });

    // 绑定完成，临时绑定码自动失效（CLI 端会关闭 Channel）
    alert('设备绑定成功！');
  }

  return (
    <div>
      <input
        value={tempCode}
        onChange={(e) => setTempCode(e.target.value)}
        placeholder="输入临时绑定码"
      />
      {healthCheckStatus === 'success' && (
        <>
          <div>设备信息: {JSON.stringify(deviceInfo)}</div>
          <input
            value={bindingName}
            onChange={(e) => setBindingName(e.target.value)}
            placeholder="设备别名（如：工作电脑）"
          />
          <button onClick={handleBind}>绑定设备</button>
        </>
      )}
    </div>
  );
}
```

3. **设备端绑定处理**：

```typescript
import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const app = new Hono();

class BindingCodeManager {
  private bindingCodePath: string;

  constructor() {
    const configDir = join(homedir(), '.mango');
    this.bindingCodePath = join(configDir, 'binding_code');
  }

  // 生成并保存正式绑定码
  generateAndSave(): string {
    const bindingCode = randomBytes(32).toString('base64url'); // 256位
    writeFileSync(this.bindingCodePath, bindingCode, { mode: 0o600 });
    return bindingCode;
  }

  // 读取绑定码
  read(): string | null {
    if (!existsSync(this.bindingCodePath)) {
      return null;
    }
    return readFileSync(this.bindingCodePath, 'utf-8').trim();
  }
}

const bindingCodeManager = new BindingCodeManager();

// 绑定端点
app.post('/bind', async (c) => {
  const { user_id, binding_name } = await c.req.json();

  // 生成设备 ID（基于硬件信息）
  const deviceId = await generateDeviceId();

  // 生成并保存正式绑定码
  const bindingCode = bindingCodeManager.generateAndSave();

  // 创建或更新设备记录
  const { data: device } = await supabase
    .from('devices')
    .upsert({
      device_id: deviceId,
      platform: process.platform,
      hostname: os.hostname(),
      last_seen_at: new Date().toISOString()
    })
    .select()
    .single();

  return c.json({
    binding_code: bindingCode,
    device_id: device.id
  });
});

// MCP 代理端点（需要 binding_code 认证）
app.use('/mcp/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization' }, 401);
  }

  const bindingCode = authHeader.replace('Bearer ', '');
  const localBindingCode = bindingCodeManager.read();

  if (!localBindingCode || bindingCode !== localBindingCode) {
    return c.json({ error: 'Invalid binding code' }, 401);
  }

  await next();
});
```

4. **设备 URL 更新机制**：

```typescript
// Supabase Edge Function: update-device-url
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { binding_code, new_device_url } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 验证 binding_code 并更新 device_url
  const { data, error } = await supabase
    .from('device_bindings')
    .update({
      device_url: new_device_url,
      updated_at: new Date().toISOString()
    })
    .eq('binding_code', binding_code)
    .eq('status', 'active')
    .select();

  if (error || !data || data.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid binding code or binding not found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, updated: data[0] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

**安全措施**：
- 临时绑定码仅 8 位，仅存在于 CLI 运行时内存中，不持久化
- 使用 Supabase Realtime Channel 传输设备 URL，避免轮询
- 正式绑定码 256 位，存储在本地文件系统，权限设置为仅当前用户可读（0o600）
- 绑定完成后 CLI 主动关闭 Realtime Channel，临时绑定码自动失效
- Cloudflare Tunnel 自动提供 HTTPS 加密
- 设备 URL 更新通过 Edge Function，需要 binding_code 认证
- 支持绑定撤销和状态管理

**结论**：采用三阶段认证机制，临时绑定码（运行时内存）用于初始连接，Realtime Channel 用于设备发现，正式绑定码用于长期 API 认证，确保安全性和用户体验。

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

## 9. Context Engineering 优化 (User Story 4 增强)

基于 Context Engineering 最佳实践，对 US4 Agent持续学习与改进进行深度优化。

### 9.1 分层记忆架构

**问题诊断**：
当前设计仅有 Layer 3 长期记忆（PostgreSQL），缺少完整的记忆层次结构，导致：
- 学习规则检索效率低
- 缺少会话级偏好缓存
- 无法追踪用户意图实体演变

**优化方案：五层记忆架构**

```
┌─────────────────────────────────────────────────────────────┐
│                    US4 记忆架构                              │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: 工作记忆 (Context Window)                          │
│   - 当前对话的活跃学习规则 (最多 5 条高置信度规则)            │
│   - 实时反馈信号                                            │
│   - 零延迟访问，会话结束即消失                               │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: 短期记忆 (Session Cache)                           │
│   - 会话级用户偏好缓存                                       │
│   - 本次会话的反馈聚合                                       │
│   - Redis/内存缓存，会话结束清理                             │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: 长期记忆 (PostgreSQL)                              │
│   - feedback_records: 原始反馈数据                          │
│   - learning_records: 提取的学习规则                        │
│   - extension_skills: 扩展 Skill                            │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: 实体记忆 (Entity Graph + pgvector)                 │
│   - 用户意图实体 (user_intent)                              │
│   - 工具使用模式 (tool_patterns)                            │
│   - 语义相似度检索                                          │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: 时序知识图谱 (Temporal KG)                         │
│   - 规则有效期 (valid_from, valid_until)                    │
│   - 偏好演变历史                                            │
│   - 时间点查询支持                                          │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 记忆层实现细节

#### Layer 1: 工作记忆管理

```typescript
interface WorkingMemory {
  // 活跃规则（最多5条，按置信度排序）
  activeRules: LearningRule[];
  // 当前反馈信号
  currentFeedback: FeedbackSignal[];
  // Token 预算
  tokenBudget: number;
}

class WorkingMemoryManager {
  private readonly MAX_RULES = 5;
  private readonly TOKEN_BUDGET = 1000;

  async loadActiveRules(userId: string, context: ConversationContext): Promise<LearningRule[]> {
    // 1. 从 Layer 3 检索高置信度规则
    const rules = await this.learningService.getHighConfidenceRules(userId, {
      minConfidence: 0.7,
      limit: this.MAX_RULES * 2
    });

    // 2. 按当前上下文相关性排序
    const ranked = this.rankByRelevance(rules, context);

    // 3. 取 Top-K 并压缩
    return this.compactRules(ranked.slice(0, this.MAX_RULES));
  }
}
```

#### Layer 2: 会话缓存

```typescript
interface SessionPreferenceCache {
  userId: string;
  sessionId: string;
  // 会话内偏好
  preferences: {
    responseStyle: 'concise' | 'detailed' | 'balanced';
    formatPreference: string[];
    recentFeedback: FeedbackSummary;
  };
  // TTL: 会话结束或 30 分钟无活动
  expiresAt: Date;
}
```

#### Layer 4: 实体记忆（新增表）

```sql
CREATE TABLE user_intent_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 实体信息
  intent_name TEXT NOT NULL,
  intent_embedding VECTOR(1536), -- OpenAI text-embedding-3-small

  -- 关联模式
  associated_tools TEXT[] DEFAULT '{}',
  success_patterns JSONB DEFAULT '[]',
  failure_patterns JSONB DEFAULT '[]',

  -- 统计
  occurrence_count INT DEFAULT 1,
  avg_satisfaction FLOAT,

  -- 时序
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, intent_name)
);

-- 向量相似度索引 (pgvector)
CREATE INDEX idx_intent_embedding ON user_intent_entities
  USING ivfflat (intent_embedding vector_cosine_ops)
  WITH (lists = 100);
```

#### Layer 5: 时序有效性扩展

```sql
-- 为 learning_records 添加时序字段
ALTER TABLE learning_records ADD COLUMN IF NOT EXISTS
  valid_from TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE learning_records ADD COLUMN IF NOT EXISTS
  valid_until TIMESTAMPTZ; -- NULL 表示当前有效

-- 时序查询索引
CREATE INDEX idx_learning_temporal ON learning_records(
  user_id, valid_from, valid_until
) WHERE is_active = true;

-- 时序查询函数
CREATE OR REPLACE FUNCTION get_rules_at_time(
  p_user_id UUID,
  p_query_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS SETOF learning_records AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM learning_records
  WHERE user_id = p_user_id
    AND is_active = true
    AND valid_from <= p_query_time
    AND (valid_until IS NULL OR valid_until > p_query_time)
  ORDER BY confidence DESC;
END;
$$ LANGUAGE plpgsql;
```

### 9.3 上下文优化策略

#### 策略 1: 学习规则注入的上下文预算

```typescript
interface LearningContextBudget {
  // 总预算: 2000 tokens (约占 8K 上下文的 25%)
  totalTokens: 2000;

  // 分配策略
  allocation: {
    highConfidenceRules: 1000;  // 置信度 > 0.8 的规则
    mediumConfidenceRules: 600; // 置信度 0.5-0.8
    extensionSkills: 400;       // 扩展 Skill 指导
  };

  // 触发压缩的阈值
  compactionThreshold: 0.8; // 使用率达 80% 时触发压缩
}

class ContextBudgetManager {
  async allocateRules(
    rules: LearningRule[],
    budget: LearningContextBudget
  ): Promise<string> {
    const highConf = rules.filter(r => r.confidence > 0.8);
    const medConf = rules.filter(r => r.confidence >= 0.5 && r.confidence <= 0.8);

    let result = '';
    let usedTokens = 0;

    // 优先注入高置信度规则
    for (const rule of highConf) {
      const ruleText = this.formatRule(rule);
      const tokens = this.countTokens(ruleText);

      if (usedTokens + tokens <= budget.allocation.highConfidenceRules) {
        result += ruleText + '\n';
        usedTokens += tokens;
      }
    }

    // 剩余预算分配给中置信度规则
    // ...

    return result;
  }
}
```

#### 策略 2: 规则压缩算法

```typescript
function compactLearningRules(rules: LearningRule[]): string {
  // 1. 按置信度降序排序
  const sorted = [...rules].sort((a, b) => b.confidence - a.confidence);

  // 2. 取 Top-5 规则
  const topK = sorted.slice(0, 5);

  // 3. 生成紧凑摘要格式
  const compacted = topK.map(rule => {
    const type = rule.record_type.toUpperCase();
    const condition = summarizeCondition(rule.rule_content.condition);
    const action = summarizeAction(rule.rule_content.action);
    const conf = Math.round(rule.confidence * 100);

    return `[${type}|${conf}%] ${condition} → ${action}`;
  });

  return compacted.join('\n');
}

// 示例输出:
// [FORMAT|92%] 用户请求代码 → 使用 markdown 代码块
// [ACCURACY|87%] 数据分析任务 → 先确认数据范围
// [PREFERENCE|85%] 回复风格 → 简洁直接，避免冗余
```

#### 策略 3: KV-Cache 友好的提示词结构

```typescript
function buildCacheFriendlyPrompt(
  systemPrompt: string,
  toolDefinitions: string,
  learningRules: string,
  conversationHistory: Message[],
  currentMessage: string
): string {
  // 稳定内容放前面（可被 KV-Cache 缓存）
  const stablePrefix = [
    systemPrompt,           // 永不变
    toolDefinitions,        // 很少变
  ].join('\n\n');

  // 半稳定内容（会话级稳定）
  const semiStable = [
    '## 用户学习偏好',
    learningRules,          // 按置信度排序，高置信度在前
  ].join('\n');

  // 动态内容放最后
  const dynamic = [
    '## 对话历史',
    formatHistory(conversationHistory),
    '## 当前消息',
    currentMessage
  ].join('\n');

  return [stablePrefix, semiStable, dynamic].join('\n\n---\n\n');
}
```

### 9.4 性能基准与目标

基于 Deep Memory Retrieval (DMR) Benchmark 的行业数据：

| 记忆系统 | DMR 准确率 | 检索延迟 | 备注 |
|----------|-----------|----------|------|
| Zep (Temporal KG) | 94.8% | 2.58s | 行业最佳 |
| MemGPT | 93.4% | Variable | 通用性能好 |
| GraphRAG | ~75-85% | Variable | 比基线 RAG 提升 20-35% |
| Vector RAG | ~60-70% | Fast | 丢失关系结构 |
| 递归摘要 | 35.3% | Low | 严重信息丢失 |

**Mango US4 目标**：

| 指标 | 当前预期 | 优化后目标 | 达成策略 |
|------|---------|-----------|----------|
| 规则检索准确率 | ~65% | 85%+ | 实体记忆 + 时序 KG |
| 检索延迟 P95 | 未知 | <500ms | 分层缓存 + 索引优化 |
| 上下文利用率 | 未优化 | <70% | 预算管理 + 压缩 |
| 规则应用准确率 | 未知 | 80%+ | 置信度过滤 + A/B 测试 |
| Token 成本降低 | 基线 | -40% | 压缩 + KV-Cache |

### 9.5 扩展 Skill 生成优化

基于 research-us4-extension.md 的设计，增加 Context Engineering 优化：

```typescript
class OptimizedExtensionSkillGenerator {
  // 使用实体记忆进行意图聚类
  async generateExtensionSkills(
    feedbacks: FeedbackRecord[],
    threshold: number = 5
  ): Promise<Skill[]> {
    // 1. 提取意图实体
    const intents = await this.extractIntentEntities(feedbacks);

    // 2. 使用向量相似度聚类（而非简单字符串匹配）
    const clusters = await this.semanticCluster(intents, {
      similarityThreshold: 0.85,
      minClusterSize: threshold
    });

    // 3. 为每个聚类生成 Skill
    const skills: Skill[] = [];
    for (const cluster of clusters) {
      // 4. 添加时序有效性
      const skill = await this.createSkillWithValidity(cluster, {
        validFrom: new Date(),
        // 默认 30 天有效期，可根据反馈延长
        validUntil: addDays(new Date(), 30)
      });
      skills.push(skill);
    }

    return skills;
  }

  // 语义聚类（使用 pgvector）
  private async semanticCluster(
    intents: IntentEntity[],
    options: ClusterOptions
  ): Promise<IntentCluster[]> {
    // 使用 DBSCAN 或 K-Means 在向量空间聚类
    const embeddings = intents.map(i => i.embedding);
    return await this.vectorCluster(embeddings, options);
  }
}
```

### 9.6 记忆整合与清理

```typescript
interface MemoryConsolidationConfig {
  // 触发条件
  triggers: {
    memoryCount: 1000;      // 记忆数量超过阈值
    outdatedRatio: 0.3;     // 过时记忆比例超过 30%
    scheduleInterval: '7d'; // 每周定期整合
  };

  // 整合策略
  strategies: {
    mergeRelated: true;     // 合并相关记忆
    archiveOutdated: true;  // 归档过时记忆
    updateValidity: true;   // 更新有效期
    rebuildIndexes: true;   // 重建索引
  };
}

class MemoryConsolidator {
  async consolidate(userId: string): Promise<ConsolidationResult> {
    // 1. 识别过时规则
    const outdated = await this.findOutdatedRules(userId);

    // 2. 合并相似规则
    const merged = await this.mergeRelatedRules(userId);

    // 3. 更新有效期
    await this.updateValidityPeriods(userId);

    // 4. 归档或删除
    await this.archiveOrDelete(outdated);

    // 5. 重建索引
    await this.rebuildIndexes(userId);

    return { outdatedCount: outdated.length, mergedCount: merged.length };
  }
}
```

---

## 10. 关键指标

### 技术指标

- **MCP工具调用成功率**：> 99%
- **实时消息延迟 P95**：< 200ms
- **沙箱启动时间**：< 500ms
- **学习规则应用率**：> 80%（第3个月）
- **学习规则检索准确率**：> 85%（优化后）
- **上下文利用率**：< 70%

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

---

## 8. A2UI v0.8 协议深度研究 (User Story 5)

### 8.1 A2UI v0.8 核心架构

**官方规范来源**: [Google A2UI v0.8 Specification](https://github.com/google/A2UI/blob/main/specification/0.8/docs/a2ui_protocol.md)

**设计哲学**:
A2UI (Agent to UI) 协议是一个基于 JSONL 的流式 UI 协议，专为 LLM 生成用户界面而设计。其核心哲学是：

1. **LLM 友好**: 声明式、扁平化的组件列表（邻接表模型），易于 LLM 逐步生成
2. **流式渲染**: 通过 JSONL over SSE 实现渐进式渲染，提升感知性能
3. **平台无关**: 抽象组件定义，客户端负责映射到原生组件
4. **数据与结构分离**: UI 结构和数据模型独立管理，高效更新

**三层解耦架构**:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Component Tree (UI 结构)                       │
│ - 服务端通过 surfaceUpdate 消息定义                      │
│ - 使用邻接表模型（ID 引用）                               │
│ - 扁平化列表，易于 LLM 生成                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Data Model (动态数据)                          │
│ - 服务端通过 dataModelUpdate 消息管理                    │
│ - JSON 对象存储动态值                                    │
│ - 通过数据绑定填充 UI                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Widget Registry (组件实现)                     │
│ - 客户端定义的组件映射                                   │
│ - 将抽象组件类型映射到原生组件                            │
│ - 通过 Catalog 协商确定可用组件                          │
└─────────────────────────────────────────────────────────┘
```

### 8.2 核心消息类型详解

A2UI v0.8 定义了 4 种服务端到客户端的消息类型：

#### 1. surfaceUpdate - 组件定义

```json
{
  "surfaceUpdate": {
    "surfaceId": "main_content",
    "components": [
      {
        "id": "button_1",
        "component": {
          "Button": {
            "label": {"literalString": "Click Me"},
            "action": {"name": "submit_form"}
          }
        }
      }
    ]
  }
}
```

**关键特性**:
- 扁平化组件列表（非嵌套树）
- 每个组件有唯一 ID
- 组件类型作为对象键（如 "Button"）
- 支持增量更新（发送新组件或更新现有组件）

#### 2. dataModelUpdate - 数据更新

```json
{
  "dataModelUpdate": {
    "surfaceId": "main_content",
    "contents": {
      "userName": "Alice",
      "score": 95,
      "items": [1, 2, 3]
    }
  }
}
```

**关键特性**:
- 每个 Surface 有独立的数据模型
- 支持部分更新（只发送变更的数据）
- 避免重新发送整个 UI 结构

#### 3. beginRendering - 渲染触发

```json
{
  "beginRendering": {
    "surfaceId": "main_content",
    "root": "root_component_id",
    "catalogId": "https://github.com/google/A2UI/blob/main/specification/0.8/json/standard_catalog_definition.json"
  }
}
```

**关键特性**:
- 防止"不完整内容闪烁"
- 客户端缓冲组件直到收到此消息
- 指定根组件 ID 和使用的 Catalog

**示例: Agent 生成表单**:

```json
{
  "id": "user-feedback-form",
  "type": "form",
  "props": {
    "title": "用户反馈",
    "description": "请填写您的反馈信息"
  },
  "children": [
    {
      "id": "rating",
      "type": "select",
      "props": {
        "label": "满意度",
        "options": [
          { "value": 5, "label": "非常满意" },
          { "value": 4, "label": "满意" },
          { "value": 3, "label": "一般" },
          { "value": 2, "label": "不满意" },
          { "value": 1, "label": "非常不满意" }
        ],
        "required": true
      }
    },
    {
      "id": "comment",
      "type": "input",
      "props": {
        "label": "详细说明",
        "placeholder": "请描述您的反馈...",
        "multiline": true,
        "rows": 4
      }
    },
    {
      "id": "submit-btn",
      "type": "button",
      "props": {
        "label": "提交反馈",
        "variant": "primary"
      },
      "events": [
        {
          "event": "onClick",
          "action": "submit",
          "payload": { "formId": "user-feedback-form" }
        }
      ]
    }
  ]
}
```

### 8.2 图表组件集成

**决策: 使用 Recharts 作为主要图表库**

**选择理由**:
- **React 原生**: 基于 React 组件,与项目技术栈一致
- **声明式 API**: 易于从 JSON 生成
- **响应式**: 自动适配容器尺寸
- **可定制**: 支持丰富的样式和交互
- **轻量**: 相比 Chart.js 更轻量 (~100KB gzipped)

**性能对比**:

| 图表库 | 包大小 | React 集成 | 声明式 API | 动画性能 | 推荐度 |
|--------|--------|-----------|-----------|---------|--------|
| **Recharts** | 100KB | ✅ 原生 | ✅ 优秀 | 良好 | ⭐⭐⭐⭐⭐ |
| Chart.js | 180KB | ⚠️ 需封装 | ❌ 命令式 | 优秀 | ⭐⭐⭐⭐ |
| D3.js | 250KB+ | ⚠️ 需封装 | ❌ 命令式 | 优秀 | ⭐⭐⭐ |
| Victory | 150KB | ✅ 原生 | ✅ 优秀 | 良好 | ⭐⭐⭐⭐ |

**A2UI 图表示例**:

```json
{
  "id": "sales-chart",
  "type": "chart",
  "props": {
    "chartType": "line",
    "title": "月度销售趋势",
    "data": [
      { "month": "1月", "sales": 4000, "target": 3500 },
      { "month": "2月", "sales": 3000, "target": 3500 },
      { "month": "3月", "sales": 5000, "target": 4000 }
    ],
    "xAxis": { "dataKey": "month" },
    "yAxis": { "label": "销售额 (元)" },
    "series": [
      { "dataKey": "sales", "name": "实际销售", "color": "#8884d8" },
      { "dataKey": "target", "name": "目标", "color": "#82ca9d" }
    ],
    "legend": true,
    "tooltip": true,
    "responsive": true
  }
}
```

### 8.3 A2UI 渲染器实现

**核心架构**:

```typescript
// A2UIRenderer.tsx
import React from 'react';
import { FormComponent } from './components/FormComponent';
import { ChartComponent } from './components/ChartComponent';
import { ButtonComponent } from './components/ButtonComponent';
// ... 其他组件

const COMPONENT_MAP = {
  form: FormComponent,
  input: InputComponent,
  select: SelectComponent,
  button: ButtonComponent,
  chart: ChartComponent,
  table: TableComponent,
  card: CardComponent,
  tabs: TabsComponent,
  list: ListComponent,
  grid: GridComponent,
};

interface A2UIRendererProps {
  schema: A2UIComponent;
  onEvent?: (event: A2UIEvent) => void;
}

export function A2UIRenderer({ schema, onEvent }: A2UIRendererProps) {
  const Component = COMPONENT_MAP[schema.type];

  if (!Component) {
    console.error(`Unknown component type: ${schema.type}`);
    return null;
  }

  const handleEvent = (eventName: string, data: any) => {
    const handler = schema.events?.find(e => e.event === eventName);
    if (handler && onEvent) {
      onEvent({
        componentId: schema.id,
        action: handler.action,
        payload: { ...handler.payload, ...data }
      });
    }
  };

  return (
    <Component
      {...schema.props}
      onEvent={handleEvent}
    >
      {schema.children?.map(child => (
        <A2UIRenderer
          key={child.id}
          schema={child}
          onEvent={onEvent}
        />
      ))}
    </Component>
  );
}
```

**安全措施**:
- ✅ 白名单组件类型,拒绝未知类型
- ✅ Props 验证,防止注入攻击
- ✅ 事件沙箱,限制可执行的动作
- ✅ 数据大小限制,防止 DoS

**结论**: A2UI 采用 JSON Schema + 动态渲染方案,使用 Recharts 作为图表库,确保安全性和灵活性。

---

## 9. Monaco Editor 集成研究 (User Story 5)

### 9.1 Monaco Editor 技术选型

**决策: 使用 @monaco-editor/react 封装**

**选择理由**:
- **官方支持**: 由 Monaco Editor 团队维护
- **React 集成**: 提供 React 组件封装
- **按需加载**: 支持懒加载,减少首屏体积
- **完整功能**: 支持语法高亮、代码补全、Diff 视图等
- **性能优化**: 内置虚拟滚动和增量渲染

**性能对比**:

| 编辑器 | 包大小 | 加载时间 | 功能完整度 | React 集成 | 推荐度 |
|--------|--------|---------|-----------|-----------|--------|
| **Monaco Editor** | 2.5MB | 1-2s | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
| CodeMirror 6 | 800KB | 0.5s | ⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐⭐ |
| Ace Editor | 1.2MB | 0.8s | ⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐ |

### 9.2 文件浏览器实现

**架构设计**:

```typescript
// FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { FileTree } from './FileTree';
import { useDeviceFiles } from '@/hooks/useDeviceFiles';

interface FileExplorerProps {
  deviceId: string;
  bindingCode: string;
}

export function FileExplorer({ deviceId, bindingCode }: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');

  const { fileTree, loading, error } = useDeviceFiles(deviceId, bindingCode);

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);

    // 通过设备 API 读取文件内容
    const response = await fetch(
      `${deviceUrl}/files/read?path=${encodeURIComponent(filePath)}`,
      {
        headers: {
          'Authorization': `Bearer ${bindingCode}`
        }
      }
    );

    const data = await response.json();
    setFileContent(data.content);
    setLanguage(detectLanguage(filePath));
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    await fetch(
      `${deviceUrl}/files/write?path=${encodeURIComponent(selectedFile)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bindingCode}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: fileContent })
      }
    );
  };

  return (
    <div className="flex h-full">
      {/* 文件树 */}
      <div className="w-64 border-r overflow-auto">
        <FileTree
          tree={fileTree}
          onSelect={handleFileSelect}
          selectedPath={selectedFile}
        />
      </div>

      {/* 编辑器 */}
      <div className="flex-1 flex flex-col">
        {selectedFile && (
          <>
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-sm font-medium">{selectedFile}</span>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                保存
              </button>
            </div>
            <Editor
              height="100%"
              language={language}
              value={fileContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

### 9.3 性能优化策略

**懒加载 Monaco Editor**:

```typescript
// 使用 React.lazy 懒加载
const FileExplorer = React.lazy(() => import('./FileExplorer'));

// 在工作区中使用
<Suspense fallback={<LoadingSpinner />}>
  <FileExplorer deviceId={deviceId} bindingCode={bindingCode} />
</Suspense>
```

**虚拟文件树**:

```typescript
// 使用 react-window 实现虚拟滚动
import { FixedSizeList } from 'react-window';

function FileTree({ tree, onSelect }: FileTreeProps) {
  const flattenedTree = useMemo(() => flattenTree(tree), [tree]);

  return (
    <FixedSizeList
      height={600}
      itemCount={flattenedTree.length}
      itemSize={32}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <FileTreeItem
            item={flattenedTree[index]}
            onSelect={onSelect}
          />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**增量加载文件树**:

```typescript
// 仅加载当前目录,展开时再加载子目录
async function loadDirectory(path: string) {
  const response = await fetch(
    `${deviceUrl}/files/list?path=${encodeURIComponent(path)}&depth=1`,
    {
      headers: { 'Authorization': `Bearer ${bindingCode}` }
    }
  );
  return response.json();
}
```

**结论**: 使用 Monaco Editor + 懒加载 + 虚拟滚动,确保大型文件系统的流畅体验。

### 9.4 Git 集成方案

**决策: 使用 isomorphic-git + Monaco Editor Diff Editor**

**技术选型**:

| Git 库 | 运行环境 | 包大小 | 功能完整度 | 推荐度 |
|--------|---------|--------|-----------|--------|
| **isomorphic-git** | Browser + Node.js | 200KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| simple-git | Node.js only | 50KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| nodegit | Node.js only | 5MB | ⭐⭐⭐⭐⭐ | ⭐⭐ |

**选择理由**:
- ✅ 纯 JavaScript 实现，可在浏览器和 Node.js 运行
- ✅ 支持常用 Git 操作（status, diff, commit, push, pull）
- ✅ 与设备服务架构兼容（通过 HTTP API 代理）
- ✅ 轻量级，性能良好

**核心功能**:

```typescript
// Git 操作接口
interface GitOperations {
  // 仓库状态
  status(path: string): Promise<GitStatus>;

  // 文件差异
  diff(path: string, file: string): Promise<GitDiff>;

  // 提交历史
  log(path: string, options?: LogOptions): Promise<GitCommit[]>;

  // 分支管理
  branches(path: string): Promise<GitBranch[]>;
  currentBranch(path: string): Promise<string>;
  checkout(path: string, branch: string): Promise<void>;
  createBranch(path: string, name: string): Promise<void>;

  // 暂存与提交
  add(path: string, files: string[]): Promise<void>;
  commit(path: string, message: string): Promise<string>;

  // 远程操作
  push(path: string, remote: string, branch: string): Promise<void>;
  pull(path: string, remote: string, branch: string): Promise<void>;
}
```

### 9.5 Monaco Editor Git 装饰器

**实现方案**:

```typescript
// GitDecorator.ts
import * as monaco from 'monaco-editor';

interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'conflicted';
  staged: boolean;
}

class GitDecorator {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private decorations: string[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  async updateDecorations(filePath: string, gitStatus: GitFileStatus) {
    const model = this.editor.getModel();
    if (!model) return;

    // 获取文件差异
    const diff = await this.getFileDiff(filePath);

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // 标记修改的行
    diff.changes.forEach(change => {
      if (change.type === 'insert') {
        newDecorations.push({
          range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'git-line-added',
            glyphMarginClassName: 'git-glyph-added',
            glyphMarginHoverMessage: { value: 'Added line' }
          }
        });
      } else if (change.type === 'delete') {
        newDecorations.push({
          range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'git-line-deleted',
            glyphMarginClassName: 'git-glyph-deleted',
            glyphMarginHoverMessage: { value: 'Deleted line' }
          }
        });
      } else if (change.type === 'modify') {
        newDecorations.push({
          range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'git-line-modified',
            glyphMarginClassName: 'git-glyph-modified',
            glyphMarginHoverMessage: { value: 'Modified line' }
          }
        });
      }
    });

    // 应用装饰器
    this.decorations = this.editor.deltaDecorations(
      this.decorations,
      newDecorations
    );
  }

  private async getFileDiff(filePath: string): Promise<GitDiff> {
    // 通过设备 API 获取文件差异
    const response = await fetch(
      `${deviceUrl}/git/diff?path=${encodeURIComponent(filePath)}`,
      {
        headers: { 'Authorization': `Bearer ${bindingCode}` }
      }
    );
    return response.json();
  }
}
```

### 9.6 Git UI 组件设计

**Source Control 面板**:

```typescript
// GitPanel.tsx
import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitFileIcon } from '@/components/icons';

interface GitPanelProps {
  deviceId: string;
  bindingCode: string;
  repositoryPath: string;
}

export function GitPanel({ deviceId, bindingCode, repositoryPath }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    loadGitStatus();
    loadBranches();
  }, [repositoryPath]);

  const loadGitStatus = async () => {
    const response = await fetch(
      `${deviceUrl}/git/status?path=${encodeURIComponent(repositoryPath)}`,
      { headers: { 'Authorization': `Bearer ${bindingCode}` } }
    );
    const data = await response.json();
    setStatus(data);
  };

  const handleStageFile = async (file: string) => {
    await fetch(`${deviceUrl}/git/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bindingCode}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: repositoryPath, files: [file] })
    });
    loadGitStatus();
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;

    await fetch(`${deviceUrl}/git/commit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bindingCode}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: repositoryPath,
        message: commitMessage
      })
    });

    setCommitMessage('');
    loadGitStatus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 分支选择器 */}
      <div className="p-2 border-b">
        <select
          value={currentBranch}
          onChange={(e) => handleCheckout(e.target.value)}
          className="w-full px-2 py-1 border rounded"
        >
          {branches.map(branch => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* 更改列表 */}
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <h3 className="text-sm font-medium mb-2">Changes</h3>
          {status?.modified.map(file => (
            <div key={file} className="flex items-center gap-2 py-1">
              <GitFileIcon status="modified" />
              <span className="flex-1 text-sm">{file}</span>
              <button
                onClick={() => handleStageFile(file)}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
              >
                Stage
              </button>
            </div>
          ))}
        </div>

        <div className="p-2">
          <h3 className="text-sm font-medium mb-2">Staged Changes</h3>
          {status?.staged.map(file => (
            <div key={file} className="flex items-center gap-2 py-1">
              <GitFileIcon status="staged" />
              <span className="text-sm">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 提交区域 */}
      <div className="p-2 border-t">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          className="w-full px-2 py-1 border rounded mb-2"
          rows={3}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || !status?.staged.length}
          className="w-full px-3 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Commit
        </button>
      </div>
    </div>
  );
}
```

### 9.7 设备端 Git API 实现

**使用 simple-git 在设备服务中实现**:

```typescript
// device-service/src/git/git-service.ts
import simpleGit, { SimpleGit } from 'simple-git';
import { Hono } from 'hono';

const app = new Hono();

// Git 状态
app.get('/git/status', async (c) => {
  const { path } = c.req.query();
  const git: SimpleGit = simpleGit(path);

  const status = await git.status();

  return c.json({
    current: status.current,
    modified: status.modified,
    created: status.created,
    deleted: status.deleted,
    renamed: status.renamed,
    staged: status.staged,
    conflicted: status.conflicted,
    ahead: status.ahead,
    behind: status.behind
  });
});

// 文件差异
app.get('/git/diff', async (c) => {
  const { path, file } = c.req.query();
  const git: SimpleGit = simpleGit(path);

  const diff = await git.diff(['--', file]);

  return c.json({ diff });
});

// 暂存文件
app.post('/git/add', async (c) => {
  const { path, files } = await c.req.json();
  const git: SimpleGit = simpleGit(path);

  await git.add(files);

  return c.json({ success: true });
});

// 提交
app.post('/git/commit', async (c) => {
  const { path, message } = await c.req.json();
  const git: SimpleGit = simpleGit(path);

  const result = await git.commit(message);

  return c.json({
    commit: result.commit,
    summary: result.summary
  });
});

export default app;
```

**结论**: 使用 isomorphic-git（前端）+ simple-git（设备端）+ Monaco Editor Diff，提供完整的 Git 集成体验。

---

## 10. 资源嗅探技术研究 (User Story 5)

### 10.1 资源检测策略

**决策: 基于正则表达式 + 内容分析的混合检测**

**检测目标**:
- **文件**: 附件、图片、文档、代码文件
- **链接**: HTTP/HTTPS URL、邮箱、电话
- **小应用**: Agent 创建的 MiniApp 引用
- **代码块**: Markdown 代码块、内联代码
- **媒体**: 图片、视频、音频

**检测器实现**:

```typescript
// resource-detector.ts
interface DetectedResource {
  id: string;
  type: ResourceType;
  content: string;
  metadata: Record<string, any>;
  position: { start: number; end: number };
}

type ResourceType = 'file' | 'link' | 'miniapp' | 'code' | 'image' | 'video' | 'audio';

class ResourceDetector {
  private detectors: Map<ResourceType, RegExp[]> = new Map([
    ['link', [
      /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
      /www\.[^\s<>"{}|\\^`\[\]]+/gi,
    ]],
    ['file', [
      /\[([^\]]+)\]\(file:\/\/([^\)]+)\)/gi,
      /attachment:\/\/([a-zA-Z0-9-_]+)/gi,
    ]],
    ['miniapp', [
      /miniapp:\/\/([a-zA-Z0-9-_]+)/gi,
    ]],
    ['image', [
      /!\[([^\]]*)\]\(([^\)]+)\)/gi,
      /\.(jpg|jpeg|png|gif|webp|svg)$/i,
    ]],
  ]);

  detect(content: string): DetectedResource[] {
    const resources: DetectedResource[] = [];

    for (const [type, patterns] of this.detectors) {
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          resources.push({
            id: generateId(),
            type,
            content: match[0],
            metadata: this.extractMetadata(type, match),
            position: {
              start: match.index!,
              end: match.index! + match[0].length,
            },
          });
        }
      }
    }

    return this.deduplicateResources(resources);
  }

  private extractMetadata(type: ResourceType, match: RegExpMatchArray): Record<string, any> {
    switch (type) {
      case 'link':
        return {
          url: match[0],
          domain: new URL(match[0]).hostname,
        };
      case 'file':
        return {
          filename: match[1] || 'unknown',
          path: match[2],
        };
      case 'miniapp':
        return {
          appId: match[1],
        };
      case 'image':
        return {
          alt: match[1] || '',
          src: match[2],
        };
      default:
        return {};
    }
  }

  private deduplicateResources(resources: DetectedResource[]): DetectedResource[] {
    const seen = new Set<string>();
    return resources.filter(resource => {
      const key = `${resource.type}:${resource.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
```

### 10.2 实时嗅探 Hook

**useResourceSniffer Hook**:

```typescript
// useResourceSniffer.ts
import { useEffect, useState, useCallback } from 'react';
import { ResourceDetector } from '@/lib/resource-detector';

interface UseResourceSnifferOptions {
  conversationId: string;
  enabled?: boolean;
}

export function useResourceSniffer({ conversationId, enabled = true }: UseResourceSnifferOptions) {
  const [resources, setResources] = useState<DetectedResource[]>([]);
  const [detector] = useState(() => new ResourceDetector());

  const sniffMessage = useCallback((message: Message) => {
    if (!enabled) return;

    const detected = detector.detect(message.content);

    setResources(prev => {
      const newResources = [...prev];
      for (const resource of detected) {
        // 避免重复添加
        if (!newResources.some(r => r.content === resource.content && r.type === resource.type)) {
          newResources.push({
            ...resource,
            messageId: message.id,
            timestamp: message.created_at,
          });
        }
      }
      return newResources;
    });

    // 持久化到数据库
    saveResourcesToDatabase(conversationId, detected);
  }, [conversationId, detector, enabled]);

  return {
    resources,
    sniffMessage,
    clearResources: () => setResources([]),
  };
}
```

### 10.3 资源面板组件

**ResourcePanel 实现**:

```typescript
// ResourcePanel.tsx
import React, { useMemo } from 'react';
import { FileIcon, LinkIcon, AppIcon, ImageIcon } from '@/components/icons';

interface ResourcePanelProps {
  resources: DetectedResource[];
  onResourceClick: (resource: DetectedResource) => void;
}

export function ResourcePanel({ resources, onResourceClick }: ResourcePanelProps) {
  const groupedResources = useMemo(() => {
    return resources.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<ResourceType, DetectedResource[]>);
  }, [resources]);

  const resourceIcons = {
    file: FileIcon,
    link: LinkIcon,
    miniapp: AppIcon,
    image: ImageIcon,
  };

  return (
    <div className="border-t bg-gray-50 p-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">资源</span>
        <span className="text-xs text-gray-500">({resources.length})</span>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {Object.entries(groupedResources).map(([type, items]) => {
          const Icon = resourceIcons[type as ResourceType];
          return (
            <div key={type} className="flex gap-1">
              {items.map(resource => (
                <button
                  key={resource.id}
                  onClick={() => onResourceClick(resource)}
                  className="flex items-center gap-1 px-2 py-1 bg-white border rounded hover:bg-gray-100 transition-colors"
                  title={resource.content}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs truncate max-w-[100px]">
                    {resource.metadata.filename || resource.metadata.domain || resource.content}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**结论**: 资源嗅探采用正则表达式检测 + 实时 Hook + 分组展示,确保准确率和用户体验。

---

## 11. 工作区设计模式研究 (User Story 5)

### 11.1 布局模式选择

**决策: 可调整分割面板 (Resizable Split Panel)**

**常见布局模式对比**:

| 模式 | 优点 | 缺点 | 适用场景 | 推荐度 |
|------|------|------|---------|--------|
| **分割面板** | 灵活、空间利用高 | 实现复杂 | 开发工具、IDE | ⭐⭐⭐⭐⭐ |
| 抽屉模式 | 简单、不占空间 | 遮挡内容 | 移动端、简单工具 | ⭐⭐⭐ |
| 标签页切换 | 清晰、易实现 | 无法同时查看 | 设置页面 | ⭐⭐⭐ |
| 浮动窗口 | 最灵活 | 管理复杂 | 高级用户 | ⭐⭐ |

**选择理由**:
- ✅ 用户可同时查看对话和工作区
- ✅ 灵活调整比例适应不同任务
- ✅ 符合 IDE 和开发工具的使用习惯
- ✅ 支持响应式设计（小屏幕切换为全屏模式）

### 11.2 响应式布局策略

**断点设计**:

```typescript
const BREAKPOINTS = {
  mobile: 0,      // 0-767px: 全屏模式
  tablet: 768,    // 768-1023px: 垂直分割
  desktop: 1024,  // 1024px+: 水平分割
};

// 布局配置
const LAYOUT_CONFIG = {
  mobile: {
    mode: 'fullscreen',
    workspacePosition: 'overlay',
    defaultWorkspaceOpen: false,
  },
  tablet: {
    mode: 'split',
    direction: 'vertical',
    defaultRatio: 0.5,
    minChatHeight: 200,
    minWorkspaceHeight: 300,
  },
  desktop: {
    mode: 'split',
    direction: 'horizontal',
    defaultRatio: 0.6,
    minChatWidth: 400,
    minWorkspaceWidth: 300,
  },
};
```

**实现方案**:

```typescript
// useWorkspaceLayout.ts
import { useState, useEffect } from 'react';

export function useWorkspaceLayout() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.tablet) {
        setBreakpoint('mobile');
      } else if (width < BREAKPOINTS.desktop) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const config = LAYOUT_CONFIG[breakpoint];

  return {
    breakpoint,
    config,
    isWorkspaceOpen,
    setIsWorkspaceOpen,
    splitRatio,
    setSplitRatio,
  };
}
```

### 11.3 分割面板实现

**使用 react-resizable-panels 库**:

```typescript
// Workspace.tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export function Workspace() {
  const { breakpoint, config, isWorkspaceOpen } = useWorkspaceLayout();

  if (breakpoint === 'mobile') {
    return (
      <div className="h-full">
        {!isWorkspaceOpen ? (
          <ChatArea />
        ) : (
          <WorkspaceArea onClose={() => setIsWorkspaceOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <PanelGroup direction={config.direction}>
      <Panel defaultSize={config.defaultRatio * 100} minSize={30}>
        <ChatArea />
      </Panel>

      {isWorkspaceOpen && (
        <>
          <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors" />
          <Panel minSize={20}>
            <WorkspaceArea />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
```

**结论**: 采用分割面板布局 + 响应式设计,确保不同设备上的良好体验。

---

## 12. 终端集成研究 (User Story 5)

### 12.1 终端模拟器选择

**决策: 使用 xterm.js + xterm-addon-fit**

**技术对比**:

| 终端库 | 包大小 | 功能完整度 | 性能 | 生态 | 推荐度 |
|--------|--------|-----------|------|------|--------|
| **xterm.js** | 200KB | ⭐⭐⭐⭐⭐ | 优秀 | 丰富 | ⭐⭐⭐⭐⭐ |
| node-pty | 需后端 | ⭐⭐⭐⭐⭐ | 优秀 | 中等 | ⭐⭐⭐⭐ |
| term.js | 50KB | ⭐⭐⭐ | 良好 | 较少 | ⭐⭐⭐ |

**选择理由**:
- ✅ VS Code 使用的终端库，成熟稳定
- ✅ 完整的 ANSI 转义序列支持
- ✅ 丰富的插件生态（fit、webgl、search 等）
- ✅ 性能优秀，支持大量输出
- ✅ 活跃维护，社区支持好

### 12.2 WebSocket 通信架构

**架构设计**:

```
Frontend (xterm.js)
    ↓ WebSocket
Backend (Next.js API Route)
    ↓ HTTP/Bearer Auth
Device Service
    ↓ spawn/exec
Local Shell (bash/zsh/cmd)
```

**实现方案**:

```typescript
// Terminal.tsx
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export function Terminal({ deviceId, bindingCode }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建终端实例
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;

    // 建立 WebSocket 连接
    const ws = new WebSocket(
      `${wsUrl}/terminal?device=${deviceId}&binding=${bindingCode}`
    );

    ws.onopen = () => {
      xterm.writeln('Connected to device terminal');
    };

    ws.onmessage = (event) => {
      xterm.write(event.data);
    };

    ws.onerror = () => {
      xterm.writeln('\r\n\x1b[31mConnection error\x1b[0m');
    };

    ws.onclose = () => {
      xterm.writeln('\r\n\x1b[33mConnection closed\x1b[0m');
    };

    // 监听用户输入
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    wsRef.current = ws;

    // 窗口大小调整
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      ws.close();
      xterm.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [deviceId, bindingCode]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
```

**结论**: 使用 xterm.js + WebSocket 实现终端，确保性能和用户体验。

---

---

## 13. User Story 4 扩展研究：Agent上下文工程与持续改进

**研究日期**: 2026-01-06
**参考文档**: research-us4-extension.md, research-architecture-update.md, research-skill-filesystem.md

### 13.1 Skill 架构核心变更

#### 关键架构调整

**原设计**：三层 Skill 都存储在数据库中

**新设计**：

- ✅ **Edge Function Skill**: 基于文件系统（Markdown 格式），不需要数据库表
- ✅ **设备 Skill**: 基于文件系统（Markdown 格式），不需要数据库表
- ✅ **Remote Skill**: 仅此层需要数据库表（用户自定义 Skill）

**理由**：

- Edge Function Skill 是系统内置能力，应该随代码部署
- 设备 Skill 存储在设备本地，通过配置文件管理
- 只有用户创建的 Remote Skill 需要数据库持久化

#### Claude Agent Skill 规格对齐

**核心要求**：三层 Skill 都需要与 Claude Agent Skill 规格一致

**标准 Skill Markdown 格式**：

```markdown
# Skill Name

Brief description of what this skill does.

## When to Use

- Scenario 1
- Scenario 2

## Tools

### tool_name

Description of the tool.

**Parameters:**
- `param1` (string, required): Description
- `param2` (number, optional): Description

**Example:**
\`\`\`json
{
  "param1": "value",
  "param2": 123
}
\`\`\`

## Resources

### resource_uri

Description of the resource.

**URI Pattern:** `resource://namespace/path`

## Examples

### Example 1: Common Use Case

\`\`\`
User: "I want to..."
Agent: [Uses tool_name with...]
Result: ...
\`\`\`
```

---

### 13.2 统一 Skill 资源加载接口

#### 按需加载策略

**核心理念**：Agent 启动时只加载 Skill 元数据（轻量级），按需加载完整 Skill 内容（Markdown）

```typescript
// Skill 元数据（轻量级，启动时加载）
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: 'edge' | 'remote' | 'device';
  priority: number;
  tags: string[];
  triggerConditions: {
    keywords: string[];
    userIntent: string[];
  };
  // 不包含完整的 tools 和 resources 定义
}

// 统一资源加载接口
async function loadSkillContent(skillId: string): Promise<string> {
  // 返回 skill.md 的完整内容
  // Agent 可以解析 Markdown 获取 tools、resources、examples

  const category = skillId.split(':')[0];

  switch (category) {
    case 'edge':
      return await loadEdgeSkill(skillId);
    case 'remote':
      return await loadRemoteSkill(skillId);
    case 'device':
      return await loadDeviceSkill(skillId);
    default:
      throw new Error(`Unknown skill category: ${category}`);
  }
}
```

**优势**：

- 减少初始上下文大小（仅加载元数据）
- 支持动态加载（按需获取完整内容）
- 与 Claude Agent Skill 规格一致
- 统一的加载接口，透明切换不同来源

---

#### 三层架构实现

```
┌─────────────────────────────────────────────────────────┐
│ Agent 启动                                               │
│ 1. 加载所有 Skill 元数据（轻量级）                       │
│ 2. 根据上下文选择相关 Skill                              │
│ 3. 按需加载 skill.md 内容                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Edge Function Skills (文件系统)                │
│ - 位置: supabase/functions/skills/*.md                  │
│ - 示例: a2ui-skill.md, image-gen-skill.md              │
│ - 加载: 直接读取文件系统                                 │
│ - 低延迟 (<50ms)                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Remote Skills (数据库)                         │
│ - 位置: PostgreSQL skills 表                            │
│ - 示例: 用户自定义 Skill、MiniApp Skill                 │
│ - 加载: 从数据库查询 skill_content 字段                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Device Skills (设备文件系统)                   │
│ - 位置: ~/.mango/skills/*.md                            │
│ - 示例: 本地文件操作、Git 操作                          │
│ - 加载: 通过设备 API 读取                                │
└─────────────────────────────────────────────────────────┘
```

**文件结构**:

```
supabase/functions/process-agent-message/skills/
├── a2ui-skill.md              # A2UI 界面生成 Skill
├── image-gen-skill.md         # 图片生成 Skill
├── miniapp-skill.md           # MiniApp 管理 Skill
└── _metadata.json             # Skill 元数据索引
```

**A2UI Skill 示例** (a2ui-skill.md):

```markdown
# A2UI 界面生成

生成富交互用户界面组件，支持表单、图表、列表等多种组件类型。

## When to Use

- 用户需要填写表单或输入数据
- 需要展示数据可视化图表
- 需要创建交互式界面组件
- 需要收集用户反馈或选择

## Tools

### generate_form

生成表单界面组件。

**Parameters:**
- `fields` (array, required): 表单字段定义数组
- `title` (string, optional): 表单标题
- `submitLabel` (string, optional): 提交按钮文本

**Example:**
\`\`\`json
{
  "fields": [
    { "type": "input", "label": "用户名", "required": true },
    { "type": "select", "label": "角色", "options": ["管理员", "用户"] }
  ],
  "title": "用户注册"
}
\`\`\`

### generate_chart

生成数据可视化图表。

**Parameters:**
- `chartType` (string, required): 图表类型（line/bar/pie）
- `data` (array, required): 图表数据

**Example:**
\`\`\`json
{
  "chartType": "line",
  "data": [
    { "month": "1月", "sales": 4000 },
    { "month": "2月", "sales": 3000 }
  ]
}
\`\`\`
```

#### Layer 2: Remote Skills (数据库)

**数据库表结构**:

```sql
-- skills 表（仅存储用户自定义 Skill）
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'remote',
  priority INT DEFAULT 5,
  tags TEXT[],
  trigger_conditions JSONB,

  -- 存储完整的 Markdown 内容
  skill_content TEXT NOT NULL,

  usage_stats JSONB DEFAULT '{"callCount": 0, "successRate": 1.0}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_skills_user ON skills(user_id);
CREATE INDEX idx_skills_active ON skills(is_active);
```

**Skill 加载实现**:

```typescript
// 从数据库加载 Remote Skill
async function loadRemoteSkill(skillId: string): Promise<string> {
  const { data, error } = await supabase
    .from('skills')
    .select('skill_content')
    .eq('id', skillId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  return data.skill_content; // 返回 Markdown 内容
}
```

#### Layer 3: Device Skills

**文件结构**:

```
~/.mango/skills/
├── file-operations-skill.md   # 文件操作 Skill
├── git-operations-skill.md    # Git 操作 Skill
└── _metadata.json             # Skill 元数据索引
```

**Skill 加载实现**:

```typescript
// 从设备加载 Device Skill
async function loadDeviceSkill(skillId: string, bindingCode: string): Promise<string> {
  const binding = await getDeviceBinding(bindingCode);

  const response = await fetch(
    `${binding.device_url}/skills/${skillId}`,
    {
      headers: { 'Authorization': `Bearer ${bindingCode}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load device skill: ${skillId}`);
  }

  return await response.text(); // 返回 Markdown 内容
}
```

**设备 Skill 示例** (file-operations-skill.md):

```markdown
# 文件操作

访问和操作本地文件系统。

## When to Use

- 需要读取本地文件内容
- 需要写入或修改文件
- 需要列出目录内容
- 需要搜索文件

## Tools

### read_file

读取本地文件内容。

**Parameters:**
- `path` (string, required): 文件路径

**Example:**
\`\`\`json
{
  "path": "/Users/username/Documents/report.txt"
}
\`\`\`

### write_file

写入内容到本地文件。

**Parameters:**
- `path` (string, required): 文件路径
- `content` (string, required): 文件内容

**Example:**
\`\`\`json
{
  "path": "/Users/username/Documents/note.txt",
  "content": "Hello World"
}
\`\`\`
```

#### 统一 Skill 资源加载工具

**核心概念**：Agent 通过统一的工具接口加载 Skill 的子资源（完整 Markdown 内容）到上下文

```typescript
// Agent 可用的统一工具
const LOAD_SKILL_TOOL = {
  name: 'load_skill',
  description: '加载 Skill 的完整内容到上下文，包括工具定义、资源、示例等',
  parameters: {
    type: 'object',
    properties: {
      skillId: {
        type: 'string',
        description: 'Skill ID，格式：edge:xxx 或 remote:xxx 或 device:xxx'
      }
    },
    required: ['skillId']
  }
};

// 工具实现
async function loadSkillTool(skillId: string): Promise<string> {
  // 调用统一的资源加载接口
  const skillContent = await loadSkillContent(skillId);

  return `已加载 Skill: ${skillId}\n\n${skillContent}`;
}
```

#### 决策总结

**采用方案**: 基于文件系统的三层 Skill 架构 + 统一资源加载接口

**核心特性**:

- ✅ **Edge Skills**: 文件系统存储（Markdown），低延迟，内置能力
- ✅ **Remote Skills**: 数据库存储（Markdown），用户自定义，灵活扩展
- ✅ **Device Skills**: 设备文件系统（Markdown），本地资源访问
- ✅ **统一加载接口**: `load_skill` 工具，Agent 按需加载完整内容
- ✅ **Claude Agent Skill 规格**: 所有 Skill 遵循统一的 Markdown 格式

**优势**:

- 减少初始上下文：仅加载元数据，按需加载完整内容
- 标准化格式：遵循 Claude Agent Skill 规格
- 透明切换：统一接口，不同来源无缝切换
- 易于维护：Markdown 格式，易读易编辑

### 13.3 MiniApp 改造为 Skill + MCP Server 架构

#### 核心变更

**原架构问题**：

- HTML 和 Code 分离，管理复杂
- 缺乏标准化的工具调用接口
- UI 展示方式不统一
- 难以与 Agent 深度集成

**新架构设计**：

```
MiniApp (改造后)
├── Skill 定义 (Markdown)
│   ├── name, description, tags
│   ├── When to Use
│   └── Tools 定义
├── MCP Server (Edge Function)
│   ├── Tools 实现
│   └── UI Resource
└── 统一 UI Resource URI: ui://mango/main
```

#### 技术栈

**核心依赖**：

- ✅ `@modelcontextprotocol/sdk/server/mcp.js` - MCP Server 核心
- ✅ `@hono/mcp` - Hono 的 MCP 传输层（StreamableHTTPTransport）
- ✅ `@mcp-ui/server` - MCP UI Resource 创建工具
- ✅ `Hono` - HTTP 框架

**移除**：

- ❌ `mcp-use` - 不再使用

#### MiniApp 数据库表结构

```sql
-- mini_apps 表（改造后）
CREATE TABLE mini_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,

  -- Skill 定义（Markdown 格式）
  skill_content TEXT NOT NULL,

  -- MCP Server 代码（JavaScript）
  code TEXT NOT NULL,

  -- 权限和状态
  permissions TEXT[],
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- 统计
  install_count INT DEFAULT 0,
  usage_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- mini_app_data 表（存储数据）
CREATE TABLE mini_app_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID REFERENCES mini_app_installations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(installation_id, key)
);
```

#### MCP Server 实现

> **⚠️ 注意**：以下代码示例中的 `createUIResource` + JSON 组件树模式已废弃。
> 当前架构使用 `registerAppResource` 注册 HTML 资源，前端通过 iframe 渲染。
> 详见 `research-miniapp-hono-mcp.md` 和 `research-miniapp-unified-ui.md`。

**Edge Function 端点** (supabase/functions/miniapp-mcp/index.ts):

```typescript
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { createUIResource } from '@mcp-ui/server';

const app = new Hono();

app.all('/:id', async (c) => {
  const miniAppId = c.req.param('id');

  // 1. 获取 MiniApp
  const miniApp = await getMiniApp(miniAppId);

  // 2. 创建 MCP Server
  const mcpServer = new McpServer({
    name: `miniapp-${miniApp.name}`,
    version: '1.0.0',
  });

  // 3. 创建沙箱上下文
  const context = await createMiniAppContext(c, miniApp);

  // 4. 在沙箱中执行 MiniApp 代码
  await executeMiniAppCode(mcpServer, miniApp.code, context);

  // 5. 连接传输层
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);

  // 6. 处理请求
  return transport.handleRequest(c);
});

export default app;
```

#### MiniApp 代码结构

**TodoList MiniApp 示例**:

```javascript
// TodoList MiniApp Code
// 注册工具
mcpServer.tool({
  // 工具 1: 添加待办事项
  add_todo: {
    description: '添加新的待办事项',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
      },
      required: ['title'],
    },
    async execute(args) {
      const todo = {
        id: generateId(),
        title: args.title,
        description: args.description || '',
        dueDate: args.dueDate,
        completed: false,
        createdAt: new Date().toISOString(),
      };

      await storage.set(`todo:${todo.id}`, todo);
      return { success: true, todo };
    },
  },

  // 工具 2: 列出待办事项
  list_todos: {
    description: '列出所有待办事项',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'active', 'completed'] },
      },
    },
    async execute(args) {
      const allTodos = await storage.getAll('todo:*');

      let todos = allTodos;
      if (args.filter === 'active') {
        todos = allTodos.filter(t => !t.completed);
      } else if (args.filter === 'completed') {
        todos = allTodos.filter(t => t.completed);
      }

      return { todos };
    },
  },

  // 工具 3: 完成待办事项
  complete_todo: {
    description: '标记待办事项为已完成',
    inputSchema: {
      type: 'object',
      properties: {
        todoId: { type: 'string' },
      },
      required: ['todoId'],
    },
    async execute(args) {
      const todo = await storage.get(`todo:${args.todoId}`);
      if (!todo) {
        throw new Error('Todo not found');
      }

      todo.completed = true;
      todo.completedAt = new Date().toISOString();
      await storage.set(`todo:${args.todoId}`, todo);

      return { success: true, todo };
    },
  },
};

// UI Resource 定义
exports.ui = {
  type: 'container',
  props: {
    title: '待办事项',
  },
  children: [
    {
      type: 'form',
      id: 'add-todo-form',
      props: {
        title: '添加待办',
      },
      children: [
        {
          type: 'input',
          id: 'title',
          props: {
            label: '标题',
            placeholder: '输入待办事项...',
            required: true,
          },
        },
        {
          type: 'input',
          id: 'description',
          props: {
            label: '描述',
            multiline: true,
            rows: 3,
          },
        },
        {
          type: 'button',
          props: {
            label: '添加',
            variant: 'primary',
          },
          events: [{
            event: 'onClick',
            action: 'call_tool',
            payload: {
              tool: 'add_todo',
              args: {
                title: '{{form.title}}',
                description: '{{form.description}}',
              },
            },
          }],
        },
      ],
    },
    {
      type: 'list',
      id: 'todo-list',
      props: {
        dataSource: '{{todos}}',
        itemTemplate: {
          type: 'card',
          props: {
            title: '{{item.title}}',
            description: '{{item.description}}',
            actions: [
              {
                label: '完成',
                action: 'call_tool',
                payload: {
                  tool: 'complete_todo',
                  args: { todoId: '{{item.id}}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
};

// 主动触发配置
exports.triggers = [
  {
    type: 'schedule',
    cron: '0 9 * * *', // 每天早上 9 点
    action: 'send_reminder',
    async handler() {
      const todos = await storage.getAll('todo:*');
      const dueTodos = todos.filter(t => {
        return !t.completed && new Date(t.dueDate) <= new Date();
      });

      if (dueTodos.length > 0) {
        await sendMessage({
          type: 'notification',
          title: '待办提醒',
          content: `你有 ${dueTodos.length} 个待办事项需要完成`,
          data: { todos: dueTodos },
        });
      }
    },
  },
];
```

#### Agent 调用 MiniApp

**通过 Skill + MCP Server 调用**:

1. 一开始就加载 MiniApp Skill 元数据到Agent上下文
2. 当Agent请求加载 MiniApp Skill 的SKILL.md时，建立MiniApp MCP 连接，并把其工具加载到Agent工具列表中
3. Agent按需调用 MiniApp 工具

#### 决策总结

**采用方案**: Skill + MCP Server 架构

- ✅ 标准化工具调用接口
- ✅ 统一 UI Resource 管理
- ✅ 更好的 Agent 集成
- ✅ 支持主动触发机制

#### 决策总结

**采用方案**: Skill + MCP Server 架构（基于 Hono + @hono/mcp）

**核心特性**:

- ✅ **统一 UI Resource URI**: `ui://mango/main`（所有 MiniApp 共用）
- ✅ **Skill 定义**: Markdown 格式，存储在 `skill_content` 字段
- ✅ **MCP Server**: Edge Function 实现，使用 `@hono/mcp` 传输层
- ✅ **沙箱执行**: 安全的代码执行环境，受限的 API 访问

**优势**:

- 标准化：遵循 MCP 协议标准
- 简化管理：统一的 UI Resource URI
- 安全性：沙箱隔离，权限控制
- 易于集成：与 Skill 系统无缝对接

**详细实现**: 参见 `research-miniapp-hono-mcp.md` 和 `research-miniapp-unified-ui.md`

---

### 13.4 扩展 Skill 机制

#### 核心概念

**扩展 Skill (Extension Skill)**：基于用户反馈自动生成的指导性 Skill，告诉 Agent 什么是 Good vs Bad 的行为模式。

**生成流程**：

1. 收集用户反馈（评分、标签、原因）
2. 聚类相似反馈，识别模式
3. 生成正向/负向案例 Skill
4. 注入到 Agent 提示词

**详细实现**: 参见 `research-us4-extension.md`

---

## 14. 技术决策总结（更新）

### 14.1 Skill 架构决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **Skill 存储** | 文件系统（Edge/Device）+ 数据库（Remote） | 系统内置 Skill 随代码部署，用户自定义 Skill 数据库存储 |
| **Skill 格式** | Markdown（Claude Agent Skill 规格） | 标准化、易读、易维护 |
| **资源加载** | 按需加载（`load_skill` 工具） | 减少初始上下文，提升性能 |
| **MiniApp 架构** | Skill + MCP Server（Hono + @hono/mcp） | 标准化、安全、易集成 |

### 14.2 技术栈更新

**新增**：

- ✅ `@hono/mcp` - Hono 的 MCP 传输层
- ✅ `@mcp-ui/server` - MCP UI Resource 创建工具
- ✅ `@mcp-ui/client` - MCP UI Resource 前端渲染
- ✅ `@modelcontextprotocol/sdk/server/mcp.js` - MCP Server 核心

**移除**：

- ❌ `mcp-use` - 不再使用

---
