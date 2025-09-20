# API 参考文档

本文档详细介绍了 Mango 认证系统的所有 API 接口。

## 目录

- [概述](#概述)
- [Server Actions API](#server-actions-api)
- [客户端 API](#客户端-api)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

## 概述

Mango 认证系统基于 Next.js Server Actions 和 Supabase，提供类型安全的 API 接口。

### API 特性

- ✅ **类型安全** - 完整的 TypeScript 支持
- ✅ **错误处理** - 统一的错误响应格式
- ✅ **验证** - 基于 Zod 的输入验证
- ✅ **安全性** - 内置 CSRF 防护和输入清理

### 基础类型

```typescript
// 通用响应类型
interface ActionResult {
  error?: string
  success?: boolean
  message?: string
}

// 用户类型
interface User {
  id: string
  email: string
  email_confirmed_at?: string
  created_at: string
  updated_at: string
  user_metadata?: Record<string, any>
}

// 会话类型
interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}
```

## Server Actions API

### 用户注册

#### `signUpAction(formData: FormData): Promise<ActionResult>`

创建新用户账户并发送验证邮件。

**参数**:
```typescript
formData: FormData {
  email: string        // 用户邮箱
  password: string     // 用户密码
  confirmPassword: string // 确认密码
}
```

**验证规则**:
- `email`: 有效的邮箱格式
- `password`: 8-100位字符，包含大小写字母和数字
- `confirmPassword`: 必须与 password 匹配

**返回值**:
```typescript
{
  success?: boolean     // 注册成功标志
  message?: string      // 成功消息
  error?: string        // 错误信息
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

// 编程方式调用
const formData = new FormData()
formData.append('email', 'user@example.com')
formData.append('password', 'Password123')
formData.append('confirmPassword', 'Password123')

const result = await signUpAction(formData)
if (result.error) {
  console.error('注册失败:', result.error)
} else {
  console.log('注册成功:', result.message)
}
```

**可能的错误**:
- `邮箱不能为空`
- `请输入有效的邮箱地址`
- `密码至少需要8个字符`
- `密码必须包含至少一个小写字母、一个大写字母和一个数字`
- `确认密码不匹配`
- `该邮箱地址已被注册`

---

### 用户登录

#### `signInAction(formData: FormData): Promise<ActionResult>`

使用邮箱和密码登录用户。

**参数**:
```typescript
formData: FormData {
  email: string        // 用户邮箱
  password: string     // 用户密码
  remember?: string    // 记住我选项 ("on" | undefined)
}
```

**验证规则**:
- `email`: 有效的邮箱格式
- `password`: 非空字符串

**返回值**:
```typescript
{
  success?: boolean     // 登录成功标志
  message?: string      // 成功消息
  error?: string        // 错误信息
}
```

**使用示例**:
```typescript
// 在表单中使用
<form action={signInAction}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <input name="remember" type="checkbox" />
  <button type="submit">登录</button>
</form>

// 编程方式调用
const formData = new FormData()
formData.append('email', 'user@example.com')
formData.append('password', 'Password123')
formData.append('remember', 'on') // 可选

const result = await signInAction(formData)
if (result.error) {
  console.error('登录失败:', result.error)
} else {
  // 登录成功，会自动重定向
  console.log('登录成功')
}
```

**可能的错误**:
- `邮箱不能为空`
- `密码不能为空`
- `请输入有效的邮箱地址`
- `邮箱或密码错误`
- `请先验证您的邮箱地址`

---

### 用户登出

#### `signOutAction(): Promise<void>`

登出当前用户并清除会话。

**参数**: 无

**返回值**: `Promise<void>`

**使用示例**:
```typescript
// 在表单中使用
<form action={signOutAction}>
  <button type="submit">登出</button>
</form>

// 编程方式调用
await signOutAction()
// 登出后会自动重定向到登录页面
```

---

### 忘记密码

#### `forgotPasswordAction(formData: FormData): Promise<ActionResult>`

发送密码重置邮件。

**参数**:
```typescript
formData: FormData {
  email: string        // 用户邮箱
}
```

**验证规则**:
- `email`: 有效的邮箱格式

**返回值**:
```typescript
{
  success?: boolean     // 发送成功标志
  message?: string      // 成功消息
  error?: string        // 错误信息
}
```

**使用示例**:
```typescript
// 在表单中使用
<form action={forgotPasswordAction}>
  <input name="email" type="email" required />
  <button type="submit">发送重置链接</button>
</form>

// 编程方式调用
const formData = new FormData()
formData.append('email', 'user@example.com')

const result = await forgotPasswordAction(formData)
if (result.error) {
  console.error('发送失败:', result.error)
} else {
  console.log('发送成功:', result.message)
}
```

**可能的错误**:
- `邮箱不能为空`
- `请输入有效的邮箱地址`
- `发送失败，请稍后重试`

---

### 更新密码

#### `updatePasswordAction(formData: FormData): Promise<ActionResult>`

更新当前用户的密码。

**参数**:
```typescript
formData: FormData {
  currentPassword: string    // 当前密码
  newPassword: string        // 新密码
  confirmPassword: string    // 确认新密码
}
```

**验证规则**:
- `currentPassword`: 非空字符串
- `newPassword`: 8-100位字符，包含大小写字母和数字
- `confirmPassword`: 必须与 newPassword 匹配
- `newPassword` 不能与 `currentPassword` 相同

**返回值**:
```typescript
{
  success?: boolean     // 更新成功标志
  message?: string      // 成功消息
  error?: string        // 错误信息
}
```

**使用示例**:
```typescript
// 在表单中使用
<form action={updatePasswordAction}>
  <input name="currentPassword" type="password" required />
  <input name="newPassword" type="password" required />
  <input name="confirmPassword" type="password" required />
  <button type="submit">更新密码</button>
</form>

// 编程方式调用
const formData = new FormData()
formData.append('currentPassword', 'OldPassword123')
formData.append('newPassword', 'NewPassword456')
formData.append('confirmPassword', 'NewPassword456')

const result = await updatePasswordAction(formData)
if (result.error) {
  console.error('更新失败:', result.error)
} else {
  console.log('更新成功:', result.message)
}
```

**可能的错误**:
- `请输入当前密码`
- `新密码至少需要8个字符`
- `新密码必须包含至少一个小写字母、一个大写字母和一个数字`
- `确认密码不匹配`
- `新密码不能与当前密码相同`
- `当前密码不正确`

## 客户端 API

### Supabase 客户端

#### `createClient(): SupabaseClient`

创建 Supabase 客户端实例。

**返回值**: `SupabaseClient`

**使用示例**:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser()

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session)
})
```

---

### 认证 Hook

#### `useAuth(): AuthContextType`

获取当前认证状态和操作方法。

**返回值**:
```typescript
interface AuthContextType {
  user: User | null          // 当前用户信息
  loading: boolean           // 加载状态
  signOut: () => Promise<void> // 登出方法
}
```

**使用示例**:
```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <div>加载中...</div>
  }

  if (!user) {
    return <div>请登录</div>
  }

  return (
    <div>
      <p>欢迎，{user.email}!</p>
      <button onClick={signOut}>登出</button>
    </div>
  )
}
```

---

### 服务端客户端

#### `createClient(): SupabaseClient`

创建服务端 Supabase 客户端实例。

**使用场景**: 在 Server Components、Server Actions 和 API Routes 中使用

**使用示例**:
```typescript
import { createClient } from '@/lib/supabase/server'

// 在 Server Component 中
export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <div>受保护的页面内容</div>
}

// 在 Server Action 中
async function serverAction() {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('未授权')
  }

  // 执行服务端逻辑
}
```

## 类型定义

### 认证相关类型

```typescript
// 用户注册数据
interface SignUpData {
  email: string
  password: string
  confirmPassword: string
}

// 用户登录数据
interface SignInData {
  email: string
  password: string
  remember?: boolean
}

// 忘记密码数据
interface ForgotPasswordData {
  email: string
}

// 更新密码数据
interface UpdatePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// 用户信息
interface User {
  id: string
  email: string
  email_confirmed_at?: string
  created_at: string
  updated_at: string
  user_metadata?: {
    avatar_url?: string
    display_name?: string
    [key: string]: any
  }
}

// 会话信息
interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: User
}

// 认证状态
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}
```

### 验证 Schema 类型

```typescript
// 从 Zod Schema 推导的类型
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword)

type SignUpInput = z.infer<typeof signUpSchema>

// 类似地定义其他 Schema 类型
type SignInInput = z.infer<typeof signInSchema>
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
```

## 错误处理

### 错误类型

系统使用统一的错误处理机制：

```typescript
// 通用错误响应
interface ErrorResponse {
  error: string          // 错误消息
  code?: string         // 错误代码
  details?: any         // 错误详情
}

// 验证错误
interface ValidationError {
  error: string
  field?: string        // 出错的字段
  path?: string[]      // 字段路径
}
```

### 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| `invalid_credentials` | 登录凭据无效 | 检查邮箱和密码 |
| `email_not_confirmed` | 邮箱未验证 | 检查邮箱并点击验证链接 |
| `user_already_registered` | 用户已存在 | 使用不同邮箱或直接登录 |
| `weak_password` | 密码强度不足 | 使用更强的密码 |
| `too_many_requests` | 请求过于频繁 | 稍后重试 |
| `network_error` | 网络错误 | 检查网络连接 |

### 错误处理最佳实践

```typescript
// 在组件中处理错误
async function handleSubmit(formData: FormData) {
  try {
    const result = await signInAction(formData)

    if (result.error) {
      // 显示错误消息
      setError(result.error)
      return
    }

    // 处理成功情况
    router.push('/dashboard')
  } catch (error) {
    // 处理未预期的错误
    console.error('登录过程中发生错误:', error)
    setError('系统错误，请稍后重试')
  }
}

// 全局错误边界
function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="error-container">
          <h2>认证错误</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

## 使用示例

### 完整的登录流程

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema } from '@/lib/validations/auth'
import { signInAction } from './actions'

export default function LoginForm() {
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(signInSchema)
  })

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('password', data.password)
      if (data.remember) {
        formData.append('remember', 'on')
      }

      const result = await signInAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        // 登录成功，Server Action 会处理重定向
      }
    } catch (err) {
      setError('登录过程中发生错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div>
        <input
          {...register('email')}
          type="email"
          placeholder="邮箱地址"
          className="w-full px-3 py-2 border rounded"
        />
        {errors.email && (
          <span className="text-red-500 text-sm">
            {errors.email.message}
          </span>
        )}
      </div>

      <div>
        <input
          {...register('password')}
          type="password"
          placeholder="密码"
          className="w-full px-3 py-2 border rounded"
        />
        {errors.password && (
          <span className="text-red-500 text-sm">
            {errors.password.message}
          </span>
        )}
      </div>

      <div>
        <label className="flex items-center">
          <input
            {...register('remember')}
            type="checkbox"
            className="mr-2"
          />
          记住我
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  )
}
```

### 路由保护

```typescript
// middleware.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否是受保护的路由
  const protectedRoutes = ['/dashboard', '/profile']
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 避免已登录用户访问认证页面
  const authRoutes = ['/login', '/register', '/forgot-password']
  if (authRoutes.includes(pathname)) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

### 自定义 Hook

```typescript
// hooks/useAuthState.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}
```

---

更多详细信息请参考：
- [认证系统文档](./AUTHENTICATION.md)
- [部署指南](./DEPLOYMENT.md)
- [Supabase 官方文档](https://supabase.com/docs)