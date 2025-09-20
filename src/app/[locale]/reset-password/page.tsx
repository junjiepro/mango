import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '重置密码 - Mango',
  description: '重置您的Mango账户密码'
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}