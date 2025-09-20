# Mango - Next.js 认证系统演示

基于 Next.js 15、Supabase 和 TypeScript 构建的现代化用户认证系统演示项目。

## ✨ 功能特性

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
- **Next.js 15.5.2** - 使用 App Router 和 Turbopack
- **React 19.1.0** - 最新的 React 版本
- **TypeScript** - 完整的类型安全
- **Supabase** - 后端即服务，认证和数据库
- **next-intl** - Next.js 国际化解决方案
- **Tailwind CSS 4** - 现代化的 CSS 框架
- **React Hook Form + Zod** - 表单处理和验证
- **Lucide React** - 美观的图标库

### 🧪 测试
- **Jest + React Testing Library** - 95+ 单元测试用例
- **Playwright** - 111+ 集成测试用例
- **覆盖率报告** - 全面的测试覆盖率

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

2. 配置 Supabase 变量：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. 配置国际化变量（可选）：
```env
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_SUPPORTED_LOCALES=zh,en
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

## 📚 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── [locale]/           # 语言路由目录
│   │   ├── dashboard/      # 仪表板相关页面
│   │   │   └── profile/    # 用户资料页面
│   │   ├── login/          # 登录页面
│   │   ├── register/       # 注册页面
│   │   └── layout.tsx      # 语言特定布局
│   └── layout.tsx          # 根布局
├── components/             # React 组件
│   ├── auth/               # 认证相关组件
│   ├── ui/                 # UI 组件库
│   ├── LanguageSwitcher.tsx # 语言切换器
│   └── I18nErrorBoundary.tsx # i18n 错误边界
├── i18n/                   # 国际化配置
│   ├── request.ts          # 服务器端 i18n 配置
│   └── routing.ts          # 路由配置
├── lib/                    # 工具库
│   ├── supabase/           # Supabase 客户端配置
│   ├── validations/        # Zod 验证模式
│   ├── i18n.ts            # i18n 工具函数
│   ├── i18n-performance.ts # 性能优化工具
│   └── utils/              # 工具函数
├── hooks/                  # 自定义 Hooks
│   └── useI18n.ts         # i18n 相关 Hooks
├── contexts/               # React Context
│   └── AuthContext.tsx     # 认证状态管理
└── types/                  # TypeScript 类型定义
    └── i18n.ts            # i18n 类型

messages/                   # 翻译文件
├── zh.json                # 中文翻译
└── en.json                # 英文翻译
```

## 🧪 测试

### 运行单元测试
```bash
npm run test              # 运行测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成覆盖率报告
```

### 运行集成测试
```bash
npm run test:e2e          # 运行 Playwright 测试
npm run test:e2e:ui       # 使用 UI 模式
npm run test:e2e:debug    # 调试模式
```

## 🔧 开发工具

### 代码质量
```bash
npm run lint              # ESLint 检查
npm run build             # 构建项目
npm run validate:translations # 验证翻译文件完整性
```

### 类型检查
```bash
npx tsc --noEmit          # TypeScript 类型检查
```

## 📖 API 文档

### 认证相关 API

#### Server Actions
- `signInAction` - 用户登录
- `signUpAction` - 用户注册
- `signOutAction` - 用户登出
- `forgotPasswordAction` - 请求密码重置
- `updatePasswordAction` - 更新密码

#### 客户端 API
- `createClient()` - 创建 Supabase 客户端
- `useAuth()` - 获取认证状态 Hook

详细的 API 文档请参考：
- [认证系统文档](./docs/AUTHENTICATION.md)
- [国际化文档](./docs/i18n.md)

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

- ✅ **密码强度验证** - 8位以上，包含大小写字母和数字
- ✅ **输入验证** - 使用 Zod 进行严格的数据验证
- ✅ **XSS 防护** - React 自动转义和内容安全策略
- ✅ **CSRF 防护** - Supabase 内置 CSRF 保护
- ✅ **会话安全** - 基于 JWT 的安全会话管理
- ✅ **错误处理** - 避免敏感信息泄露

## 🤝 贡献指南

我们欢迎社区贡献！请参考以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发准则
- 遵循现有的代码风格
- 编写测试用例
- 更新相关文档
- 确保所有测试通过

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Supabase](https://supabase.io/) - 开源 Firebase 替代品
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [React Hook Form](https://react-hook-form.com/) - 表单库
- [Zod](https://zod.dev/) - 验证库

## 📞 支持

如果你遇到问题或有疑问：

- 📧 邮件：support@example.com
- 🐛 提交 Issue：[GitHub Issues](https://github.com/your-username/mango/issues)
- 💬 讨论：[GitHub Discussions](https://github.com/your-username/mango/discussions)

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
