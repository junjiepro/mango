# Tasks: Mango - 智能Agent对话平台

**Feature**: 001-agent-chat-platform
**Input**: Design documents from `/specs/001-agent-chat-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are OPTIONAL - only included where explicitly beneficial for core flows

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md monorepo structure:

- **Web App**: `apps/web/src/`
- **CLI Tool**: `apps/cli/src/`
- **Shared Packages**: `packages/`
- **Supabase**: `supabase/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure

- [X] T001 Initialize monorepo with pnpm workspaces in root `pnpm-workspace.yaml`
- [X] T002 [P] Create Next.js 14+ app in `apps/web/` using App Router
- [X] T003 [P] Create CLI app scaffolding in `apps/cli/` with TypeScript
- [X] T004 [P] Configure TypeScript 5.x strict mode in root `tsconfig.json` and workspace-level configs
- [X] T005 [P] Setup ESLint + Prettier in `.eslintrc.js` and `.prettierrc`
- [X] T006 [P] Configure TailwindCSS in `apps/web/tailwind.config.ts`
- [X] T007 [P] Create shared types package in `packages/shared/types/`
- [X] T008 [P] Setup Vitest configuration in `apps/web/vitest.config.ts`
- [X] T009 [P] Setup Playwright configuration in `apps/web/playwright.config.ts`
- [X] T010 [P] Create GitHub Actions CI workflow in `.github/workflows/ci.yml` (lint, test with 80% coverage gate, build)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Supabase Setup

- [X] T011 Initialize Supabase project locally using `supabase init` in root
- [X] T012 Create initial database migration for `user_profiles` table in `supabase/migrations/20250124000001_user_profiles.sql`
- [X] T013 [P] Create `conversations` table migration in `supabase/migrations/20250124000002_conversations.sql`
- [X] T014 [P] Create `messages` table migration in `supabase/migrations/20250124000003_messages.sql`
- [X] T015 [P] Create `attachments` table migration in `supabase/migrations/20250124000004_attachments.sql`
- [X] T016 [P] Create `tasks` table migration in `supabase/migrations/20250124000005_tasks.sql`
- [X] T017 [P] Create `tools` table migration in `supabase/migrations/20250124000006_tools.sql`
- [X] T018 [P] Create `mini_apps` and `mini_app_installations` table migration in `supabase/migrations/20250124000007_mini_apps.sql`
- [X] T019 [P] Create `mini_app_data` table migration in `supabase/migrations/20250124000008_mini_app_data.sql`
- [X] T020 [P] Create `feedback_records` and `learning_records` tables migration in `supabase/migrations/20250124000009_feedback_learning.sql`
- [X] T021 [P] Create `notifications` table migration in `supabase/migrations/20250124000010_notifications.sql`
- [X] T022 [P] Create `audit_logs` table migration in `supabase/migrations/20250124000011_audit_logs.sql`
- [X] T023 Create RLS policies migration for all tables in `supabase/migrations/20250124000012_rls_policies.sql`
- [X] T024 Create database indexes migration in `supabase/migrations/20250124000013_indexes.sql`
- [X] T025 Create triggers and functions migration in `supabase/migrations/20250124000014_triggers_functions.sql`
- [X] T026 Apply all migrations to local Supabase instance using `supabase db push`

### Authentication & Core Services

- [X] T027 [P] Setup Supabase Auth configuration in `apps/web/src/lib/supabase/auth-config.ts`
- [X] T028 [P] Create Supabase client factory in `apps/web/src/lib/supabase/client.ts` (browser client)
- [X] T029 [P] Create Supabase server client in `apps/web/src/lib/supabase/server.ts` (server-side)
- [X] T030 [P] Create authentication middleware in `apps/web/src/middleware.ts` for protected routes
- [X] T031 [P] Create shared TypeScript types from Supabase schema in `packages/shared/types/database.types.ts`
- [X] T032 [P] Create error handling utility in `packages/shared/utils/errors.ts`
- [X] T033 [P] Create logging utility in `packages/shared/utils/logger.ts`

### UI Foundation

- [X] T034 [P] Create base design system tokens (colors, spacing, typography) in `apps/web/src/styles/tokens.css`
- [X] T035 [P] Create reusable UI components: Button in `apps/web/src/components/ui/Button.tsx`
- [X] T036 [P] Create reusable UI components: Input in `apps/web/src/components/ui/Input.tsx`
- [X] T037 [P] Create reusable UI components: Modal in `apps/web/src/components/ui/Modal.tsx`
- [X] T038 [P] Create reusable UI components: Toast notification in `apps/web/src/components/ui/Toast.tsx`
- [X] T039 [P] Create loading states: Skeleton in `apps/web/src/components/ui/Skeleton.tsx`
- [X] T040 [P] Create error boundary component in `apps/web/src/components/ErrorBoundary.tsx`
- [X] T041 [P] Create layout component in `apps/web/src/components/layouts/MainLayout.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 与Agent进行对话完成任务 (Priority: P1) 🎯 MVP

**Goal**: 用户能够在Web应用中与Agent进行多模态对话,Agent能使用工具完成任务,任务可以后台执行

**Independent Test**: 发送一条简单文本指令(如"帮我查询今天的天气")并观察Agent响应

### Core Conversation Implementation

- [X] T042 [P] [US1] Create Conversation service in `apps/web/src/services/ConversationService.ts`
- [X] T043 [P] [US1] Create Message service in `apps/web/src/services/MessageService.ts`
- [X] T044 [P] [US1] Create Task service in `apps/web/src/services/TaskService.ts`
- [X] T045 [P] [US1] Create Realtime subscription hook in `apps/web/src/hooks/useRealtimeSubscription.ts`
- [X] T046 [P] [US1] Create Conversation context provider in `apps/web/src/contexts/ConversationContext.tsx`

### UI Components for Conversation

- [X] T047 [P] [US1] Create ConversationList component in `apps/web/src/components/conversation/ConversationList.tsx`
- [X] T048 [P] [US1] Create MessageList component in `apps/web/src/components/conversation/MessageList.tsx`
- [X] T049 [P] [US1] Create MessageInput component with multimodal support in `apps/web/src/components/conversation/MessageInput.tsx`
- [X] T050 [P] [US1] Create MessageItem component in `apps/web/src/components/conversation/MessageItem.tsx`
- [X] T051 [P] [US1] Create AttachmentUpload component in `apps/web/src/components/conversation/AttachmentUpload.tsx` ✅ 已完成
- [X] T052 [P] [US1] Create AttachmentPreview component in `apps/web/src/components/conversation/AttachmentPreview.tsx` ✅ 已完成
- [X] T053 [P] [US1] Create TaskProgressIndicator component in `apps/web/src/components/task/TaskProgressIndicator.tsx`

### Pages and Routes

- [X] T054 [US1] Create conversations list page in `apps/web/src/app/conversations/page.tsx`
- [X] T055 [US1] Create conversation detail page in `apps/web/src/app/conversations/[id]/page.tsx`
- [X] T056 [US1] Create API route for creating conversation in `apps/web/src/app/api/conversations/route.ts`
- [X] T057 [US1] Create API route for sending message in `apps/web/src/app/api/conversations/[id]/messages/route.ts`
- [X] T058 [US1] Create API route for uploading attachment in `apps/web/src/app/api/attachments/route.ts`

### MCP Protocol Integration

- [X] T059 [P] [US1] Create MCP protocol adapter base in `packages/protocols/mcp/adapter.ts` ✅ 使用官方 @modelcontextprotocol/sdk 实现
- [X] T060 [P] [US1] Create MCP client implementation in `packages/protocols/mcp/client.ts` ✅ 使用官方 SDK 的 StreamableHTTPClientTransport
- [X] T061 [P] [US1] Create MCP tool registry in `packages/protocols/mcp/registry.ts` ✅ 与官方 SDK 类型兼容
- [X] T062 [US1] Create MCP tool invocation service in `apps/web/src/services/MCPService.ts` ✅ 已完成
- [X] T063 [US1] Create API route for MCP tool invocation in `apps/web/src/app/api/tools/invoke/route.ts` ✅ 已完成

### Background Task Execution

- [X] T064 [US1] Create Supabase Edge Function for background tasks in `supabase/functions/process-task/index.ts` ✅ 已完成
- [X] T065 [US1] Implement task queue mechanism with PostgreSQL in Edge Function ✅ 已完成
- [X] T066 [US1] Create task status update via Realtime broadcasts ✅ 已完成
- [X] T067 [US1] Add task reconnection logic in `apps/web/src/hooks/useTaskMonitor.ts` ✅ 已完成

### Realtime Sync & Offline Support

- [X] T068 [US1] Implement message realtime subscription in ConversationContext ✅ 已完成
- [X] T069 [US1] Implement task progress realtime subscription in ConversationContext ✅ 已完成
- [X] T070 [US1] Add offline message queue in `apps/web/src/lib/offline-queue.ts` ✅ 已完成
- [X] T071 [US1] Add reconnection and sync logic in `apps/web/src/hooks/useOfflineSync.ts` ✅ 已完成

### Authentication & User Management

- [X] T072 [P] [US1] Create signup page in `apps/web/src/app/auth/signup/page.tsx`
- [X] T073 [P] [US1] Create login page in `apps/web/src/app/auth/login/page.tsx`
- [X] T074 [P] [US1] Create logout functionality in `apps/web/src/app/auth/logout/route.ts`
- [X] T075 [US1] Create user profile service in `apps/web/src/services/UserService.ts`
- [X] T076 [US1] Create user profile page in `apps/web/src/app/profile/page.tsx`
- [X] T076a [P] [US1] Create password reset request page in `apps/web/src/app/auth/reset-password/page.tsx`
- [X] T076b [P] [US1] Create password update page in `apps/web/src/app/auth/update-password/page.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create conversations, send multimodal messages, and see background task execution

---

## Phase 4: User Story 2 - 使用和管理小应用 (Priority: P2)

**Goal**: Agent能创建小应用,小应用支持被动调用和主动触发,用户可以分享小应用

**Independent Test**: 让Agent创建一个简单的待办事项小应用,添加待办,设置提醒,验证提醒触发

### MiniApp Runtime Foundation

- [ ] T077 [P] [US2] Create MiniApp sandbox core in `packages/miniapp-runtime/core/sandbox.ts`
- [ ] T078 [P] [US2] Create MiniApp API interface definitions in `packages/miniapp-runtime/apis/types.ts`
- [ ] T079 [P] [US2] Create MiniApp permission system in `packages/miniapp-runtime/core/permissions.ts`
- [ ] T080 [P] [US2] Create MiniApp secure message bridge in `packages/miniapp-runtime/core/message-bridge.ts`
- [ ] T081 [P] [US2] Create MiniApp storage API in `packages/miniapp-runtime/apis/storage.ts`
- [ ] T082 [P] [US2] Create MiniApp notification API in `packages/miniapp-runtime/apis/notification.ts`

### MiniApp Services

- [ ] T083 [P] [US2] Create MiniApp service in `apps/web/src/services/MiniAppService.ts`
- [ ] T084 [P] [US2] Create MiniApp installation service in `apps/web/src/services/MiniAppInstallationService.ts`
- [ ] T085 [US2] Create API route for creating MiniApp in `apps/web/src/app/api/miniapps/route.ts`
- [ ] T086 [US2] Create API route for installing MiniApp in `apps/web/src/app/api/miniapps/[id]/install/route.ts`
- [ ] T087 [US2] Create API route for MiniApp data CRUD in `apps/web/src/app/api/miniapp-data/route.ts`

### MiniApp UI Components

- [ ] T088 [P] [US2] Create MiniAppContainer component in `apps/web/src/components/miniapp/MiniAppContainer.tsx`
- [ ] T089 [P] [US2] Create MiniAppCard component in `apps/web/src/components/miniapp/MiniAppCard.tsx`
- [ ] T090 [P] [US2] Create MiniAppPermissionDialog component in `apps/web/src/components/miniapp/PermissionDialog.tsx`
- [ ] T091 [P] [US2] Create MiniAppList component in `apps/web/src/components/miniapp/MiniAppList.tsx`
- [ ] T092 [US2] Create MiniApp gallery page in `apps/web/src/app/miniapps/page.tsx`
- [ ] T093 [US2] Create MiniApp detail page in `apps/web/src/app/miniapps/[id]/page.tsx`

### Active Triggering & Notifications

- [ ] T094 [US2] Create Supabase Edge Function for scheduled MiniApp triggers in `supabase/functions/miniapp-scheduler/index.ts`
- [ ] T095 [US2] Implement Service Worker for MiniApp notifications in `apps/web/public/service-worker.js`
- [ ] T096 [US2] Create notification subscription logic in `apps/web/src/hooks/useNotifications.ts`
- [ ] T097 [US2] Add MiniApp trigger configuration UI in MiniApp settings

### MiniApp Sharing

- [ ] T098 [P] [US2] Create MiniApp sharing service in `apps/web/src/services/SharingService.ts`
- [ ] T099 [P] [US2] Create share link generation in API route `apps/web/src/app/api/miniapps/[id]/share/route.ts`
- [ ] T100 [US2] Create MiniApp import from share link in `apps/web/src/app/miniapps/import/[shareToken]/page.tsx`
- [ ] T101 [US2] Add sharing UI button and dialog in MiniAppCard component

### Integration with Conversations

- [ ] T102 [US2] Integrate MiniApp invocation in MessageInput component
- [ ] T103 [US2] Add MiniApp message rendering in MessageItem component
- [ ] T104 [US2] Create MiniApp trigger handler in ConversationContext

**Checkpoint**: User Story 2 complete - MiniApps can be created, used passively/actively, and shared

---

## Phase 5: User Story 3 - 通过CLI工具接入本地MCP/ACP服务 (Priority: P3)

**Goal**: 技术用户通过CLI配置本地MCP/ACP服务,Agent可调用这些服务

**Independent Test**: 安装CLI,配置本地MCP服务,在对话中让Agent调用该服务

### CLI Core Infrastructure

- [ ] T105 [P] [US3] Create CLI command parser in `apps/cli/src/lib/commander.ts`
- [ ] T106 [P] [US3] Create CLI config manager in `apps/cli/src/lib/config.ts`
- [ ] T107 [P] [US3] Create authentication flow for CLI in `apps/cli/src/commands/auth.ts`
- [ ] T107a [P] [US3] Implement secure token storage in `apps/cli/src/lib/token-manager.ts` (OS keychain or encrypted file)
- [ ] T107b [P] [US3] Create API key generation endpoint in `apps/web/src/app/api/cli/api-keys/route.ts`
- [ ] T107c [US3] Implement API key validation middleware in `apps/web/src/app/api/cli/auth/middleware.ts`
- [ ] T107d [US3] Add token refresh mechanism in `apps/cli/src/lib/auth-refresh.ts`
- [ ] T108 [P] [US3] Create CLI output formatter in `apps/cli/src/lib/formatter.ts`

### MCP/ACP Service Management

- [ ] T109 [P] [US3] Create service registry command in `apps/cli/src/commands/service/register.ts`
- [ ] T110 [P] [US3] Create service list command in `apps/cli/src/commands/service/list.ts`
- [ ] T111 [P] [US3] Create service unregister command in `apps/cli/src/commands/service/unregister.ts`
- [ ] T112 [P] [US3] Create service status command in `apps/cli/src/commands/service/status.ts`
- [ ] T113 [US3] Create API route for CLI service registration in `apps/web/src/app/api/cli/services/route.ts`

### Local Service Connectivity

- [ ] T114 [P] [US3] Create local service connector in `apps/cli/src/lib/connectors/local-connector.ts`
- [ ] T115 [P] [US3] Create MCP stdio transport in `packages/protocols/mcp/transports/stdio.ts`
- [ ] T116 [P] [US3] Create ACP protocol adapter in `packages/protocols/acp/adapter.ts`
- [ ] T117 [US3] Create service health check in `apps/cli/src/lib/health-check.ts`
- [ ] T118 [US3] Create service proxy in backend API route `apps/web/src/app/api/services/proxy/route.ts`

### CLI User Experience

- [ ] T119 [P] [US3] Create CLI help and documentation commands in `apps/cli/src/commands/help.ts`
- [ ] T120 [P] [US3] Create CLI version command in `apps/cli/src/commands/version.ts`
- [ ] T121 [P] [US3] Create CLI init wizard in `apps/cli/src/commands/init.ts`
- [ ] T122 [US3] Package CLI as executable using pkg/ncc in `apps/cli/package.json`
- [ ] T123 [US3] Create CLI installation and security documentation in `apps/cli/README.md` (包含API key管理和安全最佳实践)

### Backend Integration

- [ ] T124 [US3] Update Tool Registry to include user-registered local services
- [ ] T125 [US3] Add service availability check in MCPService before invocation
- [ ] T126 [US3] Create user service management UI in `apps/web/src/app/settings/services/page.tsx`

**Checkpoint**: User Story 3 complete - CLI tool enables local MCP/ACP service integration

---

## Phase 6: User Story 4 - Agent持续学习与改进 (Priority: P4)

**Goal**: Agent学习用户反馈,优化后续任务执行

**Independent Test**: 多次执行同类任务并提供反馈,观察Agent是否改进

### Feedback Collection

- [ ] T127 [P] [US4] Create Feedback service in `apps/web/src/services/FeedbackService.ts`
- [ ] T128 [P] [US4] Create Learning service in `apps/web/src/services/LearningService.ts`
- [ ] T129 [P] [US4] Create API route for submitting feedback in `apps/web/src/app/api/feedback/route.ts`
- [ ] T130 [P] [US4] Create API route for learning rules in `apps/web/src/app/api/learning/rules/route.ts`

### Feedback UI Components

- [ ] T131 [P] [US4] Create FeedbackButton component in `apps/web/src/components/feedback/FeedbackButton.tsx`
- [ ] T132 [P] [US4] Create FeedbackDialog component in `apps/web/src/components/feedback/FeedbackDialog.tsx`
- [ ] T133 [US4] Integrate FeedbackButton in MessageItem component
- [ ] T134 [US4] Integrate FeedbackButton in TaskProgressIndicator component

### Learning Rule Extraction

- [ ] T135 [US4] Create Supabase Edge Function for rule extraction in `supabase/functions/extract-learning-rules/index.ts`
- [ ] T136 [US4] Implement signal aggregation logic (feedback, behavior, implicit signals)
- [ ] T137 [US4] Implement pattern recognition using clustering
- [ ] T138 [US4] Implement rule confidence scoring

### Learning Rule Application

- [ ] T139 [P] [US4] Create prompt engineering service in `apps/web/src/services/PromptService.ts`
- [ ] T140 [US4] Integrate learning rules into Agent request context
- [ ] T141 [US4] Create RAG knowledge base in `supabase/functions/rag-search/index.ts`
- [ ] T142 [US4] Add rule application tracking in Task execution

### User Learning Data Management

- [ ] T143 [P] [US4] Create learning summary page in `apps/web/src/app/learning/page.tsx`
- [ ] T144 [P] [US4] Create learning rules list component in `apps/web/src/components/learning/RulesList.tsx`
- [ ] T145 [US4] Create API route for deleting learning data in `apps/web/src/app/api/learning/cleanup/route.ts`
- [ ] T146 [US4] Create data export functionality in `apps/web/src/app/api/learning/export/route.ts`

**Checkpoint**: User Story 4 complete - Agent learns from feedback and improves over time

---

## Phase 7: User Story 5 - 多模态内容的适应性展示 (Priority: P5)

**Goal**: 根据内容类型和数量,自动选择合适展示方式

**Independent Test**: 发送单张图片、多张图片、混合文件,验证展示方式

### Adaptive Content Display

- [ ] T147 [P] [US5] Create content analyzer utility in `apps/web/src/lib/content-analyzer.ts`
- [ ] T148 [P] [US5] Create FileGrid component for multiple files in `apps/web/src/components/content/FileGrid.tsx`
- [ ] T149 [P] [US5] Create FileTree component for directory structure in `apps/web/src/components/content/FileTree.tsx`
- [ ] T150 [P] [US5] Create MediaGallery component for images in `apps/web/src/components/content/MediaGallery.tsx`
- [ ] T151 [P] [US5] Create DocumentViewer component in `apps/web/src/components/content/DocumentViewer.tsx`
- [ ] T152 [US5] Update MessageItem component to use adaptive display logic

### Content Filtering & Search

- [ ] T153 [P] [US5] Create content filter UI in `apps/web/src/components/content/ContentFilter.tsx`
- [ ] T154 [P] [US5] Create search bar for conversation content in `apps/web/src/components/conversation/SearchBar.tsx`
- [ ] T155 [US5] Implement content search API route in `apps/web/src/app/api/search/route.ts`
- [ ] T156 [US5] Add full-text search support using PostgreSQL GIN indexes

**Checkpoint**: User Story 5 complete - Content displays adaptively based on type and quantity

---

## Phase 8: User Story 6 - 多语言国际化支持 (Priority: P6)

**Goal**: 支持中文和英文界面,Agent理解多语言用户输入

**Independent Test**: 切换界面语言验证所有元素翻译,用不同语言与Agent对话

### i18n Infrastructure

- [ ] T157 [P] [US6] Setup next-intl library in `apps/web/src/i18n/config.ts`
- [ ] T158 [P] [US6] Create English translations in `apps/web/messages/en.json`
- [ ] T159 [P] [US6] Create Chinese translations in `apps/web/messages/zh.json`
- [ ] T160 [P] [US6] Create locale middleware in `apps/web/src/middleware.ts` (update existing)
- [ ] T161 [P] [US6] Create language switcher component in `apps/web/src/components/LanguageSwitcher.tsx`

### Translation Coverage

- [ ] T162 [P] [US6] Translate all UI components in conversations module
- [ ] T163 [P] [US6] Translate all UI components in MiniApps module
- [ ] T164 [P] [US6] Translate all UI components in user profile and settings
- [ ] T165 [P] [US6] Translate error messages in `packages/shared/utils/errors.ts`
- [ ] T166 [P] [US6] Translate notification messages
- [ ] T167 [P] [US6] Translate CLI tool messages in `apps/cli/messages/`

### Locale Detection & Persistence

- [ ] T168 [US6] Implement browser locale detection
- [ ] T169 [US6] Store user language preference in user_profiles.preferences
- [ ] T170 [US6] Create API route for updating language preference in `apps/web/src/app/api/profile/language/route.ts`

### Agent Multilingual Support

- [ ] T171 [US6] Implement language detection in user messages
- [ ] T172 [US6] Pass detected language to Agent context in prompt
- [ ] T173 [US6] Validate Agent responses maintain same language as user input

**Checkpoint**: User Story 6 complete - Full i18n support for Chinese and English

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Performance Optimization

- [ ] T174 [P] Optimize database queries with proper indexes (review all tables)
- [ ] T175 [P] Implement connection pooling for Supabase (PgBouncer config)
- [ ] T176 [P] Add React.memo and useMemo for expensive components
- [ ] T177 [P] Implement code splitting for large components using next/dynamic
- [ ] T178 [P] Optimize image loading with next/image
- [ ] T179 [P] Add debouncing for realtime subscription updates (300-500ms)
- [ ] T180 Run Lighthouse audit and address performance issues

### Security Hardening

- [ ] T181 [P] Review and test all RLS policies in Supabase
- [ ] T182 [P] Implement rate limiting for API routes using upstash/ratelimit
- [ ] T183 [P] Add CSRF protection in forms
- [ ] T184 [P] Sanitize user inputs (XSS prevention)
- [ ] T185 [P] Add security headers in next.config.js
- [ ] T186 [P] Audit MiniApp sandbox escape vectors
- [ ] T187 Conduct penetration testing

### Testing & Quality

- [ ] T188 [P] Write unit tests for core services in `apps/web/tests/unit/services/`
- [ ] T189 [P] Write unit tests for utility functions in `packages/shared/utils/`
- [ ] T190 [P] Write integration tests for API routes in `apps/web/tests/integration/api/`
- [ ] T191 [P] Write E2E tests for critical user flows in `apps/web/tests/e2e/`
- [ ] T192 Run E2E test suite with Playwright
- [ ] T193 Achieve 80%+ code coverage on core business logic
- [ ] T194 Configure coverage reporting in `apps/web/vitest.config.ts` with 80% thresholds
- [ ] T195 Verify CI pipeline blocks merge when coverage falls below 80%
- [ ] T196 Run quickstart.md validation steps

### Documentation

- [ ] T197 [P] Update README.md with project overview and setup instructions
- [ ] T198 [P] Create API documentation using Swagger UI for OpenAPI spec
- [ ] T199 [P] Document MiniApp development guide in `docs/miniapp-development.md`
- [ ] T200 [P] Document CLI usage guide (update `apps/cli/README.md`)
- [ ] T201 [P] Create architecture decision records in `docs/adr/`
- [ ] T202 Document deployment guide in `docs/deployment.md`

### Monitoring & Observability

- [ ] T203 [P] Setup Supabase Analytics dashboards
- [ ] T204 [P] Implement custom metrics collection (task completion rate, agent response time)
- [ ] T205 [P] Add error tracking (e.g., Sentry) in `apps/web/src/lib/sentry.ts`
- [ ] T206 Setup alerts for critical failures

### Deployment Preparation

- [ ] T207 Create production Supabase project
- [ ] T208 Apply all migrations to production database
- [ ] T209 Configure environment variables for production
- [ ] T210 Setup Vercel deployment for `apps/web`
- [ ] T211 Configure CDN and edge caching
- [ ] T212 Create deployment checklist based on `quickstart.md` section 8.2

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 → US2 → US3 → US4 → US5 → US6
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Core Conversation**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2) - MiniApps**: Can start after Foundational - Integrates with US1 (messages) but independently testable
- **User Story 3 (P3) - CLI Tool**: Can start after Foundational - Integrates with US1 (tool invocation) but independently testable
- **User Story 4 (P4) - Learning**: Can start after Foundational - Integrates with US1 (feedback on messages/tasks) but independently testable
- **User Story 5 (P5) - Adaptive Display**: Can start after US1 complete (requires MessageItem component)
- **User Story 6 (P6) - i18n**: Can start after US1-US5 UI complete (translates existing UI)

### Within Each User Story

- Models/services before components
- Components before pages
- API routes can be developed in parallel with components
- Core implementation before integration

### Parallel Opportunities

- **Setup tasks**: T002-T010 all marked [P] can run simultaneously
- **Database migrations**: T013-T022 all marked [P] can run simultaneously after T012
- **Foundational tasks**: T027-T041 all marked [P] can run after migrations complete
- **US1 services**: T042-T044, T059-T061 can run in parallel
- **US1 UI components**: T047-T053 can run in parallel
- **US2 runtime**: T077-T082 can run in parallel
- **US2 UI**: T088-T091 can run in parallel
- **US3 CLI**: T105-T108, T109-T112, T114-T116 can run in parallel
- **US4 services**: T127-T130 can run in parallel
- **US4 UI**: T131-T132 can run in parallel
- **US5 components**: T147-T151, T153-T154 can run in parallel
- **US6 translations**: T158-T159, T162-T167 can run in parallel
- **Polish**: T174-T179 (performance), T181-T186 (security), T188-T191 (testing), T195-T199 (docs), T201-T203 (monitoring) - most can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all services for User Story 1 together:
Task: "Create Conversation service in apps/web/src/services/ConversationService.ts"
Task: "Create Message service in apps/web/src/services/MessageService.ts"
Task: "Create Task service in apps/web/src/services/TaskService.ts"
Task: "Create Realtime subscription hook in apps/web/src/hooks/useRealtimeSubscription.ts"
Task: "Create Conversation context provider in apps/web/src/contexts/ConversationContext.tsx"

# Launch all UI components for User Story 1 together:
Task: "Create ConversationList component in apps/web/src/components/conversation/ConversationList.tsx"
Task: "Create MessageList component in apps/web/src/components/conversation/MessageList.tsx"
Task: "Create MessageInput component in apps/web/src/components/conversation/MessageInput.tsx"
Task: "Create MessageItem component in apps/web/src/components/conversation/MessageItem.tsx"
Task: "Create AttachmentUpload component in apps/web/src/components/conversation/AttachmentUpload.tsx"
Task: "Create AttachmentPreview component in apps/web/src/components/conversation/AttachmentPreview.tsx"
Task: "Create TaskProgressIndicator component in apps/web/src/components/task/TaskProgressIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T041) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T042-T076)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - User can sign up/login
   - User can create conversation and send text message
   - User can upload image/file attachment
   - Agent responds in conversation
   - Task runs in background even after user closes window
   - User returns and sees task progress/result
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational (Phases 1-2) → Foundation ready
2. Add User Story 1 (Phase 3) → Test independently → **Deploy/Demo (MVP!)**
3. Add User Story 2 (Phase 4) → Test independently → Deploy/Demo (MiniApps added)
4. Add User Story 3 (Phase 5) → Test independently → Deploy/Demo (CLI tool added)
5. Add User Story 4 (Phase 6) → Test independently → Deploy/Demo (Learning added)
6. Add User Story 5 (Phase 7) → Test independently → Deploy/Demo (Adaptive UI added)
7. Add User Story 6 (Phase 8) → Test independently → Deploy/Demo (i18n added)
8. Polish (Phase 9) → Production-ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done:
   - Developer A: User Story 1 (Phase 3)
   - Developer B: User Story 2 (Phase 4) - starts after US1 UI framework is clear
   - Developer C: User Story 3 (Phase 5) - can start in parallel
3. Then continue with US4-US6 as needed
4. All developers contribute to Polish phase

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Independently completable and testable
- **Commit frequently**: After each task or logical group
- **Stop at checkpoints**: Validate story independently before moving to next
- **Database first**: Complete all migrations (T011-T026) before building services
- **UI foundation first**: Complete reusable components (T034-T041) before story-specific UI
- **Test as you go**: Don't wait until the end to test user stories
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence

---

**Total Tasks**: 217

**Task Distribution by Story**:

- Setup: 10 tasks
- Foundational: 31 tasks
- User Story 1 (P1): 35 tasks
- User Story 2 (P2): 28 tasks
- User Story 3 (P3): 26 tasks (原22 + 4认证任务)
- User Story 4 (P4): 20 tasks
- User Story 5 (P5): 10 tasks
- User Story 6 (P6): 17 tasks
- Polish: 40 tasks (原37 + 3覆盖率验证任务)

**Parallel Opportunities**: ~125 tasks marked [P] can run concurrently within their phase

**Suggested MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = 76 tasks (unchanged)

---

**Generated**: 2025-11-25
**Based on**: spec.md, plan.md, research.md, data-model.md, contracts/
