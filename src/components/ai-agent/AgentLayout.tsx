/**
 * AI Agent 主布局组件 - 增强版本
 * 集成新的AgentNavigation，提供响应式布局和Agent模式切换
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import AgentNavigation from "@/components/AgentNavigation";
import AgentOnboarding, {
  useAgentOnboarding,
} from "@/components/AgentOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Settings,
  MessageSquare,
  History,
  Puzzle,
  Sparkles,
  Menu,
  X,
  Monitor,
  Smartphone,
  Zap,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * 用户模式类型
 */
export type UserMode = "simple" | "advanced";

/**
 * 侧边栏项目接口
 */
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  description?: string;
  visible: {
    simple: boolean;
    advanced: boolean;
  };
}

/**
 * Agent布局上下文
 */
interface AgentLayoutContextValue {
  currentMode: UserMode;
  setCurrentMode: (mode: UserMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

const AgentLayoutContext = createContext<AgentLayoutContextValue | null>(null);

export const useAgentLayout = () => {
  const context = useContext(AgentLayoutContext);
  if (!context) {
    throw new Error("useAgentLayout must be used within an AgentLayout");
  }
  return context;
};

/**
 * Agent 布局属性
 */
interface AgentLayoutProps {
  children: React.ReactNode;
  defaultMode?: UserMode;
  className?: string;
  showSidebar?: boolean;
}

/**
 * AI Agent 增强布局组件
 */
export default function AgentLayout({
  children,
  defaultMode = "simple",
  className,
  showSidebar = true,
}: AgentLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("aiAgent");

  // 引导相关
  const {
    shouldShow: shouldShowOnboarding,
    markAsCompleted,
    markAsSkipped,
  } = useAgentOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 状态管理
  const [currentMode, setCurrentMode] = useState<UserMode>(defaultMode);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // 移动端默认收起侧边栏
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 检查是否需要显示引导
  useEffect(() => {
    if (user && !loading && shouldShowOnboarding) {
      // 延迟显示引导，让页面先渲染完成
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, shouldShowOnboarding]);

  // 侧边栏项目配置
  const sidebarItems: SidebarItem[] = [
    {
      id: "chat",
      label: t("sidebar.chat", "AI对话"),
      icon: MessageSquare,
      path: "/ai-agent",
      description: t("sidebar.chatDesc", "与AI助手进行对话"),
      visible: { simple: true, advanced: true },
    },
    {
      id: "history",
      label: t("sidebar.history", "对话历史"),
      icon: History,
      path: "/ai-agent/history",
      description: t("sidebar.historyDesc", "查看历史对话记录"),
      visible: { simple: true, advanced: true },
    },
    {
      id: "plugins",
      label: t("sidebar.plugins", "插件管理"),
      icon: Puzzle,
      path: "/ai-agent/plugins",
      badge: "Beta",
      description: t("sidebar.pluginsDesc", "管理AI助手插件"),
      visible: { simple: false, advanced: true },
    },
    {
      id: "settings",
      label: t("sidebar.settings", "设置"),
      icon: Settings,
      path: "/ai-agent/settings",
      description: t("sidebar.settingsDesc", "AI助手个性化设置"),
      visible: { simple: false, advanced: true },
    },
  ];

  // 初始化用户模式偏好
  useEffect(() => {
    if (!user || isInitialized) return;

    try {
      const savedMode = localStorage.getItem(
        `agent-mode-${user.id}`
      ) as UserMode;
      if (savedMode && (savedMode === "simple" || savedMode === "advanced")) {
        setCurrentMode(savedMode);
      }
    } catch (error) {
      console.warn("Failed to load user mode preference:", error);
    } finally {
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // 保存用户模式偏好
  const handleModeChange = useCallback(
    (newMode: UserMode) => {
      setCurrentMode(newMode);

      if (user) {
        try {
          localStorage.setItem(`agent-mode-${user.id}`, newMode);

          // 模式切换时的UI反馈
          const event = new CustomEvent("agentModeChanged", {
            detail: { mode: newMode, userId: user.id },
          });
          window.dispatchEvent(event);
        } catch (error) {
          console.warn("Failed to save user mode preference:", error);
        }
      }
    },
    [user]
  );

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // 导航到指定路径
  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
      // 移动端导航后自动收起侧边栏
      if (isMobile) {
        setSidebarOpen(false);
      }
    },
    [router, isMobile]
  );

  // 检查当前路径是否激活
  const isPathActive = useCallback(
    (path: string) => {
      if (path === "/ai-agent") {
        return pathname === path || pathname === "/ai-agent/";
      }
      return pathname.startsWith(path);
    },
    [pathname]
  );

  // 获取当前可见的侧边栏项目
  const visibleSidebarItems = sidebarItems.filter(
    (item) => item.visible[currentMode]
  );

  // 如果用户未认证，重定向到登录页
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // 加载状态
  if (loading || !user || !isInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <AgentNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">
              {t("loading", "加载中...")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 上下文值
  const contextValue: AgentLayoutContextValue = {
    currentMode,
    setCurrentMode: handleModeChange,
    sidebarOpen,
    setSidebarOpen,
    isMobile,
  };

  // 移动端布局
  if (isMobile) {
    return (
      <AgentLayoutContext.Provider value={contextValue}>
        <div className={cn("min-h-screen bg-background", className)}>
          <AgentNavigation />

          <div className="flex pt-16">
            {showSidebar && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-20 left-4 z-40 md:hidden"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <MobileSidebar
                    items={visibleSidebarItems}
                    currentMode={currentMode}
                    onModeChange={handleModeChange}
                    onNavigate={navigateTo}
                    isPathActive={isPathActive}
                  />
                </SheetContent>
              </Sheet>
            )}

            <main className="flex-1">{children}</main>
          </div>

          {/* 新用户引导 */}
          <AgentOnboarding
            isOpen={showOnboarding}
            onClose={() => {
              setShowOnboarding(false);
              markAsSkipped();
            }}
            onComplete={() => {
              setShowOnboarding(false);
              markAsCompleted();
            }}
          />
        </div>
      </AgentLayoutContext.Provider>
    );
  }

  // 桌面端布局
  return (
    <AgentLayoutContext.Provider value={contextValue}>
      <div
        className={cn("flex flex-col min-h-screen bg-background", className)}
      >
        <AgentNavigation />

        <div className="flex flex-grow pt-16">
          {showSidebar && (
            <DesktopSidebar
              open={sidebarOpen}
              items={visibleSidebarItems}
              currentMode={currentMode}
              onModeChange={handleModeChange}
              onNavigate={navigateTo}
              onToggle={toggleSidebar}
              isPathActive={isPathActive}
            />
          )}

          <main
            className={cn(
              "flex-1 transition-all duration-200",
              showSidebar && sidebarOpen ? "ml-0" : "",
              !showSidebar ? "ml-0" : ""
            )}
          >
            {children}
          </main>
        </div>

        {/* 新用户引导 */}
        <AgentOnboarding
          isOpen={showOnboarding}
          onClose={() => {
            setShowOnboarding(false);
            markAsSkipped();
          }}
          onComplete={() => {
            setShowOnboarding(false);
            markAsCompleted();
          }}
        />
      </div>
    </AgentLayoutContext.Provider>
  );
}

/**
 * 桌面端侧边栏组件
 */
interface DesktopSidebarProps {
  open: boolean;
  items: SidebarItem[];
  currentMode: UserMode;
  onModeChange: (mode: UserMode) => void;
  onNavigate: (path: string) => void;
  onToggle: () => void;
  isPathActive: (path: string) => boolean;
}

function DesktopSidebar({
  open,
  items,
  currentMode,
  onModeChange,
  onNavigate,
  onToggle,
  isPathActive,
}: DesktopSidebarProps) {
  const t = useTranslations("aiAgent");

  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-200 flex flex-col",
        open ? "w-64" : "w-16"
      )}
    >
      {/* 侧边栏头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {open && (
            <div className="flex-1">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>{t("title", "AI助手")}</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("subtitle", "智能对话助手")}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0"
          >
            {open ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 模式切换器 */}
      {open && (
        <div className="p-4 border-b border-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("modes.title", "操作模式")}
              </span>
              <Badge
                variant={currentMode === "advanced" ? "default" : "secondary"}
              >
                {currentMode === "simple" ? "简洁" : "高级"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={currentMode === "simple" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("simple")}
                className="flex flex-col h-auto p-3 space-y-1"
              >
                <Monitor className="h-4 w-4" />
                <span className="text-xs">简洁模式</span>
              </Button>
              <Button
                variant={currentMode === "advanced" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("advanced")}
                className="flex flex-col h-auto p-3 space-y-1"
              >
                <Brain className="h-4 w-4" />
                <span className="text-xs">高级模式</span>
              </Button>
            </div>

            {currentMode === "advanced" && (
              <p className="text-xs text-muted-foreground">
                {t("modes.advancedDescription", "包含插件管理、高级设置等功能")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 导航菜单 */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = isPathActive(item.path);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative",
                    !open && "justify-center px-2",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                  onClick={() => onNavigate(item.path)}
                >
                  <Icon className={cn("h-4 w-4", !open && "h-5 w-5")} />
                  {open && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="outline" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>

                {/* Tooltip for collapsed state */}
                {!open && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 侧边栏底部信息 */}
      {open && currentMode === "advanced" && (
        <div className="p-4 border-t border-border">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0 animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-primary">
                    {t("status.connected", "AI助手已连接")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    GPT-4 • {t("status.plugins", "插件")} •{" "}
                    {t("status.tools", "工具")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </aside>
  );
}

/**
 * 移动端侧边栏组件
 */
interface MobileSidebarProps {
  items: SidebarItem[];
  currentMode: UserMode;
  onModeChange: (mode: UserMode) => void;
  onNavigate: (path: string) => void;
  isPathActive: (path: string) => boolean;
}

function MobileSidebar({
  items,
  currentMode,
  onModeChange,
  onNavigate,
  isPathActive,
}: MobileSidebarProps) {
  const t = useTranslations("aiAgent");

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <SheetTitle>{t("title", "AI助手")}</SheetTitle>
        </div>
      </SheetHeader>

      {/* 模式切换器 */}
      <div className="p-4 border-b">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("modes.title", "操作模式")}
            </span>
            <Badge
              variant={currentMode === "advanced" ? "default" : "secondary"}
            >
              {currentMode === "simple" ? "简洁" : "高级"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={currentMode === "simple" ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange("simple")}
              className="flex flex-col h-auto p-3 space-y-1"
            >
              <Smartphone className="h-4 w-4" />
              <span className="text-xs">简洁</span>
            </Button>
            <Button
              variant={currentMode === "advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange("advanced")}
              className="flex flex-col h-auto p-3 space-y-1"
            >
              <Zap className="h-4 w-4" />
              <span className="text-xs">高级</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {items.map((item) => {
            const isActive = isPathActive(item.path);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-4",
                    isActive && "bg-primary/10 text-primary"
                  )}
                  onClick={() => onNavigate(item.path)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Icon className="h-5 w-5" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="outline" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/**
 * 页面头部组件
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("bg-card border-b border-border px-6 py-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-3">{actions}</div>
        )}
      </div>
    </div>
  );
}

/**
 * 快速操作栏组件
 */
interface QuickActionsProps {
  mode: UserMode;
  onModeChange: (mode: UserMode) => void;
  className?: string;
}

export function QuickActions({
  mode,
  onModeChange,
  className,
}: QuickActionsProps) {
  const t = useTranslations("aiAgent");

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-muted-foreground">
        {t("quickActions.mode", "模式")}:
      </span>
      <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
        <Button
          variant={mode === "simple" ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange("simple")}
          className="text-xs h-6"
        >
          {t("modes.simple", "简洁")}
        </Button>
        <Button
          variant={mode === "advanced" ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange("advanced")}
          className="text-xs h-6"
        >
          {t("modes.advanced", "高级")}
        </Button>
      </div>
    </div>
  );
}
