"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthStatus from "@/components/AuthStatus";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Actions, Action } from "@/components/ai-elements/actions";
import AgentFeaturePreview from "@/components/AgentFeaturePreview";
import {
  Bot,
  Sparkles,
  MessageSquare,
  Brain,
  Zap,
  Heart,
  ArrowRight,
  Play,
  Wand2,
  Coffee,
  Code,
  Search,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, loading } = useAuth();
  const t = useTranslations("pages.home");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Sample suggestions for different user types
  const guestSuggestions = [
    "什么是AI助手？",
    "如何开始使用？",
    "有哪些功能？",
    "查看演示",
  ];

  const userSuggestions = [
    "帮我写一段代码",
    "分析这个问题",
    "创建一个计划",
    "解释一个概念",
    "翻译文本",
    "头脑风暴",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    if (user) {
      // If user is logged in, go to ai-agent with the suggestion
      router.push(`/ai-agent?q=${encodeURIComponent(suggestion)}`);
    } else {
      // If not logged in, go to register with suggestion context
      router.push(`/register?intent=${encodeURIComponent(suggestion)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 animate-pulse text-primary" />
          <div className="text-lg font-medium">{tCommon("loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-2.5 bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Brand and Badge */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-12 w-12 text-primary" />
            <Badge variant="outline" className="text-sm">
              Beta
            </Badge>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            欢迎来到{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mango AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            您的智能助手伙伴，让每一次对话都充满可能
          </p>

          {/* Feature highlights */}
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Brain className="h-4 w-4" />
              <span>智能理解</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span>快速响应</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span>贴心服务</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="container pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Suggestions */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-center mb-6">
              {user ? "试试这些对话开场白" : "探索AI助手能为您做什么"}
            </h2>
            <Suggestions className="justify-center">
              {(user ? userSuggestions : guestSuggestions).map(
                (suggestion, index) => (
                  <Suggestion
                    key={index}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    className="hover:scale-105 transition-transform"
                  />
                )
              )}
            </Suggestions>
          </div>

          {/* Main Action Card */}
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-card to-accent/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>{user ? "继续您的AI之旅" : "开始您的AI之旅"}</span>
              </CardTitle>
              <CardDescription>
                {user
                  ? "直接开始对话，或查看您的活动历史"
                  : "注册即可体验完整的AI助手功能"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                // Logged in user actions
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={() => router.push("/ai-agent")}
                    className="flex items-center space-x-2"
                    size="lg"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>开始新对话</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center space-x-2"
                    size="lg"
                  >
                    <Bot className="h-4 w-4" />
                    <span>查看活动中心</span>
                  </Button>
                </div>
              ) : (
                // Guest user actions
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push("/register")}
                    className="w-full flex items-center justify-center space-x-2"
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>免费开始使用</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/login")}
                    className="w-full flex items-center justify-center space-x-2"
                    size="lg"
                  >
                    <span>已有账户？登录</span>
                  </Button>
                </div>
              )}

              {/* Quick actions */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <span>快速功能：</span>
                  <Actions>
                    <Action
                      tooltip="代码助手"
                      onClick={() => handleSuggestionClick("帮我写代码")}
                    >
                      <Code className="h-4 w-4" />
                    </Action>
                    <Action
                      tooltip="创意助手"
                      onClick={() => handleSuggestionClick("头脑风暴")}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Action>
                    <Action
                      tooltip="学习助手"
                      onClick={() => handleSuggestionClick("解释概念")}
                    >
                      <Search className="h-4 w-4" />
                    </Action>
                    <Action
                      tooltip="写作助手"
                      onClick={() => handleSuggestionClick("帮我写作")}
                    >
                      <PenTool className="h-4 w-4" />
                    </Action>
                  </Actions>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Agent Feature Preview */}
      <AgentFeaturePreview />

      {/* Features Grid */}
      <section className="container pb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            为什么选择 Mango AI？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>智能理解</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  深度理解您的需求，提供精准而有价值的回答
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>极速响应</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  毫秒级响应速度，让您的工作效率倍增
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>贴心体验</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  简洁友好的界面设计，让AI助手真正成为您的伙伴
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
