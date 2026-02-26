# 部署指南

## 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Supabase 项目（生产环境）
- Vercel 账号

## 1. Supabase 生产环境

### 创建项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目，选择合适的区域
3. 记录 Project URL 和 Anon Key

### 应用迁移

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接到生产项目
supabase link --project-ref <project-ref>

# 应用所有迁移
supabase db push
```

## 2. 环境变量

在 Vercel 中配置以下环境变量：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 |

## 3. Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd apps/web
vercel --prod
```

### 构建配置

- Framework: Next.js
- Root Directory: `apps/web`
- Build Command: `cd ../.. && pnpm build --filter @mango/web`
- Install Command: `pnpm install`

## 4. 部署检查清单

- [ ] Supabase 迁移已全部应用
- [ ] RLS 策略已启用并测试
- [ ] 环境变量已正确配置
- [ ] HTTPS 已启用
- [ ] 安全头已生效（HSTS、CSP 等）
- [ ] 速率限制已配置
- [ ] 错误监控已接入
- [ ] 数据库备份已启用
