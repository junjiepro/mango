# Mango 开发指南

智能 Agent 对话平台 — 支持多模态对话、MiniApp 生态、设备服务接入、持续学习、富交互工作区、多语言国际化。

## 项目结构

```text
mango/                          # pnpm monorepo + Turborepo
├── apps/
│   ├── web/                    # Next.js 14+ Web 应用 (App Router)
│   │   ├── src/app/            # 页面路由 & API Routes
│   │   ├── src/components/     # UI 组件 (shadcn/ui + 自定义)
│   │   ├── src/services/       # 业务服务层
│   │   ├── src/hooks/          # React Hooks
│   │   ├── src/lib/            # 工具库 (supabase client, a2ui parser 等)
│   │   ├── src/i18n/           # 国际化配置
│   │   ├── src/contexts/       # React Context
│   │   └── src/tests/          # Vitest 单元/集成测试
│   └── cli/                    # CLI 设备服务 (Hono HTTP + MCP/ACP 代理)
│       └── src/
├── packages/
│   ├── shared/                 # 共享类型 & 工具 (types/, utils/)
│   └── protocols/              # MCP 协议适配器 (@modelcontextprotocol/sdk)
├── supabase/
│   ├── migrations/             # PostgreSQL 数据库迁移
│   ├── functions/              # Edge Functions (Agent、Skill、MiniApp MCP 等)
│   └── seed.sql
├── specs/                      # 设计文档 (spec, plan, tasks, research, contracts)
├── docs/                       # 项目文档 (ADR, 报告, 开发指南)
└── scripts/                    # 构建脚本 (skill-manifest 生成)
```

## 技术栈

- **Runtime**: Node.js >= 20, pnpm >= 9, Turborepo
- **Web**: Next.js 14+ (App Router), React 18+, TypeScript 5.3+
- **样式**: TailwindCSS 3.4, shadcn/ui, Radix UI, lucide-react
- **AI**: Vercel AI SDK 6 (@ai-sdk/react), MCP SDK (@modelcontextprotocol/sdk)
- **编辑器**: Monaco Editor (@monaco-editor/react), xterm.js 6
- **数据库**: Supabase (PostgreSQL 15+, Realtime, Auth, Storage, Edge Functions)
- **i18n**: next-intl 4
- **CLI**: Hono 4, Commander 11, node-pty, ws, ACP SDK
- **测试**: Vitest 4, Playwright 1.57, Testing Library
- **图表**: Recharts 3

## 常用命令

```bash
pnpm install                    # 安装依赖
pnpm dev                        # 启动所有开发服务 (turbo)
pnpm build                      # 构建所有包
pnpm lint                       # ESLint 检查
pnpm format                     # Prettier 格式化
pnpm test                       # 运行所有测试 (turbo)
pnpm test:e2e                   # E2E 测试 (Playwright)

# Web 应用单独操作
cd apps/web && pnpm vitest run              # 单元/集成测试
cd apps/web && pnpm vitest run --coverage   # 带覆盖率
cd apps/web && pnpm test:e2e                # E2E 测试

# CLI 单独操作
cd apps/cli && pnpm dev                     # 开发模式
cd apps/cli && pnpm build                   # 构建
```

## 代码规范

- TypeScript strict mode, ESLint + Prettier
- 组件库: shadcn/ui (Radix 原语 + TailwindCSS)
- 路由: Next.js App Router 约定 (`app/` 目录)
- 服务层: `src/services/` 封装业务逻辑, API Routes 调用服务层
- 国际化: 所有用户可见文本通过 next-intl, 翻译文件在 `apps/web/messages/{en,zh}/`

## 关键路径

| 类别 | 路径 |
|------|------|
| API 路由 | `apps/web/src/app/api/{conversations,miniapps,devices,feedback,learning,skills,tools,mcp}/` |
| 页面路由 | `apps/web/src/app/{conversations,miniapps,devices,settings,learning,profile,auth}/` |
| 业务服务 | `apps/web/src/services/{ConversationService,MessageService,MiniAppService,DeviceService,FeedbackService,LearningService}.ts` |
| React Hooks | `apps/web/src/hooks/{useRealtimeSubscription,useDeviceBinding,useResourceSniffer,useWorkspaceLayout,useTerminal}.ts` |
| Edge Functions | `supabase/functions/{process-agent-message,miniapp-mcp,extract-learning-rules,generate-skill-embedding,process-task}/` |
| 数据库迁移 | `supabase/migrations/` |
| Skill 系统 | `supabase/functions/skills/`, `supabase/functions/_shared/skill-{loader,parser}.ts` |

## 当前状态

所有用户故事和 Phase 9 已完成（US5 Git 集成除外）：

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1-2: 基础设施 | ✅ 完成 | monorepo、数据库、认证、UI 基础 |
| US1: Agent 对话 | ✅ 完成 | 多模态对话、后台任务、实时同步 |
| US2: MiniApp 生态 | ✅ 完成 | 创建/安装/调用/分享、MCP Server 改造 |
| US3: CLI 设备服务 | ✅ 完成 | Hono HTTP、Cloudflare Tunnel、MCP/ACP 代理 |
| US4: 持续学习 | ✅ 完成 | 反馈收集、Skill 架构 v3、语义搜索、上下文工程 |
| US5: 富交互工作区 | ⚠️ 大部分完成 | A2UI、资源嗅探、Monaco Editor、终端 ✅; Git 集成 ❌ |
| US6: 国际化 | ✅ 完成 | next-intl 中英文、Agent 多语言理解 |
| Phase 9: 优化 | ✅ 完成 | 性能、安全、测试、监控、部署 |
