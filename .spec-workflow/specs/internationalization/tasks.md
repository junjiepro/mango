# Tasks Document

- [x] 1. 安装和配置 next-intl 核心包
  - File: package.json, next.config.ts
  - 安装 next-intl 依赖包并配置 Next.js 插件
  - 更新 next.config.ts 以支持 next-intl 插件
  - Purpose: 建立 i18n 基础设施
  - _Leverage: 现有的 next.config.ts 配置结构_
  - _Requirements: 5.1, 5.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js Developer specializing in application configuration and package management | Task: Install next-intl package and configure Next.js plugin following requirements 5.1 and 5.2, updating existing next.config.ts configuration structure | Restrictions: Do not break existing Next.js configuration, maintain TypeScript support, ensure compatibility with current build process | Success: next-intl package installed successfully, Next.js plugin configured correctly, application builds without errors | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 2. 创建国际化路由配置
  - File: src/i18n/routing.ts
  - 定义支持的语言列表和默认语言配置
  - 配置路由策略和语言前缀规则
  - Purpose: 建立多语言路由基础
  - _Leverage: Next.js App Router 架构_
  - _Requirements: 3.1, 3.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Architect with expertise in Next.js routing and internationalization | Task: Create routing configuration defining supported languages and routing strategies following requirements 3.1 and 3.2, leveraging Next.js App Router architecture | Restrictions: Must support only Chinese and English, follow Next.js routing conventions, ensure SEO-friendly URLs | Success: Routing configuration is properly defined, supports zh/en locales, follows Next.js patterns | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 3. 实现服务器端 i18n 请求配置
  - File: src/i18n/request.ts
  - 创建 getRequestConfig 函数配置服务器端 i18n
  - 实现动态翻译文件加载逻辑
  - Purpose: 为服务器组件提供 i18n 支持
  - _Leverage: Next.js Server Components 架构_
  - _Requirements: 1.1, 1.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in Next.js Server Components and i18n configuration | Task: Implement server-side i18n request configuration following requirements 1.1 and 1.2, using Next.js Server Components architecture for dynamic translation loading | Restrictions: Must support SSR optimization, ensure translation file loading efficiency, maintain type safety | Success: Server-side i18n works correctly, translation files load dynamically, SSR performance is optimized | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 4. 创建翻译消息文件结构
  - File: messages/zh.json, messages/en.json
  - 创建中文和英文翻译文件的基础结构
  - 实现认证、导航和通用消息的翻译
  - Purpose: 提供完整的翻译内容支持
  - _Leverage: 现有的 UI 文本和认证流程_
  - _Requirements: 1.1, 4.1, 4.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: UX Writer and Localization Specialist with expertise in content translation and JSON structure | Task: Create comprehensive translation message files following requirements 1.1, 4.1, and 4.2, translating existing UI text and authentication flow content | Restrictions: Must maintain consistent tone and terminology, ensure cultural appropriateness, follow JSON schema for message organization | Success: Translation files are complete and well-organized, all UI text translated accurately, messages support interpolation | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 5. 配置中间件以支持语言路由
  - File: middleware.ts (修改现有文件)
  - 集成 next-intl 中间件到现有的认证中间件
  - 实现语言检测和重定向逻辑
  - Purpose: 处理基于语言的路由和用户偏好
  - _Leverage: src/middleware.ts 现有认证中间件_
  - _Requirements: 2.1, 3.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Middleware Developer with expertise in Next.js middleware and request processing | Task: Integrate next-intl middleware with existing authentication middleware following requirements 2.1 and 3.3, implementing language detection and redirect logic | Restrictions: Must not break existing authentication flow, maintain middleware performance, ensure proper request processing order | Success: Language routing works correctly, integrates seamlessly with auth middleware, user language preferences are respected | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 6. 更新根布局以支持国际化
  - File: src/app/layout.tsx (修改现有文件)
  - 集成 NextIntlClientProvider 到现有布局
  - 配置客户端 i18n 提供者
  - Purpose: 为客户端组件提供 i18n 上下文
  - _Leverage: src/app/layout.tsx 现有布局和 AuthProvider_
  - _Requirements: 1.1, 1.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Developer with expertise in context providers and Next.js layout patterns | Task: Integrate NextIntlClientProvider into existing root layout following requirements 1.1 and 1.3, working alongside existing AuthProvider | Restrictions: Must not disrupt existing provider chain, maintain layout performance, ensure proper provider nesting | Success: Client-side i18n context is available throughout app, works with existing AuthProvider, no layout disruption | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 7. 创建语言切换器组件
  - File: src/components/LanguageSwitcher.tsx
  - 实现语言选择和切换功能
  - 集成语言状态持久化（cookies）
  - Purpose: 提供用户语言切换界面
  - _Leverage: src/components/ui/ 现有 UI 组件库_
  - _Requirements: 3.1, 3.2, 3.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React components and user interface design | Task: Create language switcher component following requirements 3.1, 3.2, and 3.3, using existing UI component library for consistent design and implementing cookie-based persistence | Restrictions: Must use existing UI component patterns, ensure accessibility compliance, maintain design system consistency | Success: Language switcher is functional and accessible, integrates with existing UI design, persists user preferences correctly | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 8. 集成语言切换器到导航栏
  - File: src/components/Navbar.tsx (修改现有文件)
  - 将语言切换器添加到现有导航栏
  - 确保与现有认证状态显示的兼容性
  - Purpose: 提供全站语言切换访问入口
  - _Leverage: src/components/Navbar.tsx 现有导航结构_
  - _Requirements: 3.1, 3.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: UI/UX Developer with expertise in navigation design and component integration | Task: Integrate language switcher into existing navbar following requirements 3.1 and 3.3, ensuring compatibility with existing authentication status display | Restrictions: Must maintain existing navbar layout and functionality, ensure responsive design, follow existing styling patterns | Success: Language switcher is seamlessly integrated into navbar, responsive design maintained, authentication features unaffected | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 9. 国际化认证相关组件
  - File: src/components/auth/LoginForm.tsx, src/components/auth/RegisterForm.tsx, src/components/auth/ForgotPasswordForm.tsx, src/components/auth/ResetPasswordForm.tsx
  - 替换硬编码文本为翻译键
  - 更新表单标签、按钮和验证消息
  - Purpose: 为认证流程提供多语言支持
  - _Leverage: 现有认证表单组件和 react-hook-form_
  - _Requirements: 4.1, 4.2, 4.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in form development and internationalization | Task: Internationalize authentication components following requirements 4.1, 4.2, and 4.3, replacing hardcoded text with translation keys while maintaining existing form functionality | Restrictions: Must not break existing form validation, maintain react-hook-form integration, ensure proper error message translation | Success: All auth forms display in selected language, validation messages are localized, form functionality remains intact | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 10. 国际化认证上下文错误消息
  - File: src/contexts/AuthContext.tsx (修改现有文件)
  - 更新错误消息映射以使用翻译键
  - 实现动态错误消息翻译
  - Purpose: 为认证错误提供本地化支持
  - _Leverage: src/contexts/AuthContext.tsx 现有错误处理逻辑_
  - _Requirements: 4.1, 4.4_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Context Developer with expertise in error handling and internationalization | Task: Internationalize authentication context error messages following requirements 4.1 and 4.4, updating existing error handling logic to use translation keys | Restrictions: Must maintain existing error handling functionality, ensure proper error code mapping, do not break authentication flow | Success: Authentication errors display in user's selected language, error mapping works correctly, auth functionality unaffected | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 11. 国际化页面和路由
  - File: src/app/page.tsx, src/app/dashboard/page.tsx, src/app/dashboard/profile/page.tsx
  - 更新页面组件以使用翻译
  - 实现页面标题和内容的国际化
  - Purpose: 为主要页面提供多语言内容
  - _Leverage: 现有页面组件结构_
  - _Requirements: 1.1, 1.2, 1.3_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer with expertise in Next.js pages and internationalization | Task: Internationalize main page components following requirements 1.1, 1.2, and 1.3, updating existing page structures to use translation keys for content and titles | Restrictions: Must maintain existing page functionality, ensure SEO optimization, follow Next.js metadata patterns | Success: All pages display in selected language, page titles are localized, SEO metadata is internationalized | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 12. 创建 i18n 工具函数和 Hooks
  - File: src/lib/i18n.ts, src/hooks/useI18n.ts
  - 实现语言检测和切换工具函数
  - 创建自定义 i18n Hooks 以简化使用
  - Purpose: 提供便捷的 i18n 工具和接口
  - _Leverage: src/lib/utils.ts 现有工具函数模式_
  - _Requirements: 5.1, 5.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Hook Developer with expertise in custom hooks and utility functions | Task: Create i18n utility functions and custom hooks following requirements 5.1 and 5.2, extending existing utility patterns to provide convenient i18n interfaces | Restrictions: Must follow existing utility function patterns, ensure hook performance optimization, maintain type safety | Success: i18n utilities are easy to use and well-typed, custom hooks provide convenient interfaces, performance is optimized | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 13. 添加翻译文件完整性验证
  - File: scripts/validate-translations.js
  - 创建脚本验证翻译文件的完整性
  - 集成到构建流程中检查缺失的翻译键
  - Purpose: 确保翻译文件的质量和完整性
  - _Leverage: scripts/ 目录现有脚本模式和 package.json 脚本配置_
  - _Requirements: 5.1_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in build scripts and validation tools | Task: Create translation file validation script following requirement 5.1, integrating into build process to check for missing translation keys using existing script patterns | Restrictions: Must not break existing build process, ensure validation is efficient, provide clear error messages | Success: Translation validation script works correctly, integrates into build process, catches missing translations effectively | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 14. 实现翻译文件的类型定义
  - File: src/types/i18n.ts
  - 创建翻译消息的 TypeScript 类型定义
  - 实现类型安全的翻译键验证
  - Purpose: 确保翻译使用的类型安全
  - _Leverage: src/types/ 现有类型定义模式_
  - _Requirements: 5.1, 5.2_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer with expertise in type systems and internationalization | Task: Create comprehensive TypeScript type definitions for translation messages following requirements 5.1 and 5.2, using existing type definition patterns to ensure type-safe translation key usage | Restrictions: Must maintain type safety, follow existing type definition conventions, ensure compile-time validation | Success: Translation keys are fully typed, compile-time validation works, follows existing type patterns | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 15. 编写国际化功能的单元测试
  - File: tests/i18n/LanguageSwitcher.test.tsx, tests/i18n/i18n-utils.test.ts
  - 为语言切换器组件编写测试
  - 为 i18n 工具函数编写单元测试
  - Purpose: 确保国际化功能的可靠性
  - _Leverage: 现有测试框架设置和 jest.config.js_
  - _Requirements: 所有需求的测试覆盖_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in React Testing Library and Jest | Task: Create comprehensive unit tests for internationalization components and utilities covering all requirements, using existing test framework setup and patterns | Restrictions: Must test component behavior not implementation, ensure test reliability, maintain test isolation | Success: All i18n functionality is properly tested, tests pass consistently, good coverage of edge cases | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 16. 编写端到端语言切换测试
  - File: tests/e2e/language-switching.spec.ts
  - 使用 Playwright 测试完整的语言切换流程
  - 测试语言持久化和页面重新渲染
  - Purpose: 验证端到端的用户语言切换体验
  - _Leverage: 现有 Playwright 配置和测试模式_
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in Playwright and end-to-end testing | Task: Create comprehensive end-to-end tests for language switching workflow following requirements 3.1, 3.2, 3.3, and 3.4, using existing Playwright configuration to test user language switching experience | Restrictions: Must test real user workflows, ensure test reliability across browsers, maintain test performance | Success: E2E tests cover complete language switching flow, tests run reliably, user experience is validated | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 17. 优化性能和添加错误边界
  - File: src/components/I18nErrorBoundary.tsx, src/lib/i18n-performance.ts
  - 创建 i18n 错误边界组件处理翻译失败
  - 实现翻译文件的懒加载和缓存优化
  - Purpose: 确保国际化功能的性能和可靠性
  - _Leverage: React 错误边界模式和 Next.js 性能优化_
  - _Requirements: 性能和可靠性要求_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Performance Engineer with expertise in React error boundaries and optimization | Task: Implement i18n error boundaries and performance optimizations following performance and reliability requirements, using React error boundary patterns and Next.js optimization techniques | Restrictions: Must handle errors gracefully, ensure performance optimization doesn't break functionality, maintain user experience quality | Success: i18n errors are handled gracefully, translation loading is optimized, performance metrics are improved | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_

- [x] 18. 更新文档和类型声明
  - File: README.md, docs/i18n.md, types/next-intl.d.ts
  - 更新项目文档以包含国际化使用说明
  - 添加类型声明文件确保类型安全
  - Purpose: 提供完整的国际化使用文档和类型支持
  - _Leverage: 现有文档结构和 TypeScript 配置_
  - _Requirements: 5.1, 文档要求_
  - _Prompt: Implement the task for spec internationalization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in API documentation and TypeScript | Task: Create comprehensive documentation for internationalization features following requirement 5.1 and documentation standards, updating existing documentation structure with i18n usage guidelines and type declarations | Restrictions: Must maintain documentation consistency, ensure examples are accurate, follow existing documentation patterns | Success: Documentation is comprehensive and accurate, type declarations are complete, developers can easily understand and use i18n features | Instructions: Mark this task as in-progress in tasks.md before starting, then mark as complete when finished_