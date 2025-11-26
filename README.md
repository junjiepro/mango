# Mango - 智能Agent对话平台

一个支持多模态对话、后台任务执行、小应用生态和持续学习的智能Agent平台。

## 技术栈

- **前端框架**: Next.js 14+ (App Router), React 18+
- **样式**: TailwindCSS
- **后端**: Next.js API Routes, Supabase Edge Functions
- **数据库**: Supabase (PostgreSQL 15+)
- **实时通信**: Supabase Realtime
- **认证**: Supabase Auth
- **存储**: Supabase Storage
- **语言**: TypeScript 5.x
- **包管理**: pnpm (monorepo)
- **构建工具**: Turbo
- **测试**: Vitest (单元测试), Playwright (E2E测试)

## 项目结构

```
mango/
├── apps/
│   ├── web/                    # Next.js Web应用
│   └── cli/                    # CLI工具
├── packages/
│   ├── shared/                 # 共享类型和工具
│   ├── protocols/              # MCP/ACP/A2A协议适配器
│   └── miniapp-runtime/        # 小应用运行时
├── supabase/
│   ├── migrations/            # 数据库迁移
│   ├── functions/             # Edge Functions
│   └── seed.sql              # 测试数据
└── specs/                     # 设计文档
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
# 运行所有测试
pnpm test

# 运行 E2E 测试
pnpm test:e2e
```

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

1. **与Agent进行对话完成任务** (P1 - MVP)
   - 多模态对话(文本、图片、文件)
   - 后台任务执行
   - 实时同步

2. **使用和管理小应用** (P2)
   - 小应用创建和安装
   - 被动调用和主动触发
   - 权限管理和沙箱隔离

3. **通过CLI工具接入本地MCP/ACP服务** (P3)
   - CLI工具配置
   - 本地服务注册
   - 安全代理

4. **Agent持续学习与改进** (P4)
   - 反馈收集
   - 规则提取
   - 个性化优化

5. **多模态内容的适应性展示** (P5)
   - 智能布局选择
   - 内容过滤搜索

6. **多语言国际化支持** (P6)
   - 中文/英文界面
   - 多语言Agent理解

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
