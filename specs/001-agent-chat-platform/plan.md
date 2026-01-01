# Implementation Plan: 富交互界面与工作区 (User Story 5)

**Branch**: `001-agent-chat-platform` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-chat-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本计划实现 User Story 5 的富交互界面与工作区功能，包括：
1. **A2UI（Agent-to-UI）**: Agent能够生成富交互界面组件（表单、图表、按钮等），嵌入到对话消息中
2. **资源嗅探**: 自动检测对话中出现的文件、链接、小应用等资源，收集到对话框下方的资源面板
3. **工作区组件**: 提供可展开/收起的多标签页工作区，包含资源管理、设备监控、文件浏览器（Monaco Editor）、多终端操作等功能
4. **响应式设计**: 支持对话区与工作区的尺寸调整，小屏幕设备采用全屏模式切换

技术方案采用 React 组件化架构，使用 Next.js 14+ 框架，Monaco Editor 用于代码编辑，WebSocket 用于终端通信。

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+ / Deno 1.40+)
**Primary Dependencies**:
- Next.js 14+ (React 18+) - 全栈框架
- React 18+ - UI 组件库
- Monaco Editor - 代码编辑器
- @monaco-editor/react - Monaco Editor React 封装
- xterm.js - 终端模拟器
- socket.io-client - WebSocket 客户端
- Recharts / Chart.js - 数据可视化
- TailwindCSS - 样式框架
- shadcn/ui - UI 组件库
- Supabase Client - 数据库客户端

**Storage**: Supabase (PostgreSQL) - 存储资源元数据、工作区状态、终端会话记录
**Testing**: Vitest + React Testing Library - 单元测试和组件测试
**Target Platform**: Web (现代浏览器: Chrome, Firefox, Safari, Edge 最近两个主要版本)
**Project Type**: Web Application (frontend + backend)
**Performance Goals**:
- A2UI 组件渲染 <500ms
- 工作区展开/收起动画 60fps
- Monaco Editor 加载文件目录 <2s (1000 文件内)
- 终端命令延迟 <200ms
- 资源嗅探实时处理 <100ms

**Constraints**:
- 首屏加载 <2s
- 交互响应 <100ms
- API 响应 <500ms (p95)
- 支持同时打开 5 个终端标签
- 小屏幕设备 (<768px) 采用全屏模式

**Scale/Scope**:
- 支持 1000+ 并发用户
- 单会话资源数量 <1000
- 设备文件系统 <10000 文件
- 工作区标签页 <10 个

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality First ✅ PASS

- **可读性**: 组件化架构，清晰的命名约定（A2UIComponent, ResourcePanel, Workspace）
- **单一职责**: 每个组件负责单一功能（资源嗅探、工作区管理、终端会话等）
- **低耦合高内聚**: 通过 React Context 和 Props 实现组件间通信，模块独立
- **无重复**: 使用共享组件库（shadcn/ui）避免重复代码
- **静态分析**: TypeScript 5.x 提供类型检查，配置 ESLint 和 Prettier
- **代码审查**: 所有变更需经过审查

### II. Testing Standards ✅ PASS

- **测试覆盖率**: 核心业务逻辑（资源嗅探、工作区状态管理）目标 80%+
- **测试金字塔**: 单元测试（组件逻辑）> 集成测试（API 交互）> E2E 测试（用户流程）
- **测试隔离**: 使用 Vitest 和 React Testing Library，每个测试独立运行
- **测试命名**: 描述性命名（如 "should detect file resources in message"）
- **边界测试**: 测试边界条件（空资源列表、大量文件、网络错误等）
- **持续集成**: CI 流水线自动执行测试

### III. User Experience Consistency ✅ PASS

- **设计规范**: 使用 shadcn/ui 和 TailwindCSS 统一设计系统
- **交互一致性**: 所有工作区标签页采用相同的交互模式
- **响应反馈**: A2UI 组件交互 <100ms，工作区展开 <300ms
- **错误处理**: 友好的错误提示（如终端连接失败、文件加载错误）
- **可访问性**: 遵循 WCAG 2.1 AA 标准（键盘导航、屏幕阅读器支持）
- **跨平台一致**: 响应式设计，小屏幕采用全屏模式

### IV. Performance Requirements ✅ PASS

- **首屏加载**: <2s（懒加载 Monaco Editor 和终端组件）
- **交互响应**: A2UI 组件 <100ms，工作区动画 60fps
- **API 响应**: 资源查询 <500ms (p95)
- **内存效率**: 虚拟滚动处理大量资源，及时清理终端会话
- **性能监控**: 使用 Web Vitals 监控关键指标
- **性能预算**: 新功能不影响核心对话性能

### 结论

✅ **所有宪法检查通过**，无需特殊豁免。设计遵循 KISS、YAGNI、DRY、SOLID 原则。

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-chat-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── a2ui-api.yaml    # A2UI 组件 API 定义
│   ├── resource-api.yaml # 资源管理 API 定义
│   └── workspace-api.yaml # 工作区 API 定义
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── a2ui/
│   │   │   ├── A2UIRenderer.tsx      # A2UI 组件渲染器
│   │   │   ├── components/
│   │   │   │   ├── FormComponent.tsx  # 表单组件
│   │   │   │   ├── ChartComponent.tsx # 图表组件
│   │   │   │   └── ButtonComponent.tsx # 按钮组件
│   │   │   └── types.ts               # A2UI 类型定义
│   │   ├── resource/
│   │   │   ├── ResourcePanel.tsx      # 资源面板
│   │   │   ├── ResourceSniffer.tsx    # 资源嗅探器
│   │   │   ├── ResourceItem.tsx       # 资源项
│   │   │   └── types.ts               # 资源类型定义
│   │   └── workspace/
│   │       ├── Workspace.tsx          # 工作区容器
│   │       ├── WorkspaceHeader.tsx    # 工作区头部
│   │       ├── tabs/
│   │       │   ├── ResourceTab.tsx    # 资源标签页
│   │       │   ├── DeviceTab.tsx      # 设备标签页
│   │       │   ├── FileExplorerTab.tsx # 文件浏览器标签页
│   │       │   ├── TerminalTab.tsx    # 终端标签页
│   │       │   └── GitTab.tsx         # Git 源代码管理标签页
│   │       ├── FileExplorer.tsx       # Monaco Editor 文件浏览器
│   │       ├── Terminal.tsx           # xterm.js 终端
│   │       ├── GitPanel.tsx           # Git 面板组件
│   │       ├── GitDecorator.ts        # Git 装饰器（行标记）
│   │       └── types.ts               # 工作区类型定义
│   ├── hooks/
│   │   ├── useResourceSniffer.ts      # 资源嗅探 Hook
│   │   ├── useWorkspace.ts            # 工作区状态 Hook
│   │   ├── useTerminal.ts             # 终端会话 Hook
│   │   └── useGit.ts                  # Git 操作 Hook
│   ├── services/
│   │   ├── a2ui-service.ts            # A2UI 服务
│   │   ├── resource-service.ts        # 资源管理服务
│   │   ├── workspace-service.ts       # 工作区服务
│   │   └── git-service.ts             # Git 服务
│   └── lib/
│       ├── a2ui-parser.ts             # A2UI 解析器
│       └── resource-detector.ts       # 资源检测器
└── tests/
    ├── unit/
    │   ├── a2ui/
    │   ├── resource/
    │   └── workspace/
    └── integration/
        └── workspace-flow.test.ts

backend/
├── src/
│   ├── api/
│   │   ├── a2ui/
│   │   │   └── a2ui.controller.ts     # A2UI API 控制器
│   │   ├── resource/
│   │   │   └── resource.controller.ts # 资源 API 控制器
│   │   ├── workspace/
│   │   │   └── workspace.controller.ts # 工作区 API 控制器
│   │   └── git/
│   │       └── git.controller.ts      # Git API 控制器
│   ├── services/
│   │   ├── resource-storage.service.ts # 资源存储服务
│   │   ├── terminal-proxy.service.ts   # 终端代理服务
│   │   └── git-proxy.service.ts        # Git 代理服务
│   └── models/
│       ├── resource.model.ts          # 资源数据模型
│       ├── workspace.model.ts         # 工作区数据模型
│       └── git-repository.model.ts    # Git 仓库数据模型
└── tests/
    └── api/
        ├── a2ui.test.ts
        ├── resource.test.ts
        ├── workspace.test.ts
        └── git.test.ts
```

**Structure Decision**: 采用 Web Application 结构（frontend + backend），前端使用 Next.js 14+ 和 React 18+，后端使用 Node.js + TypeScript。组件按功能模块组织（a2ui、resource、workspace、git），每个模块包含组件、服务、类型定义和测试。Git 集成通过设备服务代理实现，前端使用 Monaco Editor Diff 和 Git 装饰器提供可视化支持。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无违规项，本节留空。
