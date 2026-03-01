# Mango - 智能Agent对话平台

一个支持多模态对话、后台任务执行、小应用生态和持续学习的智能Agent平台。

## 技术栈

- **前端框架**: Next.js 14+ (App Router), React 18+
- **样式**: TailwindCSS 3.4, shadcn/ui, Radix UI
- **AI**: Vercel AI SDK 6 (@ai-sdk/react), MCP SDK (@modelcontextprotocol/sdk), ACP SDK
- **编辑器/终端**: Monaco Editor (@monaco-editor/react), xterm.js 6
- **后端**: Next.js API Routes, Supabase Edge Functions
- **数据库**: Supabase (PostgreSQL 15+, pgvector)
- **实时通信**: Supabase Realtime
- **认证**: Supabase Auth
- **存储**: Supabase Storage
- **国际化**: next-intl 4 (中文/英文)
- **图表**: Recharts 3
- **语言**: TypeScript 5.3+
- **包管理**: pnpm 9+ (monorepo)
- **构建工具**: Turborepo
- **CLI**: Hono 4, Commander 11, node-pty, Cloudflare Tunnel
- **测试**: Vitest 4 (单元测试), Playwright 1.57 (E2E测试), Testing Library

## 项目结构

```
mango/
├── apps/
│   ├── web/                    # Next.js Web应用
│   └── cli/                    # CLI 设备服务工具
├── packages/
│   ├── shared/                 # 共享类型和工具
│   └── protocols/              # MCP/ACP协议适配器
├── supabase/
│   ├── migrations/            # 数据库迁移
│   ├── functions/             # Edge Functions
│   └── seed.sql              # 测试数据
├── specs/                     # 设计文档
├── docs/                      # 项目文档 (ADR, 开发指南, 报告)
└── scripts/                   # 构建脚本
```

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Supabase CLI (可选,用于本地开发)

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase 凭证
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建

```bash
pnpm build
```

### 测试

```bash
# 运行所有单元测试和集成测试
cd apps/web
pnpm vitest run

# 运行测试并生成覆盖率报告
pnpm vitest run --coverage

# 监视模式(开发时使用)
pnpm vitest

# 运行 E2E 测试
pnpm test:e2e

# 查看测试覆盖率报告
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

#### 测试结构

```
apps/web/tests/
├── helpers/           # 测试辅助工具
│   ├── supabase-mock.ts    # Supabase Mock 框架
│   └── test-data.ts        # 测试数据工厂
├── unit/             # 单元测试
│   └── services/     # 服务层测试
├── integration/      # 集成测试
│   └── api/         # API 路由测试
└── e2e/             # E2E 测试
```

#### 测试覆盖

- ✅ **User Story 1** - 93+ 个测试用例
  - 单元测试: ConversationService, MessageService, TaskService
  - 集成测试: API 路由
  - E2E 测试: 完整对话流程

详细测试文档:
- [测试实现报告](./docs/user-story-1-test-implementation.md)
- [测试最终报告](./docs/user-story-1-test-final-report.md)

### 代码检查

```bash
pnpm lint
```

### 代码格式化

```bash
pnpm format
```

## 开发指南

详细开发指南请参考:
- [快速入门](./specs/001-agent-chat-platform/quickstart.md)
- [功能规格](./specs/001-agent-chat-platform/spec.md)
- [实现计划](./specs/001-agent-chat-platform/plan.md)
- [技术研究](./specs/001-agent-chat-platform/research.md)
- [数据模型](./specs/001-agent-chat-platform/data-model.md)

## 核心功能

### 用户故事

1. **与Agent进行对话完成任务** (P1 - MVP) ✅ **已完成**
   - 多模态对话(文本、图片、文件)
   - 后台任务执行
   - 实时同步

2. **使用和管理小应用** (P2) ✅ **已完成**
   - 小应用创建和安装
   - Agent 智能调用小应用
   - 被动调用和主动触发
   - 权限管理和沙箱隔离
   - 数据持久化存储

3. **通过CLI工具接入本地MCP/ACP服务** (P3) ✅ **已完成**
   - CLI 设备服务 (Hono HTTP Server)
   - Cloudflare Tunnel 公网暴露
   - 临时绑定码设备绑定
   - 本地 MCP/ACP 服务代理

4. **Agent持续学习与改进** (P4) ✅ **已完成**
   - 反馈收集与规则提取
   - 统一 Skill 架构 v3 (语义搜索)
   - 上下文工程优化

5. **富交互界面与工作区** (P5) ⚠️ **大部分完成**
   - A2UI 富交互组件 ✅
   - 资源自动嗅探收集 ✅
   - Monaco Editor 文件浏览器 ✅
   - 终端集成 (xterm.js) ✅
   - Git 集成 ❌ 未完成

6. **多语言国际化支持** (P6) ✅ **已完成**
   - 中文/英文界面 (next-intl)
   - 多语言Agent理解

## CLI 设备服务

CLI 工具允许技术用户将本地 MCP/ACP 服务接入 Mango 平台：

1. 安装并启动 CLI 设备服务
2. 通过 Cloudflare Tunnel 暴露到公网
3. 在 Web 端输入临时绑定码完成设备绑定
4. 配置本地 MCP/ACP 服务
5. Agent 可远程调用设备上的工具和服务

```bash
cd apps/cli
pnpm build
pnpm start    # 启动设备服务，生成临时绑定码
```

详细文档: [CLI README](./apps/cli/README.md)

## 工作区

工作区提供类 VSCode 的开发体验，集成在对话界面右侧：

- **文件浏览器**: 通过 Monaco Editor 浏览和编辑设备文件
- **终端**: xterm.js 远程终端，连接绑定设备
- **资源面板**: 自动嗅探对话中的资源（文件、链接、代码片段）
- **设备管理**: 查看绑定设备状态和服务列表

## MiniApp 功能

### 什么是 MiniApp?

MiniApp (小应用) 是 Mango 平台的可扩展功能模块,允许用户创建自定义的应用来扩展 Agent 的能力。小应用可以:

- 📦 **数据管理**: 存储和管理结构化数据 (待办事项、笔记、倒计时等)
- 🤖 **Agent 集成**: 被 Agent 智能调用,无缝融入对话流程
- 🔔 **主动触发**: 根据时间或事件自动发送提醒
- 🔒 **安全隔离**: 在沙箱环境中运行,确保安全性
- 🔄 **数据持久化**: 使用 Storage API 持久化保存数据

### 快速开始

#### 1. 创建小应用

在对话中告诉 Agent:

```
"帮我创建一个待办事项管理小应用"
```

Agent 会自动生成小应用代码并创建。

#### 2. 使用小应用

在消息输入框中:

1. 点击小应用图标 (📦)
2. 选择要使用的小应用
3. 输入你的指令,例如: "添加一个待办事项:完成项目报告"

Agent 会自动理解你的意图并调用小应用。

### MiniApp 开发

#### 代码结构

每个 MiniApp 都是一段 JavaScript 代码,支持 CRUD 操作:

```javascript
// 根据 action 执行不同操作
switch (action) {
  case 'create':
    // 创建数据
    return await createItem(params);

  case 'read':
    // 读取数据
    return await getItems(params);

  case 'update':
    // 更新数据
    return await updateItem(params);

  case 'delete':
    // 删除数据
    return await deleteItem(params);
}
```

#### 可用 API

**Storage API** - 数据持久化:

```javascript
// 保存数据
await storage.set('key', value);

// 读取数据
const value = await storage.get('key');
```

**Context 变量**:

```javascript
action  // 当前操作: 'create' | 'read' | 'update' | 'delete'
params  // 操作参数对象
```

#### 示例代码

查看完整示例:

- [MiniApp 开发指南](./docs/miniapp-development.md)

### 工作原理

```
用户选择 MiniApp
    ↓
发送消息到 Agent
    ↓
Agent 识别用户意图
    ↓
调用 invoke_miniapp 工具
    ↓
在沙箱中执行 MiniApp 代码
    ↓
返回结果给用户
```

### 安全性

- ✅ **沙箱隔离**: MiniApp 在隔离环境中运行
- ✅ **权限控制**: 限制可访问的 API
- ✅ **执行限制**: 最大执行时间 5 秒,内存 10MB
- ✅ **代码审查**: 创建时进行安全检查

### 更多资源

- [MiniApp 开发指南](./docs/miniapp-development.md)
- [MiniApp 功能规格](./specs/001-agent-chat-platform/spec.md#user-story-2)
- [API 参考文档](./specs/001-agent-chat-platform/contracts/)

## 安全特性

- **RLS 策略**: 所有数据表启用行级安全策略
- **CSRF 防护**: API 路由 Origin 头校验
- **XSS 防护**: HTML 内容自动清理（sanitize）
- **安全头**: HSTS、X-Frame-Options、X-Content-Type-Options 等
- **速率限制**: API/Auth/Chat 分级限流
- **沙箱隔离**: iframe sandbox 属性限制

## 性能优化

- **数据库索引**: 针对高频查询路径优化
- **代码分割**: Monaco Editor、Terminal 等重组件 next/dynamic 懒加载
- **React.memo**: 高频渲染组件（MessageItem、MiniAppCard 等）缓存
- **Realtime 防抖**: 订阅更新 300-500ms 批量处理
- **响应压缩**: Next.js compress 启用

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 许可证

[Apache-2.0 license](./LICENSE)

## 联系方式

- GitHub: https://github.com/your-org/mango
- 文档: [specs/](./specs/)
