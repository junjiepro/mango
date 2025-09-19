export { default as RegisterForm } from './RegisterForm'
export { default as LoginForm } from './LoginForm'
export { default as ForgotPasswordForm } from './ForgotPasswordForm'
export { default as ResetPasswordForm } from './ResetPasswordForm'

// 导出验证schemas
export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '@/lib/validations/auth'

export type {
  RegisterFormData,
  LoginFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData
} from '@/lib/validations/auth'