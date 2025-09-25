/**
 * AI Agent 对话接口组件 - 优化版本
 * 集成 AI Elements 提供更好的对话体验，支持流式响应和多模态内容
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
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
import type { MultimodalContent, UserMode } from "@/types/ai-agent";

/**
 * 扩展的消息接口
 */
interface EnhancedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  multimodal?: MultimodalContent[];
  timestamp: string;
  isStreaming?: boolean;
  toolCalls?: any[];
  error?: string;
  thinking?: string[];
  codeBlocks?: { language: string; code: string; title?: string }[];
}

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
 * AI Agent 对话接口组件 - 优化版本
 */
export default function ConversationInterface({
  mode,
  sessionId,
  onSessionChange,
  className,
}: ConversationInterfaceProps) {
  const { user } = useAuth();
  const t = useTranslations("aiAgent.conversation");

  // 聊天状态 - 尝试使用完整的 useChat API
  const chatResult = useChat({
    api: "/api/ai-agent",
    initialMessages: [],
    body: {
      mode,
      sessionId,
      userId: user?.id,
    },
    onFinish: (message) => {
      console.log("Message finished:", message);
      // 可以在这里处理会话ID更新
      if (chatResult.data?.sessionId && onSessionChange) {
        onSessionChange(chatResult.data.sessionId);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // 解构结果，如果不存在则使用默认值
  const { messages, error, reload, stop, data } = chatResult;

  // 检查是否存在 input 和 handleSubmit，如果不存在则使用本地状态
  const input = (chatResult as any).input;
  const handleSubmit = (chatResult as any).handleSubmit;
  const handleInputChange = (chatResult as any).handleInputChange;
  const isLoading = (chatResult as any).isLoading;

  // 本地状态作为后备
  const [localInput, setLocalInput] = useState("");
  const [localIsLoading, setLocalIsLoading] = useState(false);

  // 组件状态
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // 建议列表
  const suggestions = getModeSuggestions(mode, t);

  // 输入处理 - 使用 useChat 提供的或本地状态
  const actualInput = input !== undefined ? input : localInput;
  const actualIsLoading = isLoading !== undefined ? isLoading : localIsLoading;
  const actualHandleInputChange =
    handleInputChange ||
    useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalInput(e.target.value);
    }, []);

  // 处理建议点击
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (input !== undefined) {
        // 如果 useChat 提供了 input，我们需要通过其他方式设置
        // 这可能需要调用 handleInputChange
        if (handleInputChange) {
          handleInputChange({ target: { value: suggestion } } as any);
        }
      } else {
        setLocalInput(suggestion);
      }
      setShowSuggestions(false);
    },
    [input, handleInputChange]
  );

  // 处理消息提交
  // 处理 PromptInput 提交
  const handlePromptSubmit = useCallback(
    (message: { text?: string; files?: any[] }, event: React.FormEvent) => {
      event.preventDefault();
      if (
        !message.text?.trim() &&
        (!message.files || message.files.length === 0)
      )
        return;
      if (actualIsLoading) return;

      setShowSuggestions(false);

      // 处理附件
      if (message.files && message.files.length > 0) {
        setAttachments(message.files);
      }

      // 如果 useChat 提供了 handleSubmit，使用它
      if (handleSubmit) {
        // 创建模拟的事件对象给 useChat 的 handleSubmit
        const syntheticEvent = {
          ...event,
          currentTarget: {
            ...event.currentTarget,
            message: { value: message.text || "" },
          },
        };
        handleSubmit(syntheticEvent as any);
      } else {
        // 否则使用手动实现的提交逻辑
        // TODO: 实现手动提交逻辑
        console.log("Manual submit:", message.text);
      }

      // 清理输入和附件状态
      if (input !== undefined) {
        // 如果使用 useChat 的 input，可能需要特殊处理来清空
      } else {
        setLocalInput("");
      }
      setTimeout(() => setAttachments([]), 100);
    },
    [actualIsLoading, handleSubmit, input]
  );

  const handleMessageSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!actualInput.trim() && attachments.length === 0) return;
      if (actualIsLoading) return;

      setShowSuggestions(false);

      if (handleSubmit) {
        handleSubmit(e);
      }
      setAttachments([]);
    },
    [actualInput, attachments, actualIsLoading, handleSubmit]
  );

  // 处理文件附件
  const handleFileSelect = useCallback((files: File[]) => {
    setAttachments((prev) => [...prev, ...files]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 渲染消息内容 - 改进版本，支持更好的流式响应和工具调用
  const renderMessageContent = useCallback(
    (message: any) => {
      const content = message.content || "";

      // 处理空内容或仅有工具调用的情况
      if (!content && !message.toolInvocations?.length) {
        return null;
      }

      // 改进的代码块检测，支持更多语言
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(content)) !== null) {
        // 添加代码块前的文本
        if (match.index > lastIndex) {
          const textContent = content.slice(lastIndex, match.index).trim();
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

      return (
        <div className="space-y-3">
          {/* 渲染文本和代码块 */}
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

          {/* 工具调用显示 - 改进版本，支持更多状态 */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="mt-4">
              <ChainOfThought>
                {message.toolInvocations.map((tool: any, index: number) => (
                  <ChainOfThoughtStep key={`tool-${index}`}>
                    <ChainOfThoughtHeader>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            {tool.toolName || "Unknown Tool"}
                          </span>
                        </div>
                        {tool.state && (
                          <div className="flex items-center space-x-1">
                            {tool.state === "call" && (
                              <>
                                <Loader className="h-3 w-3" />
                                <span className="text-xs text-muted-foreground">
                                  调用中...
                                </span>
                              </>
                            )}
                            {tool.state === "result" && (
                              <span className="text-xs text-green-600">
                                ✓ 完成
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </ChainOfThoughtHeader>
                    <ChainOfThoughtContent>
                      {/* 工具参数显示 */}
                      {tool.args && Object.keys(tool.args).length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs text-muted-foreground mb-1">
                            参数:
                          </div>
                          <div className="bg-muted p-2 rounded text-xs font-mono">
                            {JSON.stringify(tool.args, null, 2)}
                          </div>
                        </div>
                      )}

                      {/* 工具结果显示 */}
                      {tool.result && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            结果:
                          </div>
                          <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-40">
                            {typeof tool.result === "string"
                              ? tool.result
                              : JSON.stringify(tool.result, null, 2)}
                          </div>
                        </div>
                      )}
                    </ChainOfThoughtContent>
                  </ChainOfThoughtStep>
                ))}
              </ChainOfThought>
            </div>
          )}
        </div>
      );
    },
    [t]
  );

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

                // 跳过空消息（除了有工具调用的情况）
                if (!messageContent && !message.toolInvocations?.length) {
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

                      {/* 流式加载指示器 - 仅对最后一条Assistant消息 */}
                      {!isUser &&
                        messageIndex === messages.length - 1 &&
                        isLoading &&
                        !message.content && (
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

          {/* 独立的流式加载指示器 - 仅在没有消息内容时显示 */}
          {isLoading &&
            !messages.some((m) => m.role === "assistant" && !m.content) && (
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
                          onClick={reload}
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
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                  placeholder={
                    mode === "simple"
                      ? t("placeholder")
                      : t("placeholderAdvanced")
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
                  title={isLoading ? t("stop") : t("send")}
                />
              </div>
            </div>

            {/* 工具栏 */}
            <PromptInputToolbar className="px-4 pb-3">
              <PromptInputTools>
                <span className="text-xs text-muted-foreground/80">
                  {mode === "simple" ? t("hints.simple") : t("hints.advanced")}
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
                <span className="hidden sm:block">{t("hints.shortcuts")}</span>
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
