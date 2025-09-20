# 认证系统文档

本文档详细介绍了 Mango 项目中基于 Supabase 的认证系统实现。

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [设置和配置](#设置和配置)
- [API 参考](#api-参考)
- [组件使用指南](#组件使用指南)
- [安全特性](#安全特性)
- [常见问题](#常见问题)
- [故障排除](#故障排除)

## 概述

Mango 认证系统提供了完整的用户认证解决方案，包括：

- ✅ 用户注册和邮箱验证
- ✅ 用户登录和登出
- ✅ 密码重置功能
- ✅ 用户资料管理
- ✅ 密码更新功能
- ✅ 会话管理
- ✅ 路由保护

## 架构设计

### 技术栈

- **后端**: Supabase (身份验证、数据库)
- **前端**: Next.js 15 + React 19
- **状态管理**: React Context + Hooks
- **表单处理**: React Hook Form + Zod
- **样式**: Tailwind CSS

### 文件结构

```
src/
├── app/                          # Next.js App Router
│   ├── login/                    # 登录页面
│   ├── register/                 # 注册页面
│   ├── forgot-password/          # 忘记密码页面
│   ├── dashboard/                # 受保护的仪表板
│   │   └── profile/              # 用户资料页面
│   ├── auth/                     # 认证回调
│   │   └── callback/             # OAuth 回调
│   └── globals.css               # 全局样式
├── components/
│   ├── auth/                     # 认证相关组件
│   │   ├── LoginForm.tsx         # 登录表单
│   │   ├── RegisterForm.tsx      # 注册表单
│   │   └── ForgotPasswordForm.tsx# 忘记密码表单
│   └── ui/                       # UI 组件库
├── contexts/
│   └── AuthContext.tsx           # 认证状态管理
├── lib/
│   ├── supabase/                 # Supabase 配置
│   │   ├── client.ts             # 客户端实例
│   │   └── server.ts             # 服务端实例
│   ├── validations/              # 验证模式
│   │   └── auth.ts               # 认证相关验证
│   └── utils/                    # 工具函数
└── types/                        # TypeScript 类型定义
```

## 设置和配置

### 1. Supabase 项目设置

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置中获取 API 密钥：
   - `Project URL`
   - `Anonymous Key`

### 2. 环境变量配置

创建 `.env.local` 文件：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 可选：开发模式配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase 配置

#### 邮箱模板设置

在 Supabase Dashboard > Authentication > Email Templates 中配置：

**确认邮箱模板**:
```html
<h2>确认您的邮箱</h2>
<p>点击下方链接确认您的邮箱地址：</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">确认邮箱</a></p>
```

**重置密码模板**:
```html
<h2>重置您的密码</h2>
<p>点击下方链接重置您的密码：</p>
<p><a href="{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&type=recovery">重置密码</a></p>
```

#### 重定向 URL 设置

在 Authentication > URL Configuration 中添加：
- `http://localhost:3000/auth/callback` (开发环境)
- `https://yourdomain.com/auth/callback` (生产环境)

## API 参考

### Server Actions

认证系统使用 Next.js Server Actions 处理表单提交：

#### `signUpAction`

用户注册操作。

```typescript
async function signUpAction(formData: FormData): Promise<ActionResult>
```

**参数**:
- `formData.get('email')`: 用户邮箱
- `formData.get('password')`: 用户密码
- `formData.get('confirmPassword')`: 确认密码

**返回值**:
```typescript
type ActionResult = {
  error?: string
  success?: boolean
  message?: string
}
```

**使用示例**:
```typescript
// 在表单中使用
<form action={signUpAction}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <input name="confirmPassword" type="password" required />
  <button type="submit">注册</button>
</form>
```

#### `signInAction`

用户登录操作。

```typescript
async function signInAction(formData: FormData): Promise<ActionResult>
```

**参数**:
- `formData.get('email')`: 用户邮箱
- `formData.get('password')`: 用户密码
- `formData.get('remember')`: 记住我 (可选)

#### `signOutAction`

用户登出操作。

```typescript
async function signOutAction(): Promise<void>
```

#### `forgotPasswordAction`

请求密码重置。

```typescript
async function forgotPasswordAction(formData: FormData): Promise<ActionResult>
```

**参数**:
- `formData.get('email')`: 用户邮箱

#### `updatePasswordAction`

更新用户密码。

```typescript
async function updatePasswordAction(formData: FormData): Promise<ActionResult>
```

**参数**:
- `formData.get('currentPassword')`: 当前密码
- `formData.get('newPassword')`: 新密码
- `formData.get('confirmPassword')`: 确认新密码

### 客户端 API

#### `createClient()`

创建 Supabase 客户端实例。

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

#### `useAuth()` Hook

获取当前认证状态。

```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div>加载中...</div>
  if (!user) return <div>请登录</div>

  return (
    <div>
      <p>欢迎，{user.email}!</p>
      <button onClick={signOut}>登出</button>
    </div>
  )
}
```

### 验证模式 (Zod Schemas)

#### `signUpSchema`

用户注册验证模式。

```typescript
const signUpSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string()
    .min(8, '密码至少需要8个字符')
    .max(100, '密码不能超过100个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  confirmPassword: z.string().min(1, '请确认密码')
}).refine((data) => data.password === data.confirmPassword, {
  message: '确认密码不匹配',
  path: ['confirmPassword']
})
```

#### `signInSchema`

用户登录验证模式。

```typescript
const signInSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '密码不能为空')
})
```

#### `updatePasswordSchema`

密码更新验证模式。

```typescript
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string()
    .min(8, '新密码至少需要8个字符')
    .max(100, '新密码不能超过100个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  confirmPassword: z.string().min(1, '请确认新密码')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '确认密码不匹配',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: '新密码不能与当前密码相同',
  path: ['newPassword']
})
```

## 组件使用指南

### AuthContext 使用

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>加载中...</div>
  }

  if (!user) {
    return <div>请先登录</div>
  }

  return (
    <div>
      <h1>受保护的页面</h1>
      <p>用户邮箱: {user.email}</p>
    </div>
  )
}
```

### 创建自定义认证表单

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema } from '@/lib/validations/auth'
import { signInAction } from '@/app/login/actions'

export default function CustomLoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(signInSchema)
  })

  const onSubmit = async (data) => {
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)

    const result = await signInAction(formData)
    if (result.error) {
      // 处理错误
      console.error(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email')}
          type="email"
          placeholder="邮箱地址"
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input
          {...register('password')}
          type="password"
          placeholder="密码"
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '登录中...' : '登录'}
      </button>
    </form>
  )
}
```

### 路由保护

使用中间件保护路由：

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 检查受保护的路由
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 避免已登录用户访问认证页面
  if (['/login', '/register'].includes(req.nextUrl.pathname)) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## 安全特性

### 1. 密码安全

- **强度验证**: 至少8个字符，包含大小写字母和数字
- **哈希存储**: Supabase 使用 bcrypt 哈希存储密码
- **密码重置**: 安全的邮箱验证流程

### 2. 会话管理

- **JWT Token**: 基于 JWT 的安全会话
- **自动刷新**: Token 自动刷新机制
- **过期处理**: 会话过期自动重定向

### 3. 输入验证

- **客户端验证**: 使用 Zod 进行实时验证
- **服务端验证**: Server Actions 中的二次验证
- **XSS 防护**: React 自动转义用户输入

### 4. CSRF 防护

- **Supabase 内置**: 自动 CSRF 保护
- **Origin 检查**: 请求来源验证

## 常见问题

### Q: 如何自定义邮箱验证流程？

A: 在 Supabase Dashboard 中修改邮箱模板和重定向 URL。确保回调 URL 指向正确的处理页面。

### Q: 如何处理第三方登录？

A: Supabase 支持多种 OAuth 提供商：

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

### Q: 如何实现记住我功能？

A: 在登录时设置会话持久性：

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    persistSession: remember
  }
})
```

### Q: 如何获取用户额外信息？

A: 使用 Supabase 的用户元数据：

```typescript
const { data, error } = await supabase.auth.updateUser({
  data: {
    display_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg'
  }
})
```

## 故障排除

### 常见错误

#### 1. "Invalid login credentials"

**原因**: 邮箱或密码错误，或邮箱未验证。

**解决方案**:
- 检查邮箱和密码是否正确
- 确认邮箱已验证
- 检查 Supabase 用户表

#### 2. "Email not confirmed"

**原因**: 用户邮箱未验证。

**解决方案**:
- 检查邮箱验证邮件
- 重新发送验证邮件
- 检查垃圾邮件文件夹

#### 3. 重定向循环

**原因**: 中间件配置错误或会话状态不一致。

**解决方案**:
- 检查中间件配置
- 清除浏览器缓存和 cookies
- 检查 Supabase 项目设置

### 调试技巧

1. **启用详细日志**:
```typescript
const supabase = createClient(url, key, {
  debug: process.env.NODE_ENV === 'development'
})
```

2. **检查网络请求**:
使用浏览器开发者工具查看 API 请求和响应。

3. **验证环境变量**:
确保所有必需的环境变量都已正确设置。

## 下一步

- 阅读 [部署指南](./DEPLOYMENT.md)
- 查看 [API 测试](../tests/integration/)
- 了解 [贡献指南](../README.md#贡献指南)

---

如需更多帮助，请查看 [Supabase 官方文档](https://supabase.com/docs) 或提交 [Issue](https://github.com/your-username/mango/issues)。