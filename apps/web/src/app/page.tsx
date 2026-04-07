import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'

export default async function Home() {
  const t = await getTranslations('common')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="text-lg font-semibold">Mango</span>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                {t.has('login') ? t('login') : '登录'}
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">
                {t.has('signup') ? t('signup') : '注册'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 md:p-24">
        <div className="z-10 max-w-3xl w-full text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Mango
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              {t.has('siteTitle') ? t('siteTitle') : '智能 Agent 对话平台'}
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.has('siteDescription') ? t('siteDescription') : '支持多模态对话、后台任务执行、小应用生态的智能 Agent 平台'}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto min-w-[140px]">
                {t.has('getStarted') ? t('getStarted') : '开始使用'}
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[140px]">
                {t.has('login') ? t('login') : '登录账号'}
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">{t.has('featureMultimodal') ? t('featureMultimodal') : '多模态对话'}</h3>
              <p className="text-sm text-muted-foreground">
                {t.has('featureMultimodalDesc') ? t('featureMultimodalDesc') : '支持文本、图片等多种输入方式，提供更丰富的交互体验'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">{t.has('featureBackgroundTasks') ? t('featureBackgroundTasks') : '后台任务'}</h3>
              <p className="text-sm text-muted-foreground">
                {t.has('featureBackgroundTasksDesc') ? t('featureBackgroundTasksDesc') : '长时间运行的任务在后台执行，实时查看进度和结果'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-left">
              <h3 className="font-semibold mb-2">{t.has('featureMiniApps') ? t('featureMiniApps') : '小应用生态'}</h3>
              <p className="text-sm text-muted-foreground">
                {t.has('featureMiniAppsDesc') ? t('featureMiniAppsDesc') : '丰富的小应用扩展，满足各种场景需求'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          &copy; 2024 Mango. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
