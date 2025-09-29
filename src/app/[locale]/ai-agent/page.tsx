import { Suspense } from "react";
import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/supabase/auth-helpers";
import { AgentLayout } from "@/components/ai-agent";
import { ContentRenderer } from "@/components/ai-agent";
import { ToolExecutionVisualizer } from "@/components/ai-agent";
import { QuickActions } from "@/components/ai-agent/QuickActions";
import { MCPPluginButton } from "@/components/ai-agent/MCPPluginButton";
import { SessionInfo } from "@/components/ai-agent/SessionInfo";
import { ConversationWrapper } from "@/components/ai-agent/ConversationWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  MessageSquare,
  Settings,
  History,
  Zap,
  Info,
  Sparkles,
} from "lucide-react";

interface AIAgentPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    mode?: "simple" | "advanced";
    session?: string;
    tab?: string;
  }>;
}

export async function generateMetadata({
  params,
}: AIAgentPageProps): Promise<Metadata> {
  return {
    title: "AI Agent - Mango",
    description:
      "Intelligent AI Assistant with multimodal capabilities and MCP tool integration",
    keywords: ["AI", "Agent", "Assistant", "MCP", "Tools", "Multimodal"],
    openGraph: {
      title: "AI Agent - Mango",
      description: "Advanced AI Assistant with comprehensive tool integration",
      type: "website",
    },
  };
}

// Loading components
function ConversationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}

function WelcomePanel({ userMode }: { userMode: "simple" | "advanced" }) {
  const t = useTranslations("aiAgent");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("welcome.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{t("features.intelligent")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("features.intelligentDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="font-medium">{t("features.multimodal")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("features.multimodalDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{t("features.tools")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("features.toolsDesc")}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {t(`mode.${userMode}.title`)}
              </p>
              <p className="text-sm text-blue-700">
                {t(`mode.${userMode}.description`)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AIAgentPage({
  params,
  searchParams,
}: AIAgentPageProps) {
  // Validate authentication
  const { user } = await requireAuth();

  // Await params and searchParams (Next.js 15 requirement)
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Validate locale
  if (!["zh", "en"].includes(resolvedParams.locale)) {
    notFound();
  }

  // Get user preferences
  const userMode = (resolvedSearchParams.mode || "simple") as
    | "simple"
    | "advanced";
  const sessionId = resolvedSearchParams.session;
  const activeTab = resolvedSearchParams.tab || "chat";

  return (
    <AgentLayout defaultMode={userMode} className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Agent</h1>
            <p className="text-muted-foreground mt-1">
              {userMode === "simple"
                ? "智能AI助手，让对话更简单"
                : "高级AI代理，配备多模态处理和MCP工具集成"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={userMode === "simple" ? "default" : "secondary"}>
              {userMode === "simple" ? "简单模式" : "高级模式"}
            </Badge>
          </div>
        </div>

        {/* Session Info */}
        <SessionInfo sessionId={sessionId} userMode={userMode} />

        {/* Main Content */}
        <Tabs value={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              对话
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              工具
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              历史
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <WelcomePanel userMode={userMode} />
            <QuickActions userMode={userMode} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI对话
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ConversationSkeleton />}>
                  <ConversationWrapper
                    mode={userMode}
                    sessionId={sessionId}
                    className="min-h-[400px]"
                  />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    MCP工具
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    管理和配置Model Context Protocol工具
                  </p>
                  <MCPPluginButton className="w-full" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    工具执行
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div>加载中...</div>}>
                    <ToolExecutionVisualizer
                      toolCalls={[]}
                      executionRecords={[]}
                      userMode={userMode}
                      detailLevel={
                        userMode === "simple" ? "simple" : "detailed"
                      }
                    />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  会话历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    您的AI对话历史将在这里显示
                  </p>

                  {/* Placeholder for session history */}
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">示例会话</p>
                          <p className="text-sm text-muted-foreground">
                            2024年3月15日
                          </p>
                        </div>
                        <Badge variant="outline">简单模式</Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    查看所有会话
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AgentLayout>
  );
}
