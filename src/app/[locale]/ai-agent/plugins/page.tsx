import { Suspense } from 'react'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/supabase/auth-helpers'
import { AgentLayout } from '@/components/ai-agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Puzzle,
  Server,
  Plus,
  Settings,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreVertical,
  Eye,
  Edit,
  Power,
  Zap
} from 'lucide-react'

interface PluginManagementPageProps {
  params: { locale: string }
  searchParams: {
    tab?: string
    filter?: string
  }
}

export async function generateMetadata({ params }: PluginManagementPageProps): Promise<Metadata> {
  return {
    title: 'Plugin Management - AI Agent - Mango',
    description: 'Manage MCP plugins and server connections for your AI Agent',
    keywords: ['Plugin', 'MCP', 'Management', 'Configuration', 'Tools'],
  }
}

// Mock data - in real implementation, this would come from API
const mockMCPServers = [
  {
    id: 'server-1',
    name: 'GitHub MCP Server',
    type: 'github',
    status: 'connected' as const,
    url: 'http://localhost:3001',
    capabilities: ['repository', 'issues', 'pull_requests'],
    toolCount: 12,
    lastActivity: '2024-03-15T10:30:00Z',
    errorCount: 0
  },
  {
    id: 'server-2',
    name: 'Database MCP Server',
    type: 'database',
    status: 'error' as const,
    url: 'http://localhost:3002',
    capabilities: ['query', 'schema'],
    toolCount: 8,
    lastActivity: '2024-03-15T09:15:00Z',
    errorCount: 3
  }
]

const mockPlugins = [
  {
    id: 'plugin-1',
    name: 'Code Analyzer',
    version: '1.2.0',
    type: 'mcp' as const,
    status: 'active' as const,
    description: 'Advanced code analysis and suggestions',
    author: 'Mango Team',
    capabilities: ['code_analysis', 'suggestions', 'refactoring'],
    enabled: true,
    lastActivity: '2024-03-15T11:00:00Z',
    errorCount: 0
  },
  {
    id: 'plugin-2',
    name: 'File Manager',
    version: '2.1.0',
    type: 'native' as const,
    status: 'loading' as const,
    description: 'File system operations and management',
    author: 'Community',
    capabilities: ['file_operations', 'directory_management'],
    enabled: true,
    lastActivity: '2024-03-15T10:45:00Z',
    errorCount: 1
  }
]

function ServerCard({ server }: { server: typeof mockMCPServers[0] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'disconnected': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'disconnected': return <Circle className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              {server.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-sm ${getStatusColor(server.status)}`}>
                {getStatusIcon(server.status)}
                {server.status}
              </span>
              <Badge variant="outline">{server.type}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                配置
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                重启
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">URL:</span>
            <span className="font-mono text-xs">{server.url}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">工具数量:</span>
            <span>{server.toolCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">错误计数:</span>
            <span className={server.errorCount > 0 ? 'text-red-600' : 'text-green-600'}>
              {server.errorCount}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">功能:</p>
          <div className="flex flex-wrap gap-1">
            {server.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {capability}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Activity className="h-4 w-4 mr-2" />
            监控
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            工具
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PluginCard({ plugin }: { plugin: typeof mockPlugins[0] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'loading': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'disabled': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'loading': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'disabled': return <Circle className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              {plugin.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-sm ${getStatusColor(plugin.status)}`}>
                {getStatusIcon(plugin.status)}
                {plugin.status}
              </span>
              <Badge variant="outline">{plugin.type}</Badge>
              <Badge variant="secondary">v{plugin.version}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={plugin.enabled} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑配置
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新加载
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Power className="h-4 w-4 mr-2" />
                  {plugin.enabled ? '禁用' : '启用'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  卸载
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{plugin.description}</p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">作者:</span>
            <span>{plugin.author}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">错误计数:</span>
            <span className={plugin.errorCount > 0 ? 'text-red-600' : 'text-green-600'}>
              {plugin.errorCount}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">功能:</p>
          <div className="flex flex-wrap gap-1">
            {plugin.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {capability}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SystemOverview() {
  const totalServers = mockMCPServers.length
  const connectedServers = mockMCPServers.filter(s => s.status === 'connected').length
  const totalPlugins = mockPlugins.length
  const activePlugins = mockPlugins.filter(p => p.status === 'active').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            MCP服务器
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{connectedServers}/{totalServers}</div>
          <p className="text-xs text-muted-foreground">连接状态</p>
          <Progress value={(connectedServers / totalServers) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            插件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePlugins}/{totalPlugins}</div>
          <p className="text-xs text-muted-foreground">激活状态</p>
          <Progress value={(activePlugins / totalPlugins) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            可用工具
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {mockMCPServers.reduce((sum, server) => sum + server.toolCount, 0)}
          </div>
          <p className="text-xs text-muted-foreground">总工具数</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">健康</div>
          <p className="text-xs text-muted-foreground">整体状态</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PluginManagementPage({ params, searchParams }: PluginManagementPageProps) {
  // Validate authentication
  const { user } = await requireAuth()

  // Validate locale
  if (!['zh', 'en'].includes(params.locale)) {
    notFound()
  }

  const activeTab = searchParams.tab || 'overview'

  return (
    <AgentLayout defaultMode="advanced" className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">插件管理</h1>
            <p className="text-muted-foreground mt-1">
              管理MCP服务器连接和插件配置
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导入配置
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加插件
            </Button>
          </div>
        </div>

        {/* Warning for advanced users */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            这是高级用户界面。修改插件配置可能会影响AI Agent的功能。请谨慎操作。
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs value={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              概览
            </TabsTrigger>
            <TabsTrigger value="servers" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              MCP服务器
            </TabsTrigger>
            <TabsTrigger value="plugins" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              插件
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              应用商店
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <SystemOverview />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>最近活动</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm">GitHub MCP Server连接成功</p>
                        <p className="text-xs text-muted-foreground">2分钟前</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm">Database MCP Server连接失败</p>
                        <p className="text-xs text-muted-foreground">5分钟前</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>推荐操作</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      检查服务器配置
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      更新所有插件
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      备份配置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input placeholder="搜索服务器..." className="w-64" />
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加服务器
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockMCPServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          </TabsContent>

          {/* Plugins Tab */}
          <TabsContent value="plugins" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input placeholder="搜索插件..." className="w-64" />
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                安装插件
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockPlugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>插件市场</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">插件市场即将推出</p>
                  <p className="text-muted-foreground mb-4">
                    发现和安装社区贡献的MCP插件和工具
                  </p>
                  <Button variant="outline">
                    了解更多
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AgentLayout>
  )
}