import RegisterForm from '@/components/auth/RegisterForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '注册 - Mango',
  description: '创建您的Mango账户'
}

export default function RegisterPage() {
  return <RegisterForm />
}
