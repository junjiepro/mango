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

## 6. 技术决策总结

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

