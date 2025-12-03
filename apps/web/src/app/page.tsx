'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/layouts/AppHeader'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查用户是否已登录，如果已登录则重定向到对话页
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/conversations')
      } else {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router, supabase.auth])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col items-center justify-center p-6 md:p-24">
        <div className="z-10 max-w-3xl w-full text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Mango
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              智能 Agent 对话平台
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              支持多模态对话、后台任务执行、小应用生态的智能 Agent 平台
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto min-w-[140px]">
                开始使用
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[140px]">
                登录账号
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">多模态对话</h3>
              <p className="text-sm text-muted-foreground">
                支持文本、图片等多种输入方式，提供更丰富的交互体验
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">后台任务</h3>
              <p className="text-sm text-muted-foreground">
                长时间运行的任务在后台执行，实时查看进度和结果
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">小应用生态</h3>
              <p className="text-sm text-muted-foreground">
                丰富的小应用扩展，满足各种场景需求
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          © 2024 Mango. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
