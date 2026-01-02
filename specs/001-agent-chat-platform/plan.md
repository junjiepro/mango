# Implementation Plan: User Story 5 - 富交互界面与工作区

**Branch**: `001-agent-chat-platform` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-chat-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

实现 Agent 生成富交互界面（A2UI）的能力，以及工作区功能，提供资源管理、设备监控、文件浏览（Monaco Editor）和多终端操作等专业级开发能力。核心技术包括：A2UI v0.8 协议的 JSONL 流式渲染、资源嗅探与收集、可展开/收起的工作区、Monaco Editor 集成、WebSocket 终端会话管理。

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+ / Deno 1.40+)
**Primary Dependencies**:
- Frontend: Next.js 14+, React 18+, TailwindCSS, shadcn/ui, Monaco Editor, xterm.js
- Backend: Supabase Client, A2UI v0.8 Protocol
- Real-time: Server-Sent Events (SSE), WebSocket

**Storage**: Supabase (PostgreSQL) - 存储资源元数据、工作区状态、终端会话记录
**Testing**: Vitest (单元测试), Playwright (E2E测试)
**Target Platform**: Web (现代浏览器: Chrome, Firefox, Safari, Edge 最近两个主要版本)
**Project Type**: Web (frontend + backend)
**Performance Goals**:
- A2UI 组件渲染 <500ms
- 用户交互响应 <100ms
- 工作区展开/收起动画 60fps
- Monaco Editor 加载文件目录 <2s (1000个文件以内)
- 终端命令执行延迟 <200ms (不含命令本身执行时间)

**Constraints**:
- A2UI 组件必须支持流式渲染（JSONL over SSE）
- 资源嗅探准确率 ≥95%，误报率 <5%
- 同时打开5个终端标签时性能无明显下降
- 小屏幕设备上工作区必须支持全屏模式

**Scale/Scope**:
- 支持单个会话中 100+ 个 A2UI 组件
- 资源面板管理 1000+ 个资源项
- 文件浏览器支持 10000+ 文件的目录树
- 同时维护 10+ 个活跃终端会话

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality First
✅ **PASS** - 代码将遵循单一职责原则，A2UI 渲染器、资源嗅探器、工作区管理器各自独立
✅ **PASS** - 使用 TypeScript 严格模式，确保类型安全
✅ **PASS** - 所有代码将通过 ESLint 和 TypeScript 编译器检查

### Testing Standards
✅ **PASS** - 核心功能（A2UI 渲染、资源嗅探、工作区状态管理）将达到 80%+ 测试覆盖率
✅ **PASS** - 测试金字塔：单元测试（组件渲染逻辑）> 集成测试（SSE 流处理）> E2E 测试（用户交互流程）
✅ **PASS** - 所有测试将在 CI 中自动执行

### User Experience Consistency
✅ **PASS** - 所有 UI 组件遵循 shadcn/ui 设计系统
✅ **PASS** - 用户交互（展开工作区、切换标签）在 100ms 内提供视觉反馈
✅ **PASS** - 错误处理：A2UI 渲染失败、资源加载失败、终端连接断开等场景提供友好提示

### Performance Requirements
✅ **PASS** - A2UI 组件渲染 <500ms，符合性能要求
✅ **PASS** - 工作区展开/收起动画 60fps，符合交互响应要求
✅ **PASS** - 将使用 React Profiler 和 Chrome DevTools 监控性能指标

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-chat-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: A2UI 协议调研、Monaco Editor 集成方案、终端技术选型
├── data-model.md        # Phase 1 output: A2UIComponent、Resource、Workspace、Terminal 等实体定义
├── quickstart.md        # Phase 1 output: 快速开始指南
├── contracts/           # Phase 1 output: A2UI SSE 流协议、WebSocket 终端协议
│   ├── a2ui-sse.yaml   # A2UI Server-Sent Events 协议定义
│   └── terminal-ws.yaml # 终端 WebSocket 协议定义
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── a2ui/
│   │   ├── renderer.ts          # A2UI 渲染引擎（生成 JSONL 流）
│   │   ├── catalog.ts           # Catalog 定义和管理
│   │   └── types.ts             # A2UI 类型定义
│   ├── resources/
│   │   ├── sniffer.ts           # 资源嗅探器（检测文件、链接、小应用）
│   │   └── manager.ts           # 资源管理器
│   └── api/
│       ├── a2ui-stream.ts       # SSE 端点（/api/a2ui/stream）
│       └── terminal-ws.ts       # WebSocket 端点（/api/terminal）
└── tests/
    ├── unit/
    │   ├── a2ui-renderer.test.ts
    │   └── resource-sniffer.test.ts
    └── integration/
        └── a2ui-stream.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── a2ui/
│   │   │   ├── A2UIRenderer.tsx      # A2UI 客户端渲染器
│   │   │   ├── ComponentRegistry.tsx # 组件注册表
│   │   │   └── widgets/              # A2UI 标准组件实现
│   │   │       ├── Text.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       └── Form.tsx
│   │   ├── workspace/
│   │   │   ├── Workspace.tsx         # 工作区容器
│   │   │   ├── ResourcePanel.tsx     # 资源面板
│   │   │   ├── DevicePanel.tsx       # 设备面板
│   │   │   ├── FileExplorer.tsx      # 文件浏览器（Monaco Editor）
│   │   │   └── TerminalPanel.tsx     # 终端面板（xterm.js）
│   │   └── chat/
│   │       └── MessageWithA2UI.tsx   # 支持 A2UI 的消息组件
│   ├── hooks/
│   │   ├── useA2UIStream.ts          # A2UI SSE 流处理 Hook
│   │   ├── useResourceSniffer.ts     # 资源嗅探 Hook
│   │   └── useTerminal.ts            # 终端会话管理 Hook
│   └── services/
│       ├── a2ui-client.ts            # A2UI 客户端服务
│       └── terminal-client.ts        # 终端 WebSocket 客户端
└── tests/
    ├── unit/
    │   └── A2UIRenderer.test.tsx
    └── e2e/
        └── workspace.spec.ts
```

**Structure Decision**: 选择 Web 应用结构（frontend + backend）。前端使用 React 组件化架构，A2UI 渲染器、工作区、资源管理各自独立。后端提供 SSE 流式端点和 WebSocket 终端服务。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
