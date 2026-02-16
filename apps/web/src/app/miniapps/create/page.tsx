/**
 * MiniApp Create/Edit Page
 * 创建和编辑MiniApp，支持HTML和代码编辑
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layouts/AppHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Eye, Code, FileCode } from 'lucide-react'

export default function CreateMiniAppPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    code: '',
    html: '',
    icon_url: '',
    tags: '',
    is_public: false,
    is_shareable: true,
  })

  // 更新表单字段
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 保存MiniApp
  const handleSave = async () => {
    // 验证必填字段
    if (!formData.name || !formData.display_name || !formData.description) {
      toast.error('请填写必填字段', {
        description: '名称、显示名称和描述为必填项',
      })
      return
    }

    // 验证至少有code或html
    if (!formData.code && !formData.html) {
      toast.error('请提供代码或HTML', {
        description: '至少需要提供JavaScript代码或HTML内容',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/miniapps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('创建成功', {
          description: `${formData.display_name} 已创建并自动安装`,
        })
        router.push(`/miniapps/${result.data.id}`)
      } else {
        toast.error('创建失败', {
          description: result.error || '创建MiniApp时出现错误',
        })
      }
    } catch (error) {
      console.error('Failed to create mini app:', error)
      toast.error('创建失败', {
        description: '无法创建MiniApp，请稍后重试',
      })
    } finally {
      setLoading(false)
    }
  }

  // 预览HTML
  const previewHtml = () => {
    if (!formData.html) {
      toast.error('没有HTML内容', {
        description: '请先编写HTML内容',
      })
      return
    }

    const blob = new Blob([formData.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <AppHeader />
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">创建 MiniApp</h1>
          <p className="text-muted-foreground mt-2">
            创建一个新的小应用，可以使用HTML或JavaScript代码
          </p>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>设置MiniApp的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名称 *</Label>
                  <Input
                    id="name"
                    placeholder="my-miniapp"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    只能包含字母、数字、下划线和连字符
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">显示名称 *</Label>
                  <Input
                    id="display_name"
                    placeholder="我的小应用"
                    value={formData.display_name}
                    onChange={(e) => updateField('display_name', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述 *</Label>
                <Textarea
                  id="description"
                  placeholder="描述你的小应用功能..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon_url">图标URL</Label>
                  <Input
                    id="icon_url"
                    placeholder="https://example.com/icon.png"
                    value={formData.icon_url}
                    onChange={(e) => updateField('icon_url', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">标签</Label>
                  <Input
                    id="tags"
                    placeholder="工具, 效率, 娱乐"
                    value={formData.tags}
                    onChange={(e) => updateField('tags', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    用逗号分隔多个标签
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_public">公开</Label>
                  <p className="text-xs text-muted-foreground">
                    允许其他用户发现和安装
                  </p>
                </div>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => updateField('is_public', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_shareable">可分享</Label>
                  <p className="text-xs text-muted-foreground">
                    允许通过链接分享
                  </p>
                </div>
                <Switch
                  id="is_shareable"
                  checked={formData.is_shareable}
                  onCheckedChange={(checked) => updateField('is_shareable', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 代码编辑 */}
          <Card>
            <CardHeader>
              <CardTitle>代码</CardTitle>
              <CardDescription>
                编写MiniApp的HTML或JavaScript代码
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="html">
                    <FileCode className="h-4 w-4 mr-2" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code className="h-4 w-4 mr-2" />
                    JavaScript
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="html">HTML 内容</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={previewHtml}
                        disabled={!formData.html}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        预览
                      </Button>
                    </div>
                    <Textarea
                      id="html"
                      placeholder={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My MiniApp</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
  </style>
</head>
<body>
  <h1>Hello MiniApp!</h1>
  <button onclick="handleClick()">点击我</button>

  <script>
    function handleClick() {
      // 使用 MiniApp API
      window.MiniAppAPI.notification.send('通知', '按钮被点击了！');
    }
  </script>
</body>
</html>`}
                      value={formData.html}
                      onChange={(e) => updateField('html', e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      提供完整的HTML文档，可以使用 window.MiniAppAPI 访问平台API
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">JavaScript 代码</Label>
                    <Textarea
                      id="code"
                      placeholder={`// 使用 MiniAppAPI 与平台交互
const app = document.getElementById('app');

// 创建UI
app.innerHTML = \`
  <h1>Hello MiniApp!</h1>
  <button id="btn">点击我</button>
\`;

// 添加事件监听
document.getElementById('btn').addEventListener('click', async () => {
  await MiniAppAPI.notification.send('通知', '按钮被点击了！');
});`}
                      value={formData.code}
                      onChange={(e) => updateField('code', e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      JavaScript代码将在沙箱环境中执行，可以使用 MiniAppAPI 对象
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
