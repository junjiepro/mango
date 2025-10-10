/**
 * AI Agent 对话接口组件 - AI SDK 5.0 优化版本
 * 基于传输架构，支持流式响应和多模态内容
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import {
  Message,
  MessageContent,
  MessageAvatar,
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputAttachment,
  CodeBlock,
  CodeBlockCopyButton,
  Loader,
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  Suggestions,
  Suggestion,
  PromptInputAttachments,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
} from "@/components/ai-elements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Code,
  Lightbulb,
  BookOpen,
  Calculator,
  Brain,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import type { UIMessage, UserMode } from "@/types/ai-agent";

/**
 * 对话接口属性
 */
interface ConversationInterfaceProps {
  mode: UserMode;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  className?: string;
}

/**
 * 示例建议
 */
const getModeSuggestions = (mode: UserMode, t: any) => {
  const suggestions = {
    simple: ["帮我解释一个概念", "写一段代码", "翻译这段文字", "总结一下要点"],
    advanced: [
      "分析这个算法的复杂度",
      "设计一个系统架构",
      "调试这个问题",
      "优化代码性能",
      "生成测试用例",
      "解释设计模式",
    ],
  };
  return suggestions[mode] || suggestions.simple;
};

/**
 * AI Agent 对话接口组件 - AI SDK 5.0 优化版本
 */
export default function ConversationInterface({
  mode,
  sessionId,
  onSessionChange,
  className,
}: ConversationInterfaceProps) {
  const { user } = useAuth();
  const t = useTranslations("aiAgent.conversation");

  // 本地状态管理 - AI SDK 5.0 不再管理输入状态
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // AI SDK 5.0 useChat hook
  const {
    messages,
    status,
    error,
    sendMessage,
    regenerate,
    stop,
    clearError,
    resumeStream,
    addToolResult,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai-agent",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        mode,
        sessionId,
        userId: user?.id,
      },
    }),
    id: sessionId,
    onFinish: ({ message, messages, isAbort, isDisconnect, isError }) => {
      if (!isAbort && !isDisconnect && !isError) {
        console.log("Message finished:", message);
        // 处理会话ID更新
        if (message.metadata?.sessionId && onSessionChange) {
          onSessionChange(message.metadata.sessionId);
        }
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onToolCall: async ({ toolCall }) => {
      // 处理工具调用
      console.log("Tool call:", toolCall);
      // 这里可以添加工具调用的具体逻辑
    },
    onData: (dataPart) => {
      // 处理数据部分
      console.log("Data part:", dataPart);
    },
  });

  // 计算是否正在加载
  const isLoading = status === "streaming" || status === "submitted";

  // 建议列表
  const suggestions = getModeSuggestions(mode, t);

  // 处理建议点击
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  }, []);

  // 处理消息提交 - 使用 AI SDK 5.0 的 sendMessage
  const handlePromptSubmit = useCallback(
    async (
      message: { text?: string; files?: any[] },
      event: React.FormEvent
    ) => {
      event.preventDefault();

      const messageText = message.text?.trim() || input.trim();
      if (!messageText && (!message.files || message.files.length === 0)) {
        return;
      }

      if (isLoading) return;

      setShowSuggestions(false);

      try {
        // 准备消息选项
        const messageOptions = {
          data: {
            mode,
            sessionId,
            userId: user?.id,
            files: message.files || attachments,
          },
        };

        // 使用 AI SDK 5.0 的 sendMessage - 第一个参数需要是包含 text 属性的对象
        await sendMessage({
          text: messageText,
          files: message.files || attachments,
        });

        // 清理状态
        setInput("");
        setAttachments([]);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [input, isLoading, sendMessage, mode, sessionId, user?.id, attachments]
  );

  // 处理输入变化
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // 处理文件附件
  const handleFileSelect = useCallback((files: File[]) => {
    setAttachments((prev) => [...prev, ...files]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 渲染消息内容 - 使用AI SDK 5.0的消息格式
  const renderMessageContent = useCallback((message: any) => {
    // 处理 AI SDK 5.0 的 parts 结构
    if (message.parts && Array.isArray(message.parts)) {
      return (
        <div className="space-y-3">
          {message.parts.map((part: any, index: number) => {
            switch (part.type) {
              case "text":
                // 检查文本中是否包含代码块
                const content = part.text || part.content || "";
                const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
                const parts = [];
                let lastIndex = 0;
                let match;

                while ((match = codeBlockRegex.exec(content)) !== null) {
                  // 添加代码块前的文本
                  if (match.index > lastIndex) {
                    const textContent = content
                      .slice(lastIndex, match.index)
                      .trim();
                    if (textContent) {
                      parts.push({
                        type: "text",
                        content: textContent,
                      });
                    }
                  }

                  // 添加代码块
                  parts.push({
                    type: "code",
                    language: match[1] || "text",
                    content: match[2].trim(),
                  });

                  lastIndex = match.index + match[0].length;
                }

                // 添加剩余文本
                if (lastIndex < content.length) {
                  const textContent = content.slice(lastIndex).trim();
                  if (textContent) {
                    parts.push({
                      type: "text",
                      content: textContent,
                    });
                  }
                }

                // 如果没有解析到任何内容但有文本，则作为纯文本处理
                if (parts.length === 0 && content) {
                  parts.push({
                    type: "text",
                    content: content.trim(),
                  });
                }

                return parts.map((textPart, textIndex) => {
                  if (textPart.type === "code") {
                    return (
                      <CodeBlock
                        key={`text-code-${index}-${textIndex}`}
                        className="not-prose"
                        code={textPart.content}
                        language={textPart.language || "text"}
                      >
                        <CodeBlockCopyButton />
                      </CodeBlock>
                    );
                  }
                  return (
                    <div
                      key={`text-content-${index}-${textIndex}`}
                      className="whitespace-pre-wrap leading-relaxed"
                    >
                      {textPart.content}
                    </div>
                  );
                });

              case "tool-call":
                return (
                  <div key={`tool-call-${index}`}>
                    <ChainOfThought>
                      <ChainOfThoughtStep>
                        <ChainOfThoughtHeader>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <Brain className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">
                                {part.toolName || "Tool Call"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Loader className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">
                                调用中...
                              </span>
                            </div>
                          </div>
                        </ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          {part.args && Object.keys(part.args).length > 0 && (
                            <div className="bg-muted p-2 rounded text-xs font-mono">
                              {JSON.stringify(part.args, null, 2)}
                            </div>
                          )}
                        </ChainOfThoughtContent>
                      </ChainOfThoughtStep>
                    </ChainOfThought>
                  </div>
                );

              case "tool-result":
                return (
                  <div key={`tool-result-${index}`}>
                    <ChainOfThought>
                      <ChainOfThoughtStep>
                        <ChainOfThoughtHeader>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <Brain className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">
                                Tool Result
                              </span>
                            </div>
                            <span className="text-xs text-green-600">
                              ✓ 完成
                            </span>
                          </div>
                        </ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-40">
                            {typeof part.result === "string"
                              ? part.result
                              : JSON.stringify(part.result, null, 2)}
                          </div>
                        </ChainOfThoughtContent>
                      </ChainOfThoughtStep>
                    </ChainOfThought>
                  </div>
                );

              default:
                return (
                  <div
                    key={`unknown-${index}`}
                    className="whitespace-pre-wrap leading-relaxed"
                  >
                    {part.text || part.content || ""}
                  </div>
                );
            }
          })}
        </div>
      );
    }

    // 兼容性处理：如果没有parts结构，回退到原有逻辑
    const content = message.content || "";
    if (!content) return null;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({
            type: "text",
            content: textContent,
          });
        }
      }

      parts.push({
        type: "code",
        language: match[1] || "text",
        content: match[2].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex).trim();
      if (textContent) {
        parts.push({
          type: "text",
          content: textContent,
        });
      }
    }

    if (parts.length === 0 && content) {
      parts.push({
        type: "text",
        content: content.trim(),
      });
    }

    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          if (part.type === "code") {
            return (
              <CodeBlock
                key={`code-${index}`}
                className="not-prose"
                code={part.content}
                language={part.language || "text"}
              >
                <CodeBlockCopyButton />
              </CodeBlock>
            );
          }
          return (
            <div
              key={`text-${index}`}
              className="whitespace-pre-wrap leading-relaxed"
            >
              {part.content}
            </div>
          );
        })}
      </div>
    );
  }, []);

  // 获取用户头像URL
  const getUserAvatar = useCallback(() => {
    return user?.user_metadata?.avatar_url || "/default-user-avatar.png";
  }, [user]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Conversation className="flex-1">
        <ConversationContent className="space-y-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={t("welcome.title", "开始您的AI对话")}
              description={
                mode === "simple"
                  ? t(
                      "welcome.simple",
                      "我是您的AI助手，有什么可以帮助您的吗？"
                    )
                  : t(
                      "welcome.advanced",
                      "我是您的高级AI助手，支持代码分析、文档生成、问题调试等功能。"
                    )
              }
              icon={<Bot className="h-12 w-12" />}
            >
              {showSuggestions && suggestions.length > 0 && (
                <div className="mt-6 w-full max-w-2xl">
                  <p className="text-sm text-muted-foreground mb-3">
                    试试这些建议：
                  </p>
                  <Suggestions>
                    {suggestions.map((suggestion, index) => (
                      <Suggestion
                        key={index}
                        suggestion={suggestion}
                        onClick={handleSuggestionClick}
                      >
                        {suggestion}
                      </Suggestion>
                    ))}
                  </Suggestions>
                </div>
              )}
            </ConversationEmptyState>
          ) : (
            messages
              .map((message, messageIndex) => {
                const isUser = message.role === "user";
                const messageContent = renderMessageContent(message);

                // 跳过空消息
                if (!messageContent) {
                  return null;
                }

                return (
                  <Message
                    key={message.id}
                    from={message.role}
                    className={cn(
                      "animate-in fade-in slide-in-from-bottom-2",
                      isUser ? "user-message" : "assistant-message"
                    )}
                  >
                    <MessageAvatar
                      src={isUser ? getUserAvatar() : "/ai-avatar.png"}
                      name={isUser ? "User" : "AI Assistant"}
                      className={cn(
                        "transition-all duration-200",
                        isUser ? "border-blue-200" : "border-green-200"
                      )}
                    />
                    <MessageContent variant="contained">
                      {messageContent}

                      {/* 流式加载指示器 - 仅对最后一条Assistant消息且正在流式传输时 */}
                      {!isUser &&
                        messageIndex === messages.length - 1 &&
                        status === "streaming" && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Loader className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground animate-pulse">
                              {t("thinking", "AI正在思考...")}
                            </span>
                          </div>
                        )}

                      {/* 消息元信息 */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {isUser
                              ? user?.email?.split("@")[0] || "You"
                              : "AI Assistant"}
                          </span>
                          {!isUser && mode === "advanced" && (
                            <>
                              <span>•</span>
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border-blue-200"
                              >
                                {t("gpt4", "GPT-4")}
                              </Badge>
                            </>
                          )}
                        </div>
                        <span className="text-xs opacity-60">
                          {new Date(
                            message.createdAt || Date.now()
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </MessageContent>
                  </Message>
                );
              })
              .filter(Boolean)
          )}

          {/* 独立的流式加载指示器 - 仅在提交状态且没有消息时显示 */}
          {status === "submitted" && messages.length === 0 && (
            <Message from="assistant">
              <MessageAvatar src="/ai-avatar.png" name="AI Assistant" />
              <MessageContent variant="contained">
                <div className="flex items-center space-x-3">
                  <Loader className="h-4 w-4 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {t("thinking", "AI正在思考...")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mode === "advanced"
                        ? t("advanced.processing", "正在处理您的复杂请求...")
                        : t("simple.processing", "请稍候...")}
                    </span>
                  </div>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* 改进的错误显示 */}
          {error && (
            <div className="mx-4">
              <Card className="border-destructive/50 bg-destructive/5 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-destructive text-sm font-bold">
                          !
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-destructive mb-1">
                        {t("error.title", "连接异常")}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {error.message ||
                          t("error.default", "AI服务暂时不可用，请稍后重试")}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearError()}
                          className="h-8 px-3 text-xs border-destructive/30 hover:bg-destructive/10"
                        >
                          <Sparkles className="h-3 w-3 mr-1.5" />
                          {t("error.retry", "重新发送")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {t("error.refresh", "刷新页面")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {/* 输入区域 - 改进版本，更好的可访问性和用户体验 */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PromptInput
          className="border-none"
          onSubmit={handlePromptSubmit}
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024} // 10MB
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.rb,.go,.rs,.php,.html,.css,.json,.xml,.yaml,.yml"
          multiple
          globalDrop={mode === "advanced"}
        >
          <PromptInputBody>
            {/* 附件预览区域 - 使用内置的 PromptInput 附件系统 */}
            <PromptInputAttachments>
              {(attachment) => (
                <PromptInputAttachment
                  data={attachment}
                  className="bg-background border border-border/50"
                />
              )}
            </PromptInputAttachments>

            {/* 输入区域 */}
            <div className="flex items-end space-x-3 p-4">
              <div className="flex-1 relative">
                <PromptInputTextarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder={
                    mode === "simple"
                      ? t("placeholder", "输入您的问题...")
                      : t("placeholderAdvanced", "详细描述您的需求...")
                  }
                  className={cn(
                    "min-h-[52px] max-h-[140px] resize-none transition-all duration-200",
                    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50",
                    "placeholder:text-muted-foreground/60"
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                {/* 发送按钮 */}
                <PromptInputSubmit
                  status={isLoading ? "streaming" : undefined}
                  className={cn(
                    "h-11 w-11 rounded-lg transition-all duration-200",
                    "bg-blue-500 hover:bg-blue-600 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:ring-2 focus:ring-blue-500/20",
                    "shadow-lg hover:shadow-xl"
                  )}
                  title={isLoading ? t("stop", "停止") : t("send", "发送")}
                />
              </div>
            </div>

            {/* 工具栏 */}
            <PromptInputToolbar className="px-4 pb-3">
              <PromptInputTools>
                <span className="text-xs text-muted-foreground/80">
                  {mode === "simple"
                    ? t("hints.simple", "按Enter发送，Shift+Enter换行")
                    : t("hints.advanced", "支持代码、文件等复杂输入")}
                </span>
                {/* 文件上传 - 仅高级模式 */}
                {mode === "advanced" && (
                  <PromptInputButton
                    onClick={() => {
                      // 文件上传将由 PromptInput 的内置功能处理
                      const fileInput = document.querySelector(
                        'input[type="file"]'
                      ) as HTMLInputElement;
                      fileInput?.click();
                    }}
                    className={cn(
                      "h-8 px-2 rounded border-dashed border-border/50",
                      "hover:border-blue-500/50 hover:bg-blue-50/50 transition-all duration-200"
                    )}
                    title="添加文件"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    <span className="text-xs">文件</span>
                  </PromptInputButton>
                )}
              </PromptInputTools>
              <div className="flex items-center space-x-3 text-xs text-muted-foreground/80">
                <span className="hidden sm:block">
                  {t("hints.shortcuts", "Enter发送 • Shift+Enter换行")}
                </span>
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-3 w-3" />
                  <span>{mode === "simple" ? "简单模式" : "高级模式"}</span>
                </span>
              </div>
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
