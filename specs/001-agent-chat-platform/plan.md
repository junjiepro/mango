# Implementation Plan: Mango - 智能Agent对话平台

**Branch**: `001-agent-chat-platform` | **Date**: 2025-11-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-chat-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

构建一个智能Agent对话平台（Mango），核心功能包括：
- **多模态对话系统**：用户通过自然语言与Agent交互，支持文本、图片、文件输入输出
- **后台任务执行**：Agent可在用户离开后继续执行任务
- **小应用生态**：Agent可创建可复用的小应用，支持主动触发和用户分享
- **协议支持**：集成MCP、A2A、ACP协议，扩展Agent工具能力
- **持续学习**：Agent基于用户反馈持续优化服务质量
- **CLI工具**：便于用户接入本地MCP/ACP服务

技术方案采用 Next.js + Supabase 全栈架构，实现Web端优先的多平台应用。

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+ / Deno 1.40+)
**Primary Dependencies**: Next.js 14+, React 18+, Supabase Client, TailwindCSS
**Storage**: Supabase (PostgreSQL 15+, 支持JSONB、全文搜索、实时订阅)
**Testing**: Vitest (单元测试), Playwright (E2E测试), Testing Library (组件测试)
**Target Platform**: Web (Chrome/Firefox/Safari/Edge 最近两个主版本), CLI (Node.js/Deno)
**Project Type**: web (前后端分离，Next.js全栈)
**Performance Goals**: 首屏加载<2s, 交互响应<100ms, API响应<500ms (p95), 支持1000并发用户
**Constraints**: 消息实时同步<200ms, 文件上传支持50MB, 小应用主动提醒误差<1分钟
**Scale/Scope**: 初期支持10k用户, 主要页面约15个, 小应用框架可扩展

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality First - ✅ PASS

| 要求 | 计划合规性 |
|------|-----------|
| 可读性 | ✅ TypeScript强类型 + ESLint + Prettier 确保代码一致性 |
| 单一职责 | ✅ 模块化设计：对话、小应用、协议适配器独立模块 |
| 低耦合高内聚 | ✅ 服务层抽象，组件原子化设计 |
| 无重复 | ✅ 共享组件库 + 工具函数库 |
| 静态分析 | ✅ TypeScript strict mode + ESLint 零警告策略 |
| 代码审查 | ✅ PR必须经过审查，CI门禁检查 |

### II. Testing Standards - ✅ PASS

| 要求 | 计划合规性 |
|------|-----------|
| 测试覆盖率 | ✅ 目标核心业务逻辑 80%+ 覆盖率 |
| 测试金字塔 | ✅ Vitest(单元) > Testing Library(集成) > Playwright(E2E) |
| 测试隔离 | ✅ 每个测试独立数据库状态，使用测试容器隔离 |
| 测试命名 | ✅ 遵循 describe-it-expect 模式，清晰描述场景 |
| 边界测试 | ✅ 关键路径包含边界条件测试 |
| 持续集成 | ✅ GitHub Actions CI，测试失败阻止合并 |

### III. User Experience Consistency - ✅ PASS

| 要求 | 计划合规性 |
|------|-----------|
| 设计规范 | ✅ TailwindCSS + 自定义设计系统，简洁风格 |
| 交互一致性 | ✅ 统一组件库，相同交互模式 |
| 响应反馈 | ✅ 100ms内视觉反馈，骨架屏/加载态 |
| 错误处理 | ✅ 友好错误提示 + 操作建议 |
| 可访问性 | ⚠️ SHOULD: 目标WCAG 2.1 AA，非强制 |
| 跨平台一致 | ✅ 当前仅Web端，核心体验一致 |

### IV. Performance Requirements - ✅ PASS

| 要求 | 计划合规性 |
|------|-----------|
| 首屏加载 | ✅ Next.js SSR/SSG + 代码分割，目标<2s |
| 交互响应 | ✅ 乐观更新 + 100ms反馈机制 |
| API响应 | ✅ Supabase边缘函数 + 连接池，目标<500ms p95 |
| 内存效率 | ✅ React状态管理优化，避免内存泄漏 |
| 性能监控 | ✅ Supabase Analytics + 自定义指标 |
| 性能预算 | ✅ 新功能不得降低核心指标超过10% |

**宪法检查结论**: 全部MUST要求通过，可继续Phase 0研究。

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-chat-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.openapi.yaml # REST API契约
│   └── events.schema.json # 实时事件Schema
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Web应用结构 (Next.js全栈)
apps/
├── web/                    # Next.js Web应用
│   ├── src/
│   │   ├── app/           # App Router页面
│   │   ├── components/    # React组件
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── lib/           # 工具函数
│   │   ├── services/      # 业务服务层
│   │   └── types/         # TypeScript类型
│   └── tests/
│       ├── e2e/           # Playwright E2E测试
│       └── unit/          # Vitest单元测试
│
└── cli/                    # CLI工具
    ├── src/
    │   ├── commands/      # CLI命令
    │   ├── lib/           # 共享逻辑
    │   └── types/         # 类型定义
    └── tests/

packages/
├── shared/                 # 共享类型和工具
│   ├── types/             # 跨应用类型定义
│   └── utils/             # 通用工具函数
│
├── protocols/              # 协议适配器
│   ├── mcp/               # MCP协议实现
│   ├── a2a/               # A2A协议实现
│   └── acp/               # ACP协议实现
│
└── miniapp-runtime/        # 小应用运行时
    ├── core/              # 核心运行时
    ├── sandbox/           # 安全沙箱
    └── apis/              # 小应用API

supabase/
├── migrations/            # 数据库迁移
├── functions/             # Edge Functions
└── seed.sql              # 测试数据
```

**Structure Decision**: 采用 monorepo 结构（推荐使用 pnpm workspaces），将Web应用、CLI工具和共享包分离，便于代码复用和独立部署。协议适配器和小应用运行时作为独立包，支持按需引入。

## Complexity Tracking

> 本设计无违反宪法原则的情况，无需填写。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
