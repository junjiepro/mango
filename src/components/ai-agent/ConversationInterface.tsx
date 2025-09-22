/**
 * AI Agent 对话接口组件
 * 使用 Vercel AI Elements 实现对话功能，支持多模态内容
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MultimodalContent, UserMode } from '@/types/ai-agent'

// Icons
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const AttachIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
)

const LoadingIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

const BotIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

/**
 * 消息角色类型
 */
type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 扩展的消息接口
 */
interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  multimodal?: MultimodalContent[]
  timestamp: string
  isStreaming?: boolean
  toolCalls?: any[]
  error?: string
}

/**
 * 对话接口属性
 */
interface ConversationInterfaceProps {
  mode: UserMode
  sessionId?: string
  onSessionChange?: (sessionId: string) => void
  className?: string
}

/**
 * AI Agent 对话接口组件
 */
export default function ConversationInterface({
  mode,
  sessionId,
  onSessionChange,
  className
}: ConversationInterfaceProps) {
  const { user } = useAuth()
  const t = useTranslations('aiAgent.conversation')

  // 聊天状态
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop
  } = useChat({
    api: '/api/ai-agent',
    initialMessages: [],
    onFinish: (message) => {
      console.log('Message finished:', message)
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

  // 组件状态
  const [multimodalFiles, setMultimodalFiles] = useState<File[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 检查是否需要显示"滚动到底部"按钮
  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollToBottom(!isNearBottom && messages.length > 0)
  }, [messages.length])

  // 自动滚动到底部（新消息时）
  useEffect(() => {
    if (messages.length > 0 && !showScrollToBottom) {
      scrollToBottom()
    }
  }, [messages.length, showScrollToBottom, scrollToBottom])

  // 监听滚动位置
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollPosition)
    return () => container.removeEventListener('scroll', checkScrollPosition)
  }, [checkScrollPosition])

  // 处理文件上传
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setMultimodalFiles(prev => [...prev, ...files])
  }, [])

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setMultimodalFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 处理消息提交
  const handleMessageSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() && multimodalFiles.length === 0) return
    if (isLoading) return

    // TODO: 处理多模态内容
    if (multimodalFiles.length > 0) {
      console.log('Multimodal files to process:', multimodalFiles)
      // 这里需要处理文件上传和转换为 MultimodalContent
    }

    handleSubmit(e)
    setMultimodalFiles([])

    // 重置文本区域高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, multimodalFiles, isLoading, handleSubmit])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleMessageSubmit(e as any)
    }
  }, [handleMessageSubmit, isComposing])

  // 自动调整文本区域高度
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e)

    // 自动调整高度
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [handleInputChange])

  // 格式化时间戳
  const formatTimestamp = useCallback((timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  // 获取消息发送者信息
  const getMessageSender = useCallback((role: MessageRole) => {
    switch (role) {
      case 'user':
        return {
          name: user?.email?.split('@')[0] || t('you'),
          icon: UserIcon,
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600'
        }
      case 'assistant':
        return {
          name: t('assistant'),
          icon: BotIcon,
          bgColor: 'bg-indigo-500',
          textColor: 'text-indigo-600'
        }
      default:
        return {
          name: t('system'),
          icon: BotIcon,
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-600'
        }
    }
  }, [user, t])

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={checkScrollPosition}
      >
        {messages.length === 0 ? (
          // 欢迎界面
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <BotIcon />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('welcome.title')}
            </h3>
            <p className="text-gray-500 max-w-md">
              {mode === 'simple' ? t('welcome.simple') : t('welcome.advanced')}
            </p>
            {mode === 'advanced' && (
              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-md">
                <Card className="p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm font-medium">{t('suggestions.analyzeCode')}</p>
                </Card>
                <Card className="p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm font-medium">{t('suggestions.debugIssue')}</p>
                </Card>
                <Card className="p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm font-medium">{t('suggestions.explainConcept')}</p>
                </Card>
                <Card className="p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm font-medium">{t('suggestions.generateCode')}</p>
                </Card>
              </div>
            )}
          </div>
        ) : (
          // 消息列表
          messages.map((message) => {
            const sender = getMessageSender(message.role as MessageRole)
            const SenderIcon = sender.icon
            const isUser = message.role === 'user'

            return (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", sender.bgColor)}>
                    <SenderIcon />
                  </div>
                )}

                <div className={cn("max-w-3xl", isUser ? "order-first" : "")}>
                  <div className={cn(
                    "rounded-lg px-4 py-2",
                    isUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  )}>
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* 工具调用显示 */}
                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.toolInvocations.map((tool: any, index: number) => (
                          <div key={index} className="bg-black/10 rounded p-2 text-xs">
                            <div className="flex items-center space-x-2">
                              <LoadingIcon />
                              <span>{t('toolExecution', { tool: tool.toolName })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "flex items-center space-x-2 mt-1 text-xs text-gray-500",
                    isUser ? "justify-end" : "justify-start"
                  )}>
                    <span className={sender.textColor}>{sender.name}</span>
                    <span>•</span>
                    <span>{formatTimestamp(new Date())}</span>
                    {message.role === 'assistant' && mode === 'advanced' && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">
                          {t('gpt4')}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", sender.bgColor)}>
                    <SenderIcon />
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white">
              <BotIcon />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <LoadingIcon />
                <span className="text-gray-600">{t('thinking')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 text-red-500">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">{t('error.title')}</p>
                <p className="text-red-600 text-sm mt-1">{error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reload()}
                  className="mt-2"
                >
                  {t('error.retry')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollToBottom && (
        <div className="absolute bottom-32 right-8">
          <Button
            variant="secondary"
            size="icon"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </Button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4">
        {/* 多模态文件预览 */}
        {multimodalFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {multimodalFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-4 w-4 p-0"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 输入表单 */}
        <form onSubmit={handleMessageSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={t('placeholder')}
              disabled={isLoading}
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />

            {/* 附件按钮 */}
            {mode === 'advanced' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute right-2 bottom-2 h-8 w-8"
              >
                <AttachIcon />
              </Button>
            )}
          </div>

          {/* 发送按钮 */}
          <Button
            type="submit"
            disabled={(!input.trim() && multimodalFiles.length === 0) || isLoading}
            className="h-12 px-4"
          >
            {isLoading ? (
              <LoadingIcon />
            ) : (
              <>
                <SendIcon />
                <span className="sr-only">{t('send')}</span>
              </>
            )}
          </Button>

          {/* 停止生成按钮 */}
          {isLoading && (
            <Button
              type="button"
              variant="outline"
              onClick={stop}
              className="h-12 px-4"
            >
              {t('stop')}
            </Button>
          )}
        </form>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 输入提示 */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {mode === 'simple'
              ? t('hints.simple')
              : t('hints.advanced')
            }
          </span>
          <span>{t('hints.enter')}</span>
        </div>
      </div>
    </div>
  )
}