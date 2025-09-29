"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Settings,
  Shield,
  Bot,
  MessageSquare,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Brain,
} from "lucide-react";
import {
  Message,
  Conversation,
  PromptInput,
  CodeBlock,
  CodeBlockHeader,
  CodeBlockContent,
} from "@/components/ai-elements";
import { useAgentPreferences } from "@/lib/supabase/agent-preferences";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome");
  const redirectMessage = searchParams.get("message");
  const [showWelcome, setShowWelcome] = useState(welcome === "true");
  const [showRedirectMessage, setShowRedirectMessage] = useState(
    !!redirectMessage
  );

  // Agent 偏好设置
  const { preferences, loading: prefsLoading } = useAgentPreferences(user);

  // 模拟 Agent 使用统计数据
  const agentStats = useMemo(
    () => ({
      totalConversations: 42,
      todayConversations: 5,
      averageResponseTime: "1.2s",
      favoriteModel: "GPT-4",
      weeklyUsage: [3, 7, 5, 8, 12, 6, 5], // 最近7天的对话次数
      topFeatures: [
        { name: "代码助手", usage: 85, trend: "+12%" },
        { name: "文档写作", usage: 72, trend: "+8%" },
        { name: "数据分析", usage: 63, trend: "+15%" },
        { name: "创意写作", usage: 45, trend: "+5%" },
      ],
      recentConversations: [
        {
          id: "1",
          title: "优化 React 组件性能",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
          messageCount: 12,
          status: "completed",
        },
        {
          id: "2",
          title: "设计数据库架构",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6小时前
          messageCount: 8,
          status: "completed",
        },
        {
          id: "3",
          title: "API 文档生成",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
          messageCount: 15,
          status: "completed",
        },
      ],
    }),
    []
  );

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  useEffect(() => {
    if (showRedirectMessage) {
      const timer = setTimeout(() => {
        setShowRedirectMessage(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        window.history.replaceState({}, document.title, url.toString());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showRedirectMessage]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login?message=您已成功退出登录");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else {
      return "刚刚";
    }
  };

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载 Agent 活动中心...</p>
        </div>
      </div>
    );
  }

  // 这个检查实际上不应该触发，因为中间件会处理未认证的访问
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">访问被拒绝</CardTitle>
            <CardDescription>请先登录以访问 Agent 活动中心</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Mango AI</h1>
                <Badge variant="outline">活动中心</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                欢迎，{user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 容器内容 */}
      <div className="py-8 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 重定向消息 */}
          {showRedirectMessage && redirectMessage && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{redirectMessage}</AlertDescription>
            </Alert>
          )}

          {/* 欢迎消息 */}
          {showWelcome && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                欢迎使用 Mango AI！您的智能助手已准备就绪。
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWelcome(false)}
                  className="ml-2"
                >
                  关闭
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 页面标题 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">AI Agent 活动中心</h2>
            <p className="text-muted-foreground">
              查看您的 AI 助手使用情况和活动统计
            </p>
          </div>

          {/* Agent 统计概览 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      总对话数
                    </h3>
                    <p className="text-2xl font-bold">
                      {agentStats.totalConversations}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      今日对话
                    </h3>
                    <p className="text-2xl font-bold">
                      {agentStats.todayConversations}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      平均响应
                    </h3>
                    <p className="text-2xl font-bold">
                      {agentStats.averageResponseTime}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <Brain className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      首选模型
                    </h3>
                    <p className="text-2xl font-bold">
                      {agentStats.favoriteModel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 功能使用统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>功能使用情况</span>
                </CardTitle>
                <CardDescription>您最常使用的 AI 助手功能</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentStats.topFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {feature.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              {feature.usage}%
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600"
                            >
                              {feature.trend}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${feature.usage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 近期对话历史 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>近期对话</span>
                </CardTitle>
                <CardDescription>您最近与 AI 助手的对话记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentStats.recentConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/chat/${conversation.id}`)}
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {conversation.messageCount} 条消息
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(conversation.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        已完成
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/chat")}
                  >
                    查看所有对话
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>开始新的 AI 对话或管理您的设置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Button
                  variant="default"
                  className="h-16 flex-col space-y-2"
                  onClick={() => router.push("/ai-agent")}
                >
                  <Bot className="h-6 w-6" />
                  <span>开始新对话</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 flex-col space-y-2"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  <User className="h-6 w-6" />
                  <span>个人设置</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 flex-col space-y-2"
                  onClick={() => router.push("/dashboard/settings")}
                >
                  <Settings className="h-6 w-6" />
                  <span>Agent 配置</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
