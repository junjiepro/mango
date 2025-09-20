import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { I18nErrorBoundary } from '@/components/I18nErrorBoundary';
import { TranslationPreloader } from '@/lib/i18n-performance';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mango - Next.js with Supabase Auth",
  description:
    "A modern web application with Next.js and Supabase authentication",
};

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  // 提供服务器端消息给客户端组件
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <I18nErrorBoundary>
          <TranslationPreloader locales={['zh', 'en']}>
            <NextIntlClientProvider messages={messages}>
              <AuthProvider>
                <Navbar />
                <main className="py-8">{children}</main>
              </AuthProvider>
            </NextIntlClientProvider>
          </TranslationPreloader>
        </I18nErrorBoundary>
      </body>
    </html>
  );
}