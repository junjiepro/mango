/**
 * Authentication Middleware
 * T030: Create authentication middleware for protected routes
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authConfig, isProtectedPath, getRedirectUrl } from '@/lib/supabase/auth-config'

/**
 * Next.js Middleware
 * 在请求到达页面之前执行认证检查
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 创建响应对象
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 创建 Supabase 客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: authConfig,
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // 设置 cookie 到请求和响应
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // 从请求和响应中删除 cookie
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 刷新会话 (如果存在)
  const { data: { session }, error } = await supabase.auth.getSession()

  // 检查是否是受保护的路径
  const isProtected = isProtectedPath(pathname)

  // 如果是受保护的路径但用户未登录,重定向到登录页
  if (isProtected && (!session || error)) {
    const loginUrl = new URL(getRedirectUrl('LOGIN'), request.url)
    // 保存原始 URL 用于登录后重定向
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 如果用户已登录但访问登录/注册页,重定向到首页
  if (session && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const homeUrl = new URL(getRedirectUrl('HOME'), request.url)
    return NextResponse.redirect(homeUrl)
  }

  // 添加安全头
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  return response
}

/**
 * Middleware 配置
 * 指定哪些路径需要执行 middleware
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
