import { z } from 'zod'

// 注册表单验证schema
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(6, '密码至少需要6个字符')
    .max(100, '密码不能超过100个字符')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '密码必须包含至少一个小写字母、一个大写字母和一个数字'
    ),
  confirmPassword: z
    .string()
    .min(1, '请确认密码')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '密码不匹配',
    path: ['confirmPassword']
  }
)

// 登录表单验证schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(1, '密码不能为空')
})

// 忘记密码表单验证schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('请输入有效的邮箱地址')
})

// 重置密码表单验证schema
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, '密码至少需要6个字符')
    .max(100, '密码不能超过100个字符')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '密码必须包含至少一个小写字母、一个大写字母和一个数字'
    ),
  confirmPassword: z
    .string()
    .min(1, '请确认密码')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '密码不匹配',
    path: ['confirmPassword']
  }
)

// 导出类型
export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>