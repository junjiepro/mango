import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './lib/supabase/types'

// 定义路由保护配置
interface RouteConfig {
  // 公开路由（不需要认证）
  publicPaths: string[]
  // 受保护路由（需要认证）
  protectedPaths: string[]
  // 认证路由（已认证用户应重定向）
  authPaths: string[]
  // 默认重定向路径
  defaultAuthRedirect: string
  defaultUnauthRedirect: string
}

const routeConfig: RouteConfig = {
  publicPaths: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth'
  ],
  protectedPaths: [
    '/dashboard',
    '/profile',
    '/settings'
  ],
  authPaths: [
    '/login',
    '/register',
    '/forgot-password'
  ],
  defaultAuthRedirect: '/dashboard',
  defaultUnauthRedirect: '/login'
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // 检查是否为静态文件或API路由
  const isStaticFile = pathname.startsWith('/_next') ||
                      pathname.startsWith('/api') ||
                      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)

  if (isStaticFile) {
    return supabaseResponse
  }

  // Refresh session if expired - required for Server Components
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Middleware] Session error:', error)
      // 如果会话检查失败，重定向到登录页
      if (!isPublicPath(pathname, routeConfig.publicPaths)) {
        return redirectTo(request, routeConfig.defaultUnauthRedirect)
      }
    }

    console.log('[Middleware] Auth check:', {
      pathname,
      hasSession: !!session,
      userId: session?.user?.id
    })

    // 路由保护逻辑
    const isPublic = isPublicPath(pathname, routeConfig.publicPaths)
    const isProtected = isProtectedPath(pathname, routeConfig.protectedPaths)
    const isAuthPath = isAuthPage(pathname, routeConfig.authPaths)

    if (!session) {
      // 用户未认证
      if (isProtected) {
        console.log('[Middleware] Redirecting unauthenticated user to login')
        return redirectTo(request, `${routeConfig.defaultUnauthRedirect}?redirect=${encodeURIComponent(pathname)}`)
      }
      // 允许访问公开路径
    } else {
      // 用户已认证
      if (isAuthPath) {
        console.log('[Middleware] Redirecting authenticated user from auth page')
        const redirectUrl = request.nextUrl.searchParams.get('redirect') || routeConfig.defaultAuthRedirect
        return redirectTo(request, redirectUrl)
      }

      // 验证邮箱确认状态
      if (!session.user.email_confirmed_at && !isEmailVerificationPath(pathname)) {
        console.log('[Middleware] Redirecting unverified user to verification reminder')
        return redirectTo(request, '/auth/verify-email')
      }
    }

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    // 发生错误时，对于受保护路径重定向到登录页
    if (isProtectedPath(pathname, routeConfig.protectedPaths)) {
      return redirectTo(request, routeConfig.defaultUnauthRedirect)
    }
  }

  return supabaseResponse
}

// 辅助函数
function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  return publicPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isProtectedPath(pathname: string, protectedPaths: string[]): boolean {
  return protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isAuthPage(pathname: string, authPaths: string[]): boolean {
  return authPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isEmailVerificationPath(pathname: string): boolean {
  const verificationPaths = ['/auth/verify-email', '/auth/callback']
  return verificationPaths.some(path => pathname.startsWith(path))
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  // 清除任何现有的查询参数（除了redirect参数）
  if (!path.includes('redirect=')) {
    url.search = ''
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
