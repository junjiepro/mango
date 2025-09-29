"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePasswordSchema,
  type UpdatePasswordFormData,
} from "@/lib/validations/auth";
import { updatePasswordAction } from "./actions";
import {
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Calendar,
  Shield,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Bot,
  Settings,
  Palette,
  Globe,
  MessageSquare,
  Zap,
  Brain,
  Lock,
  Monitor,
} from "lucide-react";
import { useAgentPreferences } from "@/lib/supabase/agent-preferences";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 密码更新相关状态
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Agent 偏好设置
  const {
    preferences,
    loading: prefsLoading,
    updatePreferences,
    error: prefsError,
  } = useAgentPreferences(user);
  const [prefsUpdateSuccess, setPrefsUpdateSuccess] = useState(false);
  const [prefsUpdateError, setPrefsUpdateError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "agent">("profile");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => {
        setUpdateSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess]);

  useEffect(() => {
    if (updateError) {
      const timer = setTimeout(() => {
        setUpdateError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [updateError]);

  useEffect(() => {
    if (prefsUpdateSuccess) {
      const timer = setTimeout(() => {
        setPrefsUpdateSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [prefsUpdateSuccess]);

  useEffect(() => {
    if (prefsUpdateError) {
      const timer = setTimeout(() => {
        setPrefsUpdateError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [prefsUpdateError]);

  const onPasswordUpdate = async (data: UpdatePasswordFormData) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const formData = new FormData();
      formData.append("currentPassword", data.currentPassword);
      formData.append("newPassword", data.newPassword);
      formData.append("confirmPassword", data.confirmPassword);

      const result = await updatePasswordAction(formData);

      if (result.error) {
        setUpdateError(result.error);
      } else if (result.success) {
        setUpdateSuccess(true);
        setShowPasswordForm(false);
        reset();
      }
    } catch (error) {
      setUpdateError("密码更新失败，请稍后重试");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferenceUpdate = async (key: string, value: any) => {
    if (!preferences) return;

    try {
      setPrefsUpdateError(null);

      // 构建更新对象
      const updates = { [key]: value };
      await updatePreferences(updates);

      setPrefsUpdateSuccess(true);
    } catch (error) {
      setPrefsUpdateError("偏好设置更新失败，请稍后重试");
    }
  };

  const getAccountStatusColor = () => {
    if (!user?.email_confirmed_at) return "destructive";
    return "default";
  };

  const getAccountStatusText = () => {
    if (!user?.email_confirmed_at) return "待验证";
    return "已验证";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载用户信息...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">访问被拒绝</CardTitle>
            <CardDescription>请先登录以访问个人资料</CardDescription>
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
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回活动中心
              </Button>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">个人设置</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                欢迎，{user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 成功消息 */}
          {(updateSuccess || prefsUpdateSuccess) && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {updateSuccess && "密码已成功更新"}
                {prefsUpdateSuccess && "Agent 偏好设置已成功更新"}
              </AlertDescription>
            </Alert>
          )}

          {/* 错误消息 */}
          {(updateError || prefsUpdateError || prefsError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {updateError ||
                  prefsUpdateError ||
                  prefsError?.message ||
                  "操作失败，请稍后重试"}
              </AlertDescription>
            </Alert>
          )}

          {/* 页面标题和标签切换 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">个人设置</h2>
            <p className="text-muted-foreground mb-6">
              管理您的账户信息和 AI Agent 偏好设置
            </p>

            {/* 标签切换 */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("profile")}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>账户信息</span>
              </Button>
              <Button
                variant={activeTab === "agent" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("agent")}
                className="flex items-center space-x-2"
              >
                <Bot className="h-4 w-4" />
                <span>Agent 设置</span>
              </Button>
            </div>
          </div>

          {/* 账户信息标签页 */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 gap-6">
              {/* 基本信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    基本信息
                  </CardTitle>
                  <CardDescription>您的账户基本信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        用户ID
                      </Label>
                      <p className="mt-1 text-sm font-mono bg-muted p-2 rounded border">
                        {user.id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        邮箱地址
                      </Label>
                      <p className="mt-1 text-sm p-2">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        账户状态
                      </Label>
                      <div className="mt-1">
                        <Badge variant={getAccountStatusColor() as any}>
                          {getAccountStatusText()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        注册时间
                      </Label>
                      <p className="mt-1 text-sm p-2">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* 邮箱验证提醒 */}
                  {!user.email_confirmed_at && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        您的邮箱尚未验证。请检查您的邮箱并点击验证链接以完成验证。
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 账户详情卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>账户详情</CardTitle>
                  <CardDescription>详细的账户信息和活动记录</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {user.email_confirmed_at && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          邮箱验证时间
                        </Label>
                        <p className="mt-1 text-sm p-2">
                          {formatDate(user.email_confirmed_at)}
                        </p>
                      </div>
                    )}
                    {user.last_sign_in_at && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          最后登录
                        </Label>
                        <p className="mt-1 text-sm p-2">
                          {formatDate(user.last_sign_in_at)}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        更新时间
                      </Label>
                      <p className="mt-1 text-sm p-2">
                        {formatDate(user.updated_at)}
                      </p>
                    </div>
                    {user.phone && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          手机号码
                        </Label>
                        <p className="mt-1 text-sm p-2">{user.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 安全设置卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    安全设置
                  </CardTitle>
                  <CardDescription>管理您的账户安全</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">密码</h4>
                        <p className="text-sm text-muted-foreground">
                          修改您的登录密码
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        {showPasswordForm ? "取消" : "更改密码"}
                      </Button>
                    </div>

                    {/* 密码更新表单 */}
                    {showPasswordForm && (
                      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                        <CardContent className="p-6">
                          <form
                            onSubmit={handleSubmit(onPasswordUpdate)}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="currentPassword">当前密码</Label>
                              <div className="relative">
                                <Input
                                  id="currentPassword"
                                  type={
                                    showCurrentPassword ? "text" : "password"
                                  }
                                  {...register("currentPassword")}
                                  className="pr-10"
                                  placeholder="请输入当前密码"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowCurrentPassword(!showCurrentPassword)
                                  }
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {errors.currentPassword && (
                                <p className="text-sm text-destructive mt-1">
                                  {errors.currentPassword.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="newPassword">新密码</Label>
                              <div className="relative">
                                <Input
                                  id="newPassword"
                                  type={showNewPassword ? "text" : "password"}
                                  {...register("newPassword")}
                                  className="pr-10"
                                  placeholder="请输入新密码"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {errors.newPassword && (
                                <p className="text-sm text-destructive mt-1">
                                  {errors.newPassword.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="confirmPassword">
                                确认新密码
                              </Label>
                              <div className="relative">
                                <Input
                                  id="confirmPassword"
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  {...register("confirmPassword")}
                                  className="pr-10"
                                  placeholder="请再次输入新密码"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {errors.confirmPassword && (
                                <p className="text-sm text-destructive mt-1">
                                  {errors.confirmPassword.message}
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-3 pt-4">
                              <Button
                                type="submit"
                                disabled={isUpdating}
                                className="flex items-center"
                              >
                                {isUpdating ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    更新中...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    更新密码
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowPasswordForm(false);
                                  reset();
                                  setUpdateError(null);
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Agent 设置标签页 */}
          {activeTab === "agent" && preferences && (
            <div className="grid grid-cols-1 gap-6">
              {/* 基本偏好设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    基本设置
                  </CardTitle>
                  <CardDescription>配置您的 AI Agent 基本偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Agent 模式 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Bot className="h-4 w-4 mr-1" />
                        Agent 模式
                      </Label>
                      <Select
                        value={preferences.mode}
                        onValueChange={(value) =>
                          handlePreferenceUpdate("mode", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">简洁模式</SelectItem>
                          <SelectItem value="advanced">高级模式</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {preferences.mode === "simple"
                          ? "专注于核心功能的简化界面"
                          : "完整功能的专业界面"}
                      </p>
                    </div>

                    {/* 主题设置 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Palette className="h-4 w-4 mr-1" />
                        外观主题
                      </Label>
                      <Select
                        value={preferences.theme}
                        onValueChange={(value) =>
                          handlePreferenceUpdate("theme", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择主题" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">浅色主题</SelectItem>
                          <SelectItem value="dark">深色主题</SelectItem>
                          <SelectItem value="system">跟随系统</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 语言设置 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        界面语言
                      </Label>
                      <Select
                        value={preferences.language}
                        onValueChange={(value) =>
                          handlePreferenceUpdate("language", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择语言" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh">简体中文</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 对话设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    对话设置
                  </CardTitle>
                  <CardDescription>自定义您的对话体验</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 自动保存 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          自动保存对话
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          自动保存对话记录到云端
                        </p>
                      </div>
                      <Switch
                        checked={preferences.conversation_settings.auto_save}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("conversation_settings", {
                            ...preferences.conversation_settings,
                            auto_save: checked,
                          })
                        }
                      />
                    </div>

                    {/* 显示时间戳 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          显示时间戳
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          在消息中显示时间信息
                        </p>
                      </div>
                      <Switch
                        checked={
                          preferences.conversation_settings.show_timestamps
                        }
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("conversation_settings", {
                            ...preferences.conversation_settings,
                            show_timestamps: checked,
                          })
                        }
                      />
                    </div>

                    {/* 打字指示器 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          打字指示器
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          显示 AI 正在输入的动画
                        </p>
                      </div>
                      <Switch
                        checked={
                          preferences.conversation_settings
                            .show_typing_indicator
                        }
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("conversation_settings", {
                            ...preferences.conversation_settings,
                            show_typing_indicator: checked,
                          })
                        }
                      />
                    </div>

                    {/* 历史记录限制 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        历史记录限制
                      </Label>
                      <div className="px-3">
                        <Slider
                          value={[
                            preferences.conversation_settings.history_limit,
                          ]}
                          onValueChange={(value) =>
                            handlePreferenceUpdate("conversation_settings", {
                              ...preferences.conversation_settings,
                              history_limit: value[0],
                            })
                          }
                          max={500}
                          min={10}
                          step={10}
                          className="w-full"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        保留最近{" "}
                        {preferences.conversation_settings.history_limit} 条消息
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI 模型设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    AI 模型设置
                  </CardTitle>
                  <CardDescription>配置 AI 模型的行为和性能</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI 模型选择 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">AI 模型</Label>
                      <Select
                        value={preferences.ai_settings.model}
                        onValueChange={(value) =>
                          handlePreferenceUpdate("ai_settings", {
                            ...preferences.ai_settings,
                            model: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4 (推荐)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">
                            GPT-3.5 Turbo
                          </SelectItem>
                          <SelectItem value="claude-3">Claude 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 流式响应 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center">
                          <Zap className="h-4 w-4 mr-1" />
                          流式响应
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          实时显示 AI 回答过程
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ai_settings.stream_responses}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ai_settings", {
                            ...preferences.ai_settings,
                            stream_responses: checked,
                          })
                        }
                      />
                    </div>

                    {/* 启用工具 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          启用工具调用
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          允许 AI 使用外部工具
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ai_settings.enable_tools}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ai_settings", {
                            ...preferences.ai_settings,
                            enable_tools: checked,
                          })
                        }
                      />
                    </div>

                    {/* 启用记忆 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          启用长期记忆
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          AI 记住上下文信息
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ai_settings.enable_memory}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ai_settings", {
                            ...preferences.ai_settings,
                            enable_memory: checked,
                          })
                        }
                      />
                    </div>

                    {/* 温度参数 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        创造性 (Temperature)
                      </Label>
                      <div className="px-3">
                        <Slider
                          value={[preferences.ai_settings.temperature]}
                          onValueChange={(value) =>
                            handlePreferenceUpdate("ai_settings", {
                              ...preferences.ai_settings,
                              temperature: value[0],
                            })
                          }
                          max={2}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        当前值: {preferences.ai_settings.temperature}{" "}
                        (值越高越有创造性)
                      </p>
                    </div>

                    {/* 最大令牌数 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        最大响应长度
                      </Label>
                      <div className="px-3">
                        <Slider
                          value={[preferences.ai_settings.max_tokens]}
                          onValueChange={(value) =>
                            handlePreferenceUpdate("ai_settings", {
                              ...preferences.ai_settings,
                              max_tokens: value[0],
                            })
                          }
                          max={8000}
                          min={100}
                          step={100}
                          className="w-full"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        当前限制: {preferences.ai_settings.max_tokens} 个令牌
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 界面偏好 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="h-5 w-5 mr-2" />
                    界面偏好
                  </CardTitle>
                  <CardDescription>自定义界面显示和交互</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 侧边栏折叠 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          默认折叠侧边栏
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          启动时自动折叠侧边栏
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ui_preferences.sidebar_collapsed}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ui_preferences", {
                            ...preferences.ui_preferences,
                            sidebar_collapsed: checked,
                          })
                        }
                      />
                    </div>

                    {/* 紧凑模式 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">紧凑模式</Label>
                        <p className="text-xs text-muted-foreground">
                          减少界面间距和内边距
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ui_preferences.compact_mode}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ui_preferences", {
                            ...preferences.ui_preferences,
                            compact_mode: checked,
                          })
                        }
                      />
                    </div>

                    {/* 代码预览 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          显示代码预览
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          在对话中显示代码高亮
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ui_preferences.show_code_preview}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ui_preferences", {
                            ...preferences.ui_preferences,
                            show_code_preview: checked,
                          })
                        }
                      />
                    </div>

                    {/* 动画效果 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          启用动画效果
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          界面切换和交互动画
                        </p>
                      </div>
                      <Switch
                        checked={preferences.ui_preferences.animation_enabled}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("ui_preferences", {
                            ...preferences.ui_preferences,
                            animation_enabled: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 隐私设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    隐私设置
                  </CardTitle>
                  <CardDescription>管理您的数据隐私和安全</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* 收集分析数据 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          收集分析数据
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          帮助我们改善产品体验
                        </p>
                      </div>
                      <Switch
                        checked={preferences.privacy_settings.collect_analytics}
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("privacy_settings", {
                            ...preferences.privacy_settings,
                            collect_analytics: checked,
                          })
                        }
                      />
                    </div>

                    {/* 分享对话 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          允许分享对话
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          启用对话分享链接功能
                        </p>
                      </div>
                      <Switch
                        checked={
                          preferences.privacy_settings.share_conversations
                        }
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("privacy_settings", {
                            ...preferences.privacy_settings,
                            share_conversations: checked,
                          })
                        }
                      />
                    </div>

                    {/* 个性化推荐 */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          启用个性化推荐
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          基于使用历史提供个性化建议
                        </p>
                      </div>
                      <Switch
                        checked={
                          preferences.privacy_settings.personalization_enabled
                        }
                        onCheckedChange={(checked) =>
                          handlePreferenceUpdate("privacy_settings", {
                            ...preferences.privacy_settings,
                            personalization_enabled: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
