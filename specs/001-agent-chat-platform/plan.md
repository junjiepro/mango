# Implementation Plan: CLI工具与设备服务 (User Story 3)

**Branch**: `001-agent-chat-platform` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-chat-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

实现 CLI 工具和设备服务，允许技术用户在本地启动设备服务，通过 Cloudflare Tunnel 将本地 MCP/ACP 服务暴露给 Mango 平台。核心功能包括：

1. **CLI 工具**: 提供命令行工具，支持参数配置（app_url、supabase_url、device_secret 等），自动生成 device_secret
2. **设备服务**: 启动本地 HTTP 服务，提供 /health、/mcp、/acp、/setting、/bind 端点
3. **Cloudflare Tunnel**: 自动创建临时隧道，将本地服务暴露到公网
4. **设备绑定**: 支持设备与用户的多对多绑定关系，每个绑定拥有独立配置和资源隔离
5. **MCP/ACP 代理**: 设备服务代理访问本地配置的 MCP/ACP 服务，提供 streamable HTTP MCP 服务

**技术方案**: 使用 TypeScript + Node.js/Deno 构建跨平台 CLI 工具，使用 Hono 框架构建轻量级设备服务，集成 Cloudflare Tunnel 和 MCP SDK，数据存储在 Supabase PostgreSQL 和本地文件系统。

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+ / Deno 2.x)
**Primary Dependencies**:
- CLI工具: Commander.js (命令行解析), @cloudflare/cloudflared (Tunnel创建)
- 设备服务: Hono (轻量级HTTP框架，支持Node.js和Deno), @modelcontextprotocol/sdk (MCP协议实现)
- Web端: Next.js 14+, React 18+, Supabase Client
- 共享: Zod (参数验证), dotenv (环境变量管理)

**Storage**:
- Supabase PostgreSQL (设备信息、绑定关系、tunnel URL、配置数据)
- 本地文件系统 (device_secret 持久化、MCP/ACP 服务配置)

**Testing**: Vitest (单元测试), Playwright (E2E测试)

**Target Platform**:
- CLI工具: Windows/macOS/Linux (跨平台Node.js/Deno应用)
- 设备服务: 本地运行的HTTP服务，通过Cloudflare Tunnel暴露
- Web端: 现代浏览器 (Chrome/Firefox/Safari/Edge最近两个版本)

**Project Type**: Web应用 + CLI工具 (混合架构)

**Performance Goals**:
- CLI启动时间: <3秒
- 设备服务启动: <5秒 (包含Tunnel创建)
- MCP请求代理延迟: <100ms (p95)
- Tunnel连接建立: <10秒

**Constraints**:
- 设备服务内存占用: <200MB
- 支持离线配置管理 (本地配置文件)
- Cloudflare Tunnel依赖: 需要cloudflared CLI工具
- 安全性: device_secret必须安全存储，tunnel通信必须加密

**Scale/Scope**:
- 支持单用户多设备绑定 (预期每用户1-5个设备)
- 每个设备支持配置多个MCP/ACP服务 (预期5-20个)
- 并发MCP请求: 每设备支持10个并发请求

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality First ✅

- **可读性**: CLI工具和设备服务将使用清晰的命名约定，TypeScript类型定义确保代码自文档化
- **单一职责**:
  - CLI工具负责命令行解析和参数处理
  - 设备服务负责HTTP端点和MCP/ACP代理
  - Tunnel管理器负责Cloudflare Tunnel生命周期
- **低耦合高内聚**: 各模块通过明确的接口通信，设备服务与Web端通过REST API解耦
- **无重复**: 共享的配置验证、错误处理逻辑将抽取为公共模块
- **静态分析**: 使用TypeScript严格模式，配置ESLint和Prettier，CI中强制零警告
- **代码审查**: 所有PR必须经过审查

### Testing Standards ✅

- **测试覆盖率**: 核心业务逻辑（设备绑定、MCP代理、Tunnel管理）目标覆盖率80%+
- **测试金字塔**:
  - 单元测试: 配置解析、参数验证、错误处理
  - 集成测试: 设备服务端点、MCP代理转发
  - E2E测试: CLI启动→Tunnel创建→设备绑定→MCP调用完整流程
- **测试隔离**: 使用mock隔离外部依赖（Cloudflare API、Supabase、本地MCP服务）
- **边界测试**: 测试无效device_secret、Tunnel创建失败、MCP服务不可用等场景
- **持续集成**: 所有测试在CI中自动执行

### User Experience Consistency ✅

- **设计规范**: CLI输出使用一致的格式（成功/错误/警告），Web端设备管理界面遵循现有设计系统
- **交互一致性**: 设备绑定流程与现有用户流程保持一致
- **响应反馈**: CLI操作提供实时进度反馈，设备服务健康检查<100ms响应
- **错误处理**: 提供友好的错误信息和解决建议（如"Cloudflare Tunnel创建失败，请检查网络连接"）
- **可访问性**: Web端设备管理界面满足WCAG 2.1 AA标准

### Performance Requirements ✅

- **首屏加载**: Web端设备管理页面<2秒加载
- **交互响应**: CLI命令响应<100ms，设备服务端点响应<100ms
- **API响应**: MCP代理请求p95延迟<100ms
- **内存效率**: 设备服务内存占用<200MB，无内存泄漏
- **性能监控**: 记录Tunnel连接时间、MCP请求延迟等关键指标
- **性能预算**: 新功能不影响现有对话功能性能

### Quality Gates ✅

**提交前检查**:
- Prettier格式化
- ESLint零警告
- TypeScript类型检查通过
- Conventional Commits规范

**合并前检查**:
- 所有单元测试和集成测试通过
- 代码审查批准
- Constitution合规性确认

**发布前检查**:
- E2E测试通过
- 性能基准测试通过
- 安全扫描无高危漏洞
- 文档更新（README、API文档）

### 结论

✅ **通过** - 该实现计划符合所有宪法原则，无需记录违规项。设计遵循KISS和YAGNI原则，避免过度工程化，专注于User Story 3的核心需求。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# CLI工具和设备服务 (新增)
packages/
├── mango-cli/                    # CLI工具包
│   ├── src/
│   │   ├── commands/            # 命令实现
│   │   │   ├── start.ts        # 启动设备服务命令
│   │   │   └── config.ts       # 配置管理命令
│   │   ├── services/           # 核心服务
│   │   │   ├── device-service.ts      # 设备服务主逻辑
│   │   │   ├── tunnel-manager.ts      # Cloudflare Tunnel管理
│   │   │   ├── mcp-proxy.ts          # MCP协议代理
│   │   │   └── acp-proxy.ts          # ACP协议代理
│   │   ├── config/             # 配置管理
│   │   │   ├── config-loader.ts      # 配置加载
│   │   │   └── secret-manager.ts     # device_secret管理
│   │   ├── utils/              # 工具函数
│   │   └── index.ts            # CLI入口
│   ├── tests/
│   │   ├── unit/              # 单元测试
│   │   ├── integration/       # 集成测试
│   │   └── e2e/              # 端到端测试
│   └── package.json

# Web端 (现有，需扩展)
apps/web/
├── src/
│   ├── app/
│   │   └── devices/           # 设备管理页面 (新增)
│   │       ├── page.tsx
│   │       └── [deviceId]/
│   ├── components/
│   │   └── device/            # 设备相关组件 (新增)
│   │       ├── DeviceList.tsx
│   │       ├── DeviceBinding.tsx
│   │       └── DeviceSettings.tsx
│   └── services/
│       └── DeviceService.ts   # 设备服务API客户端 (新增)

# Supabase函数 (现有，需扩展)
supabase/
├── functions/
│   └── device-proxy/          # 设备代理函数 (新增)
│       └── index.ts          # 转发Agent请求到设备Tunnel
└── migrations/
    └── 20250116000000_device_binding.sql  # 设备绑定表结构 (新增)
```

**Structure Decision**:

采用 **Monorepo + Web应用** 混合架构：

1. **packages/mango-cli**: 独立的CLI工具包，可单独发布到npm，支持用户通过 `npx @mango/cli start` 启动
2. **apps/web**: 现有Web应用，扩展设备管理功能
3. **supabase/functions**: Serverless函数，作为Agent与设备之间的代理层

这种结构的优势：
- CLI工具独立打包，便于分发和版本管理
- Web端和CLI共享TypeScript类型定义（通过workspace）
- 设备服务可以选择Node.js或Deno运行时
- 清晰的职责分离：CLI负责本地服务，Web负责用户界面，Supabase Functions负责云端代理

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
