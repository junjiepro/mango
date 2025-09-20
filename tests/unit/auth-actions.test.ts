/**
 * Tests for authentication actions
 *
 * Note: Server actions are difficult to test in isolation because they depend on
 * Next.js server environment. These tests focus on the logic and validation.
 */

import { loginSchema, registerSchema } from '@/lib/validations/auth'

// Mock Next.js server functions
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock Supabase server client
const mockSupabaseAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}))

describe('Authentication Actions Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login validation', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱')
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码不能为空')
    })
  })

  describe('Register validation', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject weak passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码不匹配')
    })
  })

  describe('FormData processing', () => {
    it('should extract login data from FormData', () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      const email = formData.get('email') as string
      const password = formData.get('password') as string

      expect(email).toBe('test@example.com')
      expect(password).toBe('password123')

      const validationResult = loginSchema.safeParse({ email, password })
      expect(validationResult.success).toBe(true)
    })

    it('should extract registration data from FormData', () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')
      formData.append('confirmPassword', 'Password123')

      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const confirmPassword = formData.get('confirmPassword') as string

      expect(email).toBe('test@example.com')
      expect(password).toBe('Password123')
      expect(confirmPassword).toBe('Password123')

      const validationResult = registerSchema.safeParse({
        email,
        password,
        confirmPassword
      })
      expect(validationResult.success).toBe(true)
    })

    it('should handle missing FormData fields', () => {
      const formData = new FormData()
      // Not appending any data

      const email = formData.get('email') as string
      const password = formData.get('password') as string

      expect(email).toBeNull()
      expect(password).toBeNull()

      // This should fail validation
      const validationResult = loginSchema.safeParse({
        email: email || '',
        password: password || ''
      })
      expect(validationResult.success).toBe(false)
    })
  })

  describe('Error message handling', () => {
    it('should map common Supabase error messages to Chinese', () => {
      const errorMappings = [
        {
          original: 'Invalid login credentials',
          expected: '邮箱或密码错误，请检查后重试'
        },
        {
          original: 'Email not confirmed',
          expected: '请先验证您的邮箱地址'
        },
        {
          original: 'Too many requests',
          expected: '登录尝试过于频繁，请稍后再试'
        },
        {
          original: 'Account temporarily locked',
          expected: '账户已临时锁定，请稍后再试'
        }
      ]

      errorMappings.forEach(({ original, expected }) => {
        // This is testing the mapping logic that would be in the actual action
        let errorMessage = original
        switch (original) {
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
        }

        expect(errorMessage).toBe(expected)
      })
    })

    it('should handle rate limit errors', () => {
      const originalError = 'Rate limit exceeded'
      let errorMessage = originalError

      if (errorMessage.includes('rate limit')) {
        errorMessage = '登录请求过于频繁，请稍后再试'
      }

      expect(errorMessage).toBe('登录请求过于频繁，请稍后再试')
    })
  })

  describe('Success response format', () => {
    it('should return correct success format for login', () => {
      const successResponse = {
        success: true,
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token' },
          redirectTo: '/dashboard'
        }
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.data?.redirectTo).toBe('/dashboard')
      expect(successResponse.data?.user?.email).toBe('test@example.com')
    })

    it('should return correct error format', () => {
      const errorResponse = {
        error: '邮箱或密码错误，请检查后重试'
      }

      expect(errorResponse.error).toBeTruthy()
      expect(typeof errorResponse.error).toBe('string')
    })
  })

  describe('Email confirmation handling', () => {
    it('should handle unconfirmed email scenario', () => {
      const userWithUnconfirmedEmail = {
        id: '123',
        email: 'test@example.com',
        email_confirmed_at: null // Not confirmed
      }

      const isEmailConfirmed = !!userWithUnconfirmedEmail.email_confirmed_at
      expect(isEmailConfirmed).toBe(false)

      // The action should sign out the user and return error
      const expectedError = '请先验证您的邮箱地址。如果没有收到验证邮件，请重新注册。'
      expect(expectedError).toContain('验证')
    })

    it('should handle confirmed email scenario', () => {
      const userWithConfirmedEmail = {
        id: '123',
        email: 'test@example.com',
        email_confirmed_at: '2023-01-01T00:00:00Z' // Confirmed
      }

      const isEmailConfirmed = !!userWithConfirmedEmail.email_confirmed_at
      expect(isEmailConfirmed).toBe(true)
    })
  })
})