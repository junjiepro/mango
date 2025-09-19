import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '忘记密码 - Mango',
  description: '重置您的Mango账户密码'
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}