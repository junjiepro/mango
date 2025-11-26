import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mango - 智能Agent对话平台",
  description: "支持多模态对话、后台任务执行、小应用生态的智能Agent平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
