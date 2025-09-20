import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录 - Mango',
  description: '登录您的Mango账户'
}

export default function LoginPage() {
  return <LoginForm />
}
