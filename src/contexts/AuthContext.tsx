'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AuthContextType, AuthError } from '@/lib/supabase/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [supabase.auth])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Sign up function
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { error: { message: error.message, status: error.status } }
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: { message } }
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Starting sign in process for:', email)

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('[AuthContext] Sign in error:', error.message)

        // 映射常见错误为中文消息
        let errorMessage = error.message
        switch (error.message) {
          case 'Invalid login credentials':
          case 'Invalid email or password':
            errorMessage = '邮箱或密码错误，请检查后重试'
            break
          case 'Email not confirmed':
            errorMessage = '请先验证您的邮箱地址'
            break
          case 'Too many requests':
            errorMessage = '登录尝试过于频繁，请稍后再试'
            break
          case 'Account temporarily locked':
            errorMessage = '账户已临时锁定，请稍后再试'
            break
          default:
            if (errorMessage.includes('rate limit')) {
              errorMessage = '登录请求过于频繁，请稍后再试'
            }
            break
        }

        return { error: { message: errorMessage, status: error.status } }
      }

      if (!data?.user) {
        console.error('[AuthContext] No user data returned')
        return { error: { message: '登录失败，请稍后重试' } }
      }

      // 检查邮箱是否已验证
      if (!data.user.email_confirmed_at) {
        console.warn('[AuthContext] User email not confirmed:', data.user.id)
        // 登出未验证的用户
        await supabase.auth.signOut()
        return {
          error: {
            message: '请先验证您的邮箱地址。如果没有收到验证邮件，请重新注册。'
          }
        }
      }

      console.log('[AuthContext] Sign in successful:', {
        userId: data.user.id,
        email: data.user.email,
        lastSignIn: data.user.last_sign_in_at
      })

      return { error: null }
    } catch (error) {
      console.error('[AuthContext] Unexpected sign in error:', error)
      const message = error instanceof Error ? error.message : '登录过程中发生未知错误'
      return { error: { message } }
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { error: { message: error.message, status: error.status } }
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: { message } }
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  // Confirm password reset function
  const confirmPasswordReset = useCallback(async (accessToken: string, newPassword: string) => {
    console.log('[AuthContext] Starting password reset confirmation')

    try {
      setLoading(true)

      // Set the session using the access token
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Refresh token is not needed for password reset
      })

      if (sessionError) {
        console.error('[AuthContext] Session error:', sessionError.message)
        let errorMessage = sessionError.message

        switch (sessionError.message) {
          case 'Invalid token':
          case 'Token has expired':
            errorMessage = 'Invalid or expired token'
            break
          default:
            if (errorMessage.includes('token') || errorMessage.includes('expired')) {
              errorMessage = 'Invalid or expired token'
            }
            break
        }

        return { error: { message: errorMessage, status: sessionError.status } }
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('[AuthContext] Password update error:', updateError.message)
        let errorMessage = updateError.message

        switch (updateError.message) {
          case 'Password should be at least 6 characters':
            errorMessage = 'Password should be at least 6 characters'
            break
          case 'New password should be different from the old password':
            errorMessage = 'New password should be different from the old password'
            break
          default:
            if (errorMessage.includes('password')) {
              errorMessage = 'Password format requirements not met'
            }
            break
        }

        return { error: { message: errorMessage, status: updateError.status } }
      }

      console.log('[AuthContext] Password reset successful')

      // Sign out the user after successful password reset
      await supabase.auth.signOut()

      return { error: null }
    } catch (error) {
      console.error('[AuthContext] Unexpected password reset error:', error)
      const message = error instanceof Error ? error.message : '密码重置过程中发生未知错误'
      return { error: { message } }
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        return { error: { message: error.message, status: error.status } }
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: { message } }
    }
  }, [supabase.auth])

  // Update password function
  const updatePassword = useCallback(async (password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) {
        return { error: { message: error.message, status: error.status } }
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: { message } }
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
    }
  }, [supabase.auth])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    confirmPasswordReset,
    updatePassword,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export the context for testing purposes
export { AuthContext }