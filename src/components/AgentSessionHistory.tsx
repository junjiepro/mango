'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  Clock,
  Hash,
  Star,
  Archive,
  Trash2,
  Edit,
  Share2,
  Download,
  Calendar,
  Bot,
  User,
  Sparkles
} from 'lucide-react'
import {
  Message,
  Conversation,
  Actions,
  Action
} from '@/components/ai-elements'

/**
 * Agent 会话历史条目接口
 */
export interface AgentSession {
  id: string
  title: string
  description?: string
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  isStarred: boolean
  isArchived: boolean
  tags: string[]
  summary?: string
  model: string
  status: 'active' | 'completed' | 'archived'
  participants: {
    user: {
      name: string
      avatar?: string
    }
    agent: {
      name: string
      model: string
    }
  }
  lastMessages: {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }[]
  metadata: {
    totalTokens?: number
    duration?: number
    topics?: string[]
  }
}

/**
 * 搜索和筛选状态接口
 */
interface SearchFilters {
  query: string
  status: 'all' | 'active' | 'completed' | 'archived'
  model: 'all' | string
  timeRange: 'all' | 'today' | 'week' | 'month' | 'year'
  starred: boolean | null
  sortBy: 'lastMessage' | 'created' | 'messageCount' | 'title'
  sortOrder: 'asc' | 'desc'
}

/**
 * Agent 会话历史组件属性接口
 */
export interface AgentSessionHistoryProps {
  sessions?: AgentSession[]
  loading?: boolean
  onSessionClick?: (sessionId: string) => void
  onSessionDelete?: (sessionId: string) => void
  onSessionArchive?: (sessionId: string) => void
  onSessionStar?: (sessionId: string) => void
  onSessionShare?: (sessionId: string) => void
  onSessionExport?: (sessionId: string) => void
  className?: string
}

/**
 * Agent 会话历史组件
 */
export const AgentSessionHistory: React.FC<AgentSessionHistoryProps> = ({
  sessions = [],
  loading = false,
  onSessionClick,
  onSessionDelete,
  onSessionArchive,
  onSessionStar,
  onSessionShare,
  onSessionExport,
  className = ''
}) => {
  const router = useRouter()

  // 状态管理
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    status: 'all',
    model: 'all',
    timeRange: 'all',
    starred: null,
    sortBy: 'lastMessage',
    sortOrder: 'desc'
  })

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // 模拟会话数据（在实际应用中应该从 props 或 API 获取）
  const mockSessions: AgentSession[] = useMemo(() => [
    {
      id: '1',
      title: '优化 React 组件性能',
      description: '讨论如何提升 React 应用的渲染性能',
      messageCount: 24,
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isStarred: true,
      isArchived: false,
      tags: ['React', '性能优化', '前端'],
      summary: '探讨了 React.memo、useMemo 和 useCallback 的使用场景，以及虚拟化长列表的最佳实践。',
      model: 'GPT-4',
      status: 'completed',
      participants: {
        user: { name: '用户' },
        agent: { name: 'Mango AI', model: 'GPT-4' }
      },
      lastMessages: [
        {
          role: 'assistant',
          content: '总结一下，React 性能优化的关键是避免不必要的重渲染。使用 React.memo 包装组件，用 useMemo 缓存计算结果，用 useCallback 缓存函数引用。对于大列表，推荐使用 react-window 或 react-virtualized。',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          role: 'user',
          content: '非常感谢！这些建议很实用。',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 5 * 60 * 1000)
        }
      ],
      metadata: {
        totalTokens: 3240,
        duration: 45,
        topics: ['React', '性能', 'hooks', '优化']
      }
    },
    {
      id: '2',
      title: '设计数据库架构',
      description: '为电商系统设计合适的数据库结构',
      messageCount: 18,
      lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isStarred: false,
      isArchived: false,
      tags: ['数据库', '架构设计', '电商'],
      summary: '讨论了用户、商品、订单、支付等核心实体的表结构设计，以及索引优化策略。',
      model: 'GPT-4',
      status: 'completed',
      participants: {
        user: { name: '用户' },
        agent: { name: 'Mango AI', model: 'GPT-4' }
      },
      lastMessages: [
        {
          role: 'assistant',
          content: '建议的数据库架构包含了用户表、商品表、订单表、订单项表、支付记录表等核心表。记住要合理设置外键约束和索引来保证数据一致性和查询性能。',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
        }
      ],
      metadata: {
        totalTokens: 2850,
        duration: 35,
        topics: ['MySQL', '设计模式', '索引', '电商']
      }
    },
    {
      id: '3',
      title: 'API 文档生成工具选择',
      description: '比较不同的 API 文档生成工具',
      messageCount: 12,
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isStarred: true,
      isArchived: false,
      tags: ['API', '文档', '工具'],
      summary: '比较了 Swagger、Postman、Insomnia 等工具的优缺点，推荐了最适合的解决方案。',
      model: 'Claude 3',
      status: 'archived',
      participants: {
        user: { name: '用户' },
        agent: { name: 'Mango AI', model: 'Claude 3' }
      },
      lastMessages: [
        {
          role: 'assistant',
          content: '总的来说，如果你需要交互式文档和测试功能，推荐 Swagger/OpenAPI。如果更注重文档的美观和易读性，可以考虑 GitBook 或 Notion。',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      ],
      metadata: {
        totalTokens: 1680,
        duration: 20,
        topics: ['Swagger', 'OpenAPI', '文档工具']
      }
    },
    {
      id: '4',
      title: 'TypeScript 类型系统深入',
      description: '学习 TypeScript 高级类型特性',
      messageCount: 30,
      lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isStarred: false,
      isArchived: false,
      tags: ['TypeScript', '类型系统', '编程'],
      summary: '深入学习了 TypeScript 的泛型、条件类型、映射类型等高级特性。',
      model: 'GPT-4',
      status: 'active',
      participants: {
        user: { name: '用户' },
        agent: { name: 'Mango AI', model: 'GPT-4' }
      },
      lastMessages: [
        {
          role: 'user',
          content: '能否继续讲解一下模板字面量类型的应用？',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ],
      metadata: {
        totalTokens: 4200,
        duration: 75,
        topics: ['TypeScript', '泛型', '类型推导', '工具类型']
      }
    }
  ], [])

  // 使用模拟数据或传入的数据
  const allSessions = sessions.length > 0 ? sessions : mockSessions

  // 筛选和搜索逻辑
  const filteredSessions = useMemo(() => {
    return allSessions.filter(session => {
      // 文本搜索
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase()
        const matchTitle = session.title.toLowerCase().includes(query)
        const matchDescription = session.description?.toLowerCase().includes(query)
        const matchTags = session.tags.some(tag => tag.toLowerCase().includes(query))
        const matchSummary = session.summary?.toLowerCase().includes(query)

        if (!matchTitle && !matchDescription && !matchTags && !matchSummary) {
          return false
        }
      }

      // 状态筛选
      if (searchFilters.status !== 'all' && session.status !== searchFilters.status) {
        return false
      }

      // 模型筛选
      if (searchFilters.model !== 'all' && session.model !== searchFilters.model) {
        return false
      }

      // 收藏筛选
      if (searchFilters.starred !== null && session.isStarred !== searchFilters.starred) {
        return false
      }

      // 时间范围筛选
      if (searchFilters.timeRange !== 'all') {
        const now = new Date()
        const sessionDate = new Date(session.lastMessageAt)

        switch (searchFilters.timeRange) {
          case 'today':
            if (sessionDate.toDateString() !== now.toDateString()) return false
            break
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            if (sessionDate < weekAgo) return false
            break
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            if (sessionDate < monthAgo) return false
            break
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            if (sessionDate < yearAgo) return false
            break
        }
      }

      return true
    }).sort((a, b) => {
      let comparison = 0

      switch (searchFilters.sortBy) {
        case 'lastMessage':
          comparison = a.lastMessageAt.getTime() - b.lastMessageAt.getTime()
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'messageCount':
          comparison = a.messageCount - b.messageCount
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = a.lastMessageAt.getTime() - b.lastMessageAt.getTime()
      }

      return searchFilters.sortOrder === 'desc' ? -comparison : comparison
    })
  }, [allSessions, searchFilters])

  // 格式化时间
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }, [])

  // 获取状态颜色
  const getStatusColor = useCallback((status: AgentSession['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }, [])

  // 获取状态文本
  const getStatusText = useCallback((status: AgentSession['status']) => {
    switch (status) {
      case 'active':
        return '进行中'
      case 'completed':
        return '已完成'
      case 'archived':
        return '已归档'
      default:
        return '未知'
    }
  }, [])

  // 会话操作处理
  const handleSessionAction = useCallback((action: string, sessionId: string) => {
    switch (action) {
      case 'view':
        onSessionClick?.(sessionId)
        break
      case 'star':
        onSessionStar?.(sessionId)
        break
      case 'archive':
        onSessionArchive?.(sessionId)
        break
      case 'share':
        onSessionShare?.(sessionId)
        break
      case 'export':
        onSessionExport?.(sessionId)
        break
      case 'delete':
        setShowDeleteDialog(sessionId)
        break
    }
  }, [onSessionClick, onSessionStar, onSessionArchive, onSessionShare, onSessionExport])

  // 批量操作处理
  const handleBatchAction = useCallback((action: string) => {
    console.log(`Batch ${action} for sessions:`, Array.from(selectedSessions))
    // 这里应该调用相应的批量操作 API
    setSelectedSessions(new Set())
  }, [selectedSessions])

  // 确认删除
  const handleDeleteConfirm = useCallback(() => {
    if (showDeleteDialog) {
      onSessionDelete?.(showDeleteDialog)
      setShowDeleteDialog(null)
    }
  }, [showDeleteDialog, onSessionDelete])

  // 渲染会话卡片
  const renderSessionCard = useCallback((session: AgentSession) => {
    const isSelected = selectedSessions.has(session.id)

    return (
      <Card
        key={session.id}
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => handleSessionAction('view', session.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="text-lg truncate">{session.title}</CardTitle>
                {session.isStarred && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
              </div>
              {session.description && (
                <CardDescription className="text-sm line-clamp-2">
                  {session.description}
                </CardDescription>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Badge className={`text-xs ${getStatusColor(session.status)}`}>
                {getStatusText(session.status)}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionAction('star', session.id)
                    }}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {session.isStarred ? '取消收藏' : '收藏'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionAction('share', session.id)
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    分享
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionAction('export', session.id)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    导出
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionAction('archive', session.id)
                    }}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {session.isArchived ? '取消归档' : '归档'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionAction('delete', session.id)
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* 会话统计信息 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{session.messageCount} 条消息</span>
              </div>
              <div className="flex items-center space-x-1">
                <Bot className="h-4 w-4" />
                <span>{session.model}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(session.lastMessageAt)}</span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {session.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{session.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 会话摘要 */}
          {session.summary && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {session.summary}
            </div>
          )}

          {/* 最后的消息预览 */}
          {session.lastMessages.length > 0 && (
            <div className="border-l-2 border-primary/20 pl-3 space-y-2">
              {session.lastMessages.slice(0, 2).map((message, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }, [selectedSessions, handleSessionAction, getStatusColor, getStatusText, formatRelativeTime])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载会话历史...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 搜索和筛选栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>会话历史</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                共 {filteredSessions.length} 个会话
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索输入框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索会话标题、描述、标签或内容..."
              value={searchFilters.query}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={searchFilters.status}
              onValueChange={(value) => setSearchFilters(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={searchFilters.model}
              onValueChange={(value) => setSearchFilters(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有模型</SelectItem>
                <SelectItem value="GPT-4">GPT-4</SelectItem>
                <SelectItem value="GPT-3.5 Turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="Claude 3">Claude 3</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={searchFilters.timeRange}
              onValueChange={(value) => setSearchFilters(prev => ({ ...prev, timeRange: value as any }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="year">今年</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={searchFilters.sortBy}
              onValueChange={(value) => setSearchFilters(prev => ({ ...prev, sortBy: value as any }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastMessage">最后消息</SelectItem>
                <SelectItem value="created">创建时间</SelectItem>
                <SelectItem value="messageCount">消息数量</SelectItem>
                <SelectItem value="title">标题</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={searchFilters.starred ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchFilters(prev => ({
                ...prev,
                starred: prev.starred ? null : true
              }))}
              className="flex items-center space-x-1"
            >
              <Star className="h-4 w-4" />
              <span>收藏</span>
            </Button>
          </div>

          {/* 批量操作 */}
          {selectedSessions.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">
                已选择 {selectedSessions.size} 个会话
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction('archive')}
                >
                  批量归档
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction('export')}
                >
                  批量导出
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBatchAction('delete')}
                >
                  批量删除
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 会话列表 */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">暂无会话记录</p>
            <p className="text-muted-foreground mb-4">
              {searchFilters.query || searchFilters.status !== 'all' || searchFilters.model !== 'all'
                ? '没有找到匹配的会话记录'
                : '开始与 AI 对话来创建您的第一个会话'
              }
            </p>
            <Button
              onClick={() => router.push('/chat')}
              className="flex items-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>开始新对话</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map(renderSessionCard)}
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该会话及其所有消息记录。删除后无法恢复，确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AgentSessionHistory