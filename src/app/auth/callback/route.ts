import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[Auth Callback] Processing authentication callback')

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    console.log('[Auth Callback] Exchange code for session')

    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data?.user) {
        console.log('[Auth Callback] Session exchange successful for user:', data.user.id)

        // 检查用户是否是新注册的
        if (data.user.email_confirmed_at) {
          console.log('[Auth Callback] Email confirmed, redirecting to dashboard')
          return NextResponse.redirect(`${origin}/dashboard?welcome=true`)
        } else {
          console.log('[Auth Callback] Email not confirmed yet')
          return NextResponse.redirect(`${origin}/login?message=邮箱已验证，请重新登录`)
        }
      } else {
        console.error('[Auth Callback] Session exchange failed:', error?.message)
        return NextResponse.redirect(`${origin}/login?error=认证失败，请重新登录`)
      }
    } catch (error) {
      console.error('[Auth Callback] Unexpected error during session exchange:', error)
      return NextResponse.redirect(`${origin}/login?error=认证过程中发生错误`)
    }
  } else {
    console.warn('[Auth Callback] No authorization code found')
    return NextResponse.redirect(`${origin}/login?error=无效的认证链接`)
  }
}