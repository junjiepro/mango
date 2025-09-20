import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema
} from '@/lib/validations/auth'

describe('Authentication Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration form', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱')
    })

    it('should reject passwords that are too short', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码至少需要6个字符')
    })

    it('should reject passwords without required complexity', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码必须包含')
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

    it('should reject empty fields', () => {
      const invalidData = {
        email: '',
        password: '',
        confirmPassword: ''
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate a valid login form', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱')
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱不能为空')
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

  describe('forgotPasswordSchema', () => {
    it('should validate a valid email', () => {
      const validData = {
        email: 'test@example.com'
      }

      const result = forgotPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email'
      }

      const result = forgotPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱')
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: ''
      }

      const result = forgotPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('邮箱不能为空')
    })
  })

  describe('resetPasswordSchema', () => {
    it('should validate a valid password reset form', () => {
      const validData = {
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      }

      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject passwords that are too short', () => {
      const invalidData = {
        password: '123',
        confirmPassword: '123'
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码至少需要6个字符')
    })

    it('should reject passwords without complexity requirements', () => {
      const invalidData = {
        password: 'password',
        confirmPassword: 'password'
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码必须包含')
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        password: 'Password123',
        confirmPassword: 'Password456'
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('密码不匹配')
    })
  })

  describe('updatePasswordSchema', () => {
    it('should validate a valid password update form', () => {
      const validData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      }

      const result = updatePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject when new password is same as current password', () => {
      const invalidData = {
        currentPassword: 'Password123',
        newPassword: 'Password123',
        confirmPassword: 'Password123'
      }

      const result = updatePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('新密码不能与当前密码相同')
    })

    it('should reject when new password is too short', () => {
      const invalidData = {
        currentPassword: 'OldPassword123',
        newPassword: '123',
        confirmPassword: '123'
      }

      const result = updatePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('新密码至少需要8个字符')
    })

    it('should reject when confirm password does not match', () => {
      const invalidData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword456'
      }

      const result = updatePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('确认密码不匹配')
    })

    it('should reject empty current password', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      }

      const result = updatePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('请输入当前密码')
    })

    it('should reject new password without complexity requirements', () => {
      const invalidData = {
        currentPassword: 'OldPassword123',
        newPassword: 'newpassword',
        confirmPassword: 'newpassword'
      }

      const result = updatePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('新密码必须包含')
    })
  })
})