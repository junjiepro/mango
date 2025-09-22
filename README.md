# Mango - Next.js AI Agent 智能助手系统

基于 Next.js 15、Supabase 和 TypeScript 构建的现代化智能AI助手系统，集成了多模态内容处理、MCP工具生态和插件架构。

## ✨ 功能特性

### 🤖 AI Agent 智能助手
- **智能对话** - 基于 GPT-4o 的高质量对话体验
- **多模态支持** - 文本、代码、图像、文件等多种内容类型处理
- **工具调用** - 集成丰富的工具生态，增强AI能力
- **流式响应** - 实时流式对话，提升用户体验
- **简单/高级模式** - 面向不同用户群体的差异化体验
- **会话管理** - 完整的对话历史管理和持久化

### 🛠️ MCP 工具生态
- **MCP 协议支持** - Model Context Protocol 标准实现
- **外部服务器连接** - 连接各类 MCP 服务器扩展功能
- **插件系统** - 灵活的插件管理和热加载机制
- **工具执行可视化** - 直观的工具调用过程展示
- **实时状态监控** - 服务器连接状态和性能监控

### 🎨 多模态内容处理
- **代码编辑器** - 集成 Monaco Editor 的专业代码编辑
- **图像处理** - 图像分析、编辑和生成功能
- **文件管理** - 多种文件格式的上传和处理
- **内容渲染** - 支持 Markdown、HTML 等格式渲染
- **安全沙盒** - 安全的内容处理和执行环境

### 🔐 认证系统
- **用户注册和登录** - 完整的表单验证和错误处理
- **密码重置** - 安全的密码重置流程
- **用户资料管理** - 个人信息查看和密码更新
- **会话管理** - 基于 Supabase 的安全会话处理
- **路由保护** - 自动重定向未认证用户

### 🌍 国际化 (i18n)
- **多语言支持** - 支持中文（简体）和英文
- **动态语言切换** - 实时切换界面语言
- **语言持久化** - 记住用户的语言偏好
- **SEO 友好路由** - 基于路径的语言路由
- **性能优化** - 翻译文件懒加载和缓存
- **错误边界** - 优雅处理翻译错误

### 🛠️ 技术栈

#### 核心框架
- **Next.js 15.5.2** - 使用 App Router 和 Turbopack
- **React 19.1.0** - 最新的 React 版本
- **TypeScript** - 完整的类型安全
- **Tailwind CSS 4** - 现代化的 CSS 框架

#### AI 和数据处理
- **OpenAI GPT-4o** - 核心AI对话模型
- **Vercel AI SDK** - AI应用开发工具包
- **Model Context Protocol (MCP)** - 工具集成标准协议
- **PostgreSQL + Supabase** - 数据库和后端服务

#### 用户界面和体验
- **shadcn/ui** - 高质量UI组件库
- **Monaco Editor** - 专业代码编辑器
- **React Hook Form + Zod** - 表单处理和验证
- **next-intl** - 国际化解决方案
- **Lucide React** - 现代图标库

#### 开发和测试
- **Jest + React Testing Library** - 单元测试框架
- **Playwright** - 端到端测试
- **ESLint + Prettier** - 代码质量工具

### 🧪 测试覆盖
- **单元测试** - Jest + React Testing Library，95+ 测试用例
- **端到端测试** - Playwright，111+ 集成测试场景
- **AI Agent 测试** - MCP协议和工具调用测试
- **多模态测试** - 图像、代码、文件处理测试
- **性能测试** - 流式响应和大数据处理测试
- **覆盖率报告** - 全面的测试覆盖率分析

## 🚀 快速开始

### 环境要求
- Node.js 18.17 或更高版本
- npm, yarn, pnpm 或 bun

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
# 或
bun install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env.local
```

2. 配置基础环境变量：
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI 配置
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o

# 站点配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. 配置可选变量：
```env
# 国际化配置
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_SUPPORTED_LOCALES=zh,en

# AI Agent 配置
MAX_TOKENS=4000
STREAM_TIMEOUT=30000
MCP_SERVERS_CONFIG_PATH=./config/mcp-servers.json

# 多模态配置
MAX_FILE_SIZE=10485760
SUPPORTED_IMAGE_TYPES=jpg,jpeg,png,gif,webp
MONACO_THEME=vs-dark
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📚 项目架构

```
src/
├── app/[locale]/           # 国际化应用路由
│   ├── ai-agent/          # AI Agent 页面和组件
│   │   ├── page.tsx       # AI 对话主页面
│   │   ├── plugins/       # 插件管理页面
│   │   └── layout.tsx     # AI Agent 布局
│   ├── dashboard/         # 仪表板相关页面
│   │   └── profile/       # 用户资料页面
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   ├── api/               # API 路由
│   │   ├── ai-agent/      # AI Agent API
│   │   ├── mcp/           # MCP 服务器管理
│   │   └── sessions/      # 会话管理
│   └── layout.tsx         # 语言特定布局
├── components/            # React 组件
│   ├── ai-agent/         # AI Agent 专用组件
│   │   ├── ConversationInterface.tsx
│   │   ├── ToolExecutionVisualizer.tsx
│   │   ├── AgentLayout.tsx
│   │   └── ContentRenderer.tsx
│   ├── auth/             # 认证相关组件
│   ├── ui/               # 通用 UI 组件库
│   ├── LanguageSwitcher.tsx # 语言切换器
│   └── I18nErrorBoundary.tsx # i18n 错误边界
├── lib/                  # 核心业务逻辑
│   ├── ai-agent/         # AI Agent 引擎
│   │   ├── core.ts       # 核心对话引擎
│   │   ├── streaming.ts  # 流式响应处理
│   │   └── tools.ts      # 工具集成
│   ├── mcp/              # MCP 客户端
│   │   ├── client.ts     # MCP 协议客户端
│   │   ├── server.ts     # 服务器管理
│   │   └── tools.ts      # 工具发现和执行
│   ├── multimodal/       # 多模态内容处理
│   │   ├── processor.ts  # 内容处理器
│   │   ├── editors.ts    # 编辑器集成
│   │   └── validators.ts # 内容验证
│   ├── plugins/          # 插件管理系统
│   │   ├── manager.ts    # 插件管理器
│   │   ├── loader.ts     # 插件加载器
│   │   └── registry.ts   # 插件注册表
│   ├── supabase/         # Supabase 客户端配置
│   ├── validations/      # Zod 验证模式
│   ├── i18n.ts          # i18n 工具函数
│   ├── i18n-performance.ts # 性能优化工具
│   └── utils/            # 工具函数
├── types/                # TypeScript 类型定义
│   ├── ai-agent.ts       # AI Agent 类型
│   ├── multimodal.ts     # 多模态内容类型
│   ├── plugins.ts        # 插件系统类型
│   └── i18n.ts          # i18n 类型
├── hooks/                # 自定义 Hooks
│   └── useI18n.ts       # i18n 相关 Hooks
└── contexts/             # React Context
    └── AuthContext.tsx   # 认证状态管理

database/                 # 数据库相关
├── schemas/              # 数据库架构
└── migrations/           # 数据库迁移

messages/                 # 翻译文件
├── zh.json              # 中文翻译
└── en.json              # 英文翻译

docs/                     # 文档
├── AI-AGENT.md          # AI Agent 系统文档
├── AUTHENTICATION.md    # 认证系统文档
├── i18n.md             # 国际化文档
├── API.md              # API 参考文档
├── DEPLOYMENT.md       # 部署指南
└── PRODUCTION.md       # 生产环境指南
```

### 运行测试

#### 单元测试和组件测试
```bash
npm run test              # 运行所有单元测试
npm run test:watch        # 监听模式运行测试
npm run test:coverage     # 生成覆盖率报告
npm run test:ui           # 可视化测试运行器
```

#### AI Agent 和 MCP 测试
```bash
npm run test:ai-agent     # AI Agent 功能测试
npm run test:mcp          # MCP 协议和工具测试
npm run test:multimodal   # 多模态内容处理测试
npm run test:plugins      # 插件系统测试
```

#### 端到端测试
```bash
npm run test:e2e          # 运行 Playwright 测试
npm run test:e2e:ui       # 使用 UI 模式运行
npm run test:e2e:debug    # 调试模式运行
npm run test:e2e:headed   # 有头模式运行（查看浏览器）
```

#### 性能和集成测试
```bash
npm run test:performance  # 性能测试
npm run test:integration  # 集成测试
npm run test:load         # 负载测试
```

## 🔧 开发工具和命令

### 核心开发命令
```bash
npm run dev              # 启动开发服务器（Turbopack）
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint 检查
npm run lint:fix         # 自动修复 ESLint 问题
npx tsc --noEmit         # TypeScript 类型检查
```

### AI Agent 开发
```bash
npm run dev:ai-agent     # AI Agent 开发模式
npm run dev:mcp          # MCP 服务器开发模式
npm run dev:plugins      # 插件开发模式
npm run build:plugins    # 构建插件
```

### 数据库管理
```bash
npm run db:generate      # 生成数据库类型
npm run db:push          # 推送架构更改
npm run db:reset         # 重置数据库
npm run db:seed          # 填充测试数据
npm run db:studio        # 打开数据库管理界面
```

### 验证和质量检查
```bash
npm run validate:env           # 验证环境变量
npm run validate:translations  # 验证翻译文件完整性
npm run validate:i18n-types   # 验证 i18n TypeScript 类型
npm run validate:mcp          # 验证 MCP 配置
npm run validate:plugins      # 验证插件配置
```

### 构建钩子
- `prebuild`: 运行环境和翻译验证
- `prestart`: 运行环境验证
- `postinstall`: 设置开发环境

## 📖 API 和功能文档

### 🤖 AI Agent API

#### 核心对话接口
- `POST /api/ai-agent` - 主要对话API，支持流式响应
- `GET /api/ai-agent/status` - 系统状态检查
- `POST /api/ai-agent/tools` - 工具调用执行

#### 会话管理
- `GET /api/sessions` - 获取用户会话列表
- `POST /api/sessions` - 创建新会话
- `PUT /api/sessions/{id}` - 更新会话信息
- `DELETE /api/sessions/{id}` - 删除会话

### 🛠️ MCP 工具生态

#### MCP 服务器管理
- `GET /api/mcp/servers` - 列出已连接的MCP服务器
- `POST /api/mcp/servers` - 连接新的MCP服务器
- `DELETE /api/mcp/servers/{id}` - 断开MCP服务器连接
- `GET /api/mcp/servers/{id}/tools` - 获取服务器可用工具

#### 插件管理
- `GET /api/mcp/plugins` - 列出已安装插件
- `POST /api/mcp/plugins/install` - 安装新插件
- `PUT /api/mcp/plugins/{id}` - 更新插件配置
- `DELETE /api/mcp/plugins/{id}` - 卸载插件

### 🎨 多模态内容API

#### 内容处理
- `POST /api/multimodal/upload` - 上传多媒体文件
- `POST /api/multimodal/process` - 处理多模态内容
- `GET /api/multimodal/editors` - 获取编辑器配置

### 🔐 认证系统API

#### Server Actions
- `signInAction` - 用户登录
- `signUpAction` - 用户注册
- `signOutAction` - 用户登出
- `forgotPasswordAction` - 请求密码重置
- `updatePasswordAction` - 更新密码

#### 客户端API
- `createClient()` - 创建 Supabase 客户端
- `useAuth()` - 获取认证状态 Hook

### 📚 详细文档

完整的系统文档请参考：
- [🤖 AI Agent 系统文档](./docs/AI-AGENT.md) - 完整的 AI Agent 系统指南
- [🔐 认证系统文档](./docs/AUTHENTICATION.md) - 用户认证和授权
- [🌍 国际化文档](./docs/i18n.md) - 多语言支持和本地化
- [📖 API 参考文档](./docs/API.md) - 详细的 API 接口说明
- [🚀 部署指南](./docs/DEPLOYMENT.md) - 生产环境部署说明
- [🔧 生产环境指南](./docs/PRODUCTION.md) - 生产环境配置和优化

## 🚀 部署

### Vercel 部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/mango)

1. 点击上方按钮部署到 Vercel
2. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 其他平台

项目支持部署到任何支持 Node.js 的平台：

- **Netlify** - 静态站点生成
- **Railway** - 全栈部署
- **Docker** - 容器化部署

详细的部署指南请参考 [部署文档](./docs/DEPLOYMENT.md)。

## 🔐 安全特性

### 认证和授权
- ✅ **Supabase Auth** - 基于 JWT 的安全认证
- ✅ **Row Level Security (RLS)** - 数据库级别的用户隔离
- ✅ **密码强度验证** - 8位以上，包含大小写字母和数字
- ✅ **会话管理** - 安全的会话处理和刷新
- ✅ **邮箱验证** - 强制邮箱验证流程

### 数据保护
- ✅ **输入验证** - 使用 Zod 进行严格的数据验证
- ✅ **XSS 防护** - React 自动转义和内容安全策略
- ✅ **CSRF 防护** - Supabase 内置 CSRF 保护
- ✅ **SQL 注入防护** - Supabase 参数化查询
- ✅ **错误处理** - 避免敏感信息泄露

### AI Agent 安全
- ✅ **工具执行沙盒** - 隔离的工具执行环境
- ✅ **权限控制** - 基于用户角色的工具访问控制
- ✅ **内容过滤** - 有害内容检测和过滤
- ✅ **速率限制** - API 调用频率限制
- ✅ **插件安全** - 插件代码签名和权限管理

### MCP 和插件安全
- ✅ **服务器验证** - MCP 服务器身份验证
- ✅ **工具权限** - 细粒度的工具访问控制
- ✅ **代码沙盒** - 插件代码隔离执行
- ✅ **资源限制** - 插件资源使用限制
- ✅ **审计日志** - 完整的操作审计跟踪

## 🤝 贡献指南

我们欢迎社区贡献！请参考以下步骤：

1. Fork 项目仓库
2. 创建特性分支 (`git checkout -b feature/amazing-ai-feature`)
3. 提交更改 (`git commit -m 'Add some amazing AI feature'`)
4. 推送分支 (`git push origin feature/amazing-ai-feature`)
5. 创建 Pull Request

### 开发准则
- **代码质量** - 遵循 TypeScript 严格模式和 ESLint 规则
- **测试覆盖** - 为新功能编写单元测试和集成测试
- **文档更新** - 更新相关文档和 API 说明
- **性能考虑** - 确保新功能不影响整体性能
- **安全审查** - 遵循安全最佳实践，特别是 AI 和插件功能

### AI Agent 贡献
- **MCP 工具开发** - 创建新的 MCP 服务器集成
- **插件开发** - 开发新的插件或改进现有插件
- **多模态处理** - 增强图像、文件处理能力
- **用户体验** - 改进对话界面和用户交互
- **性能优化** - 优化 AI 响应速度和质量

### 特殊贡献领域
- **🤖 AI 模型集成** - 支持更多 AI 模型提供商
- **🛠️ 工具生态** - 扩展 MCP 工具生态系统
- **🎨 UI/UX 设计** - 改进用户界面和体验
- **🌍 国际化** - 添加更多语言支持
- **📚 文档改进** - 完善使用指南和开发文档

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

## 🙏 致谢和技术栈

### 核心技术
- [**Next.js**](https://nextjs.org/) - React 全栈框架，提供强大的应用基础
- [**Supabase**](https://supabase.io/) - 开源 Firebase 替代品，提供认证和数据库服务
- [**OpenAI**](https://openai.com/) - GPT-4o 模型，提供高质量的 AI 对话能力
- [**Vercel AI SDK**](https://ai.vercel.com/) - AI 应用开发工具包

### UI 和设计
- [**Tailwind CSS**](https://tailwindcss.com/) - 现代化的实用优先 CSS 框架
- [**shadcn/ui**](https://ui.shadcn.com/) - 高质量的 React 组件库
- [**Lucide React**](https://lucide.dev/) - 美观的开源图标库
- [**Monaco Editor**](https://microsoft.github.io/monaco-editor/) - VS Code 编辑器内核

### 开发工具
- [**TypeScript**](https://www.typescriptlang.org/) - 类型安全的 JavaScript 超集
- [**React Hook Form**](https://react-hook-form.com/) - 高性能表单处理库
- [**Zod**](https://zod.dev/) - TypeScript 优先的模式验证库
- [**next-intl**](https://next-intl-docs.vercel.app/) - Next.js 国际化解决方案

### 测试和质量
- [**Jest**](https://jestjs.io/) - JavaScript 测试框架
- [**React Testing Library**](https://testing-library.com/react) - React 组件测试工具
- [**Playwright**](https://playwright.dev/) - 现代化的端到端测试框架
- [**ESLint**](https://eslint.org/) - 代码质量和风格检查工具

### AI 和协议标准
- [**Model Context Protocol (MCP)**](https://modelcontextprotocol.org/) - AI 工具集成标准协议
- [**PostgreSQL**](https://postgresql.org/) - 强大的开源关系型数据库

## 📞 支持和社区

### 获取帮助
如果你遇到问题或有疑问：

- 📚 **文档首选** - 查阅 [AI Agent 系统文档](./docs/AI-AGENT.md) 获取详细指南
- 🐛 **问题报告** - 在 [GitHub Issues](https://github.com/your-username/mango/issues) 提交 Bug 报告
- 💬 **功能讨论** - 在 [GitHub Discussions](https://github.com/your-username/mango/discussions) 参与讨论
- 📧 **直接联系** - 发送邮件至 support@example.com

### 社区资源
- **🤖 AI Agent 示例** - 查看更多 AI Agent 应用案例
- **🛠️ MCP 工具集** - 探索 Model Context Protocol 工具生态
- **🎨 UI 组件** - 学习 shadcn/ui 组件的最佳实践
- **🌍 国际化** - 了解 next-intl 的高级用法

### 贡献者社区
- **开发者指南** - 详细的开发环境设置和贡献流程
- **代码审查** - 参与代码审查，提升代码质量
- **文档贡献** - 帮助改进和翻译项目文档
- **测试贡献** - 编写测试用例，提高测试覆盖率

---

## 🚀 立即体验

### 快速开始 AI Agent
1. **克隆项目** - `git clone https://github.com/your-username/mango.git`
2. **安装依赖** - `npm install`
3. **配置环境** - 复制 `.env.example` 为 `.env.local` 并配置必要变量
4. **启动开发** - `npm run dev`
5. **访问应用** - 打开 http://localhost:3000 开始使用

### 开始对话
- 注册账户并登录
- 前往 AI Agent 页面
- 选择简单或高级模式
- 开始与 AI 智能对话

### 探索功能
- **多模态交互** - 上传图片、代码文件进行分析
- **工具调用** - 体验 AI 调用各种工具完成复杂任务
- **插件生态** - 连接 MCP 服务器，扩展 AI 能力
- **多语言支持** - 切换中英文界面体验

⭐ **如果这个项目对你有帮助，请给我们一个 Star！**

💡 **想要了解更多？** 查看 [完整文档](./docs/AI-AGENT.md) 解锁更多高级功能！
