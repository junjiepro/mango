import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import type { Database } from './lib/supabase/types'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

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

// 创建 next-intl 中间件
const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 检查是否为静态文件或API路由
  const isStaticFile = pathname.startsWith('/_next') ||
                      pathname.startsWith('/api') ||
                      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)

  if (isStaticFile) {
    return NextResponse.next()
  }

  // 首先处理国际化路由
  const intlResponse = intlMiddleware(request)

  // 如果 intl 中间件触发了重定向，直接返回
  if (intlResponse.status === 302 || intlResponse.status === 307) {
    return intlResponse
  }

  // 创建新的请求对象，使用可能被 intl 中间件修改的 URL
  const modifiedRequest = new NextRequest(
    intlResponse.headers.get('x-pathname') || request.url,
    request
  )

  let supabaseResponse = NextResponse.next({
    request: modifiedRequest,
  })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return modifiedRequest.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => modifiedRequest.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: modifiedRequest,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 从路径中提取 locale 和实际路径
  const pathWithoutLocale = getPathnameWithoutLocale(modifiedRequest.nextUrl.pathname)

  // Refresh session if expired - required for Server Components
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Middleware] Session error:', error)
      // 如果会话检查失败，重定向到登录页
      if (!isPublicPath(pathWithoutLocale, routeConfig.publicPaths)) {
        return redirectToWithLocale(modifiedRequest, routeConfig.defaultUnauthRedirect)
      }
    }

    console.log('[Middleware] Auth check:', {
      pathname: pathWithoutLocale,
      hasSession: !!session,
      userId: session?.user?.id
    })

    // 路由保护逻辑
    const isPublic = isPublicPath(pathWithoutLocale, routeConfig.publicPaths)
    const isProtected = isProtectedPath(pathWithoutLocale, routeConfig.protectedPaths)
    const isAuthPath = isAuthPage(pathWithoutLocale, routeConfig.authPaths)

    if (!session) {
      // 用户未认证
      if (isProtected) {
        console.log('[Middleware] Redirecting unauthenticated user to login')
        return redirectToWithLocale(
          modifiedRequest,
          `${routeConfig.defaultUnauthRedirect}?redirect=${encodeURIComponent(pathWithoutLocale)}`
        )
      }
      // 允许访问公开路径
    } else {
      // 用户已认证
      if (isAuthPath) {
        console.log('[Middleware] Redirecting authenticated user from auth page')
        const redirectUrl = modifiedRequest.nextUrl.searchParams.get('redirect') || routeConfig.defaultAuthRedirect
        return redirectToWithLocale(modifiedRequest, redirectUrl)
      }

      // 验证邮箱确认状态
      if (!session.user.email_confirmed_at && !isEmailVerificationPath(pathWithoutLocale)) {
        console.log('[Middleware] Redirecting unverified user to verification reminder')
        return redirectToWithLocale(modifiedRequest, '/auth/verify-email')
      }
    }

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    // 发生错误时，对于受保护路径重定向到登录页
    if (isProtectedPath(pathWithoutLocale, routeConfig.protectedPaths)) {
      return redirectToWithLocale(modifiedRequest, routeConfig.defaultUnauthRedirect)
    }
  }

  // 将 intl 中间件的 headers 合并到最终响应中
  intlResponse.headers.forEach((value, key) => {
    supabaseResponse.headers.set(key, value)
  })

  return supabaseResponse
}

// 辅助函数
function getPathnameWithoutLocale(pathname: string): string {
  // 移除语言前缀
  const segments = pathname.split('/')
  if (segments.length > 1 && routing.locales.includes(segments[1] as any)) {
    return '/' + segments.slice(2).join('/')
  }
  return pathname
}

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/')
  if (segments.length > 1 && routing.locales.includes(segments[1] as any)) {
    return segments[1]
  }
  return routing.defaultLocale
}

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

function redirectToWithLocale(request: NextRequest, path: string): NextResponse {
  const locale = getLocaleFromPathname(request.nextUrl.pathname)
  const url = request.nextUrl.clone()

  // 构建带有 locale 的路径
  if (path.startsWith('/')) {
    url.pathname = `/${locale}${path}`
  } else {
    url.pathname = path
  }

  // 清除任何现有的查询参数（除了redirect参数）
  if (!path.includes('redirect=')) {
    url.search = ''
  }

  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*),'
  ],
}
