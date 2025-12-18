/**
 * Main Layout Component
 * T041: Create layout component
 */

'use client';

import React, { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

interface MainLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * MainLayout 组件
 * 应用的主要布局容器,包含 header、sidebar、main content 和 footer
 */
export function MainLayout({ children, header, sidebar, footer, className = '' }: MainLayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        {sidebar && (
          <aside className="hidden w-64 border-r bg-muted/40 lg:block">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">{sidebar}</div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Footer */}
      {footer && <footer className="border-t bg-muted/40">{footer}</footer>}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

/**
 * 简化的布局组件 (无 sidebar)
 */
export function SimpleLayout({
  children,
  header,
  footer,
  className = '',
}: Omit<MainLayoutProps, 'sidebar'>) {
  return (
    <MainLayout header={header} footer={footer} className={className}>
      {children}
    </MainLayout>
  );
}

/**
 * 全屏布局组件 (无 header/footer)
 */
export function FullscreenLayout({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  );
}

/**
 * 居中布局组件 (用于登录、注册等页面)
 */
export function CenteredLayout({
  children,
  maxWidth = 'md',
  className = '',
}: {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div className={`flex min-h-screen items-center justify-center bg-muted/40 p-4 ${className}`}>
      <div className={`w-full ${maxWidthClass}`}>{children}</div>
      <Toaster />
    </div>
  );
}
