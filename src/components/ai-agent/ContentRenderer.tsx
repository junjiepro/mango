/**
 * 多模态内容渲染器
 * 支持文本、代码、HTML、图像、音频和文件的渲染和编辑
 */

'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  MultimodalContent,
  TextContent,
  CodeContent,
  HTMLContent,
  ImageContent,
  AudioContent,
  FileContent,
  ContentType
} from '@/types/multimodal'

// Monaco Editor (动态导入以避免 SSR 问题)
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-md" />
  }
)

// Icons
const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

/**
 * 渲染模式
 */
type RenderMode = 'view' | 'edit' | 'preview'

/**
 * 内容渲染器属性
 */
interface ContentRendererProps {
  content: MultimodalContent
  mode?: RenderMode
  editable?: boolean
  className?: string
  onContentChange?: (content: MultimodalContent) => void
  onModeChange?: (mode: RenderMode) => void
}

/**
 * 多模态内容渲染器组件
 */
export default function ContentRenderer({
  content,
  mode = 'view',
  editable = false,
  className,
  onContentChange,
  onModeChange
}: ContentRendererProps) {
  const t = useTranslations('aiAgent.contentRenderer')

  // 状态管理
  const [currentMode, setCurrentMode] = useState<RenderMode>(mode)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 引用
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 初始化编辑内容
  useEffect(() => {
    if (content.type === 'text' || content.type === 'code' || content.type === 'html') {
      setEditedContent((content as any).content || '')
    }
  }, [content])

  // 模式变更处理
  const handleModeChange = useCallback((newMode: RenderMode) => {
    setCurrentMode(newMode)
    onModeChange?.(newMode)
  }, [onModeChange])

  // 开始编辑
  const startEditing = useCallback(() => {
    if (!editable) return
    setIsEditing(true)
    setCurrentMode('edit')
  }, [editable])

  // 保存编辑
  const saveEditing = useCallback(() => {
    if (!onContentChange) return

    try {
      const updatedContent = {
        ...content,
        content: editedContent,
        metadata: {
          ...content.metadata,
          timestamp: new Date().toISOString()
        }
      } as MultimodalContent

      onContentChange(updatedContent)
      setIsEditing(false)
      setCurrentMode('view')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }, [content, editedContent, onContentChange])

  // 取消编辑
  const cancelEditing = useCallback(() => {
    if (content.type === 'text' || content.type === 'code' || content.type === 'html') {
      setEditedContent((content as any).content || '')
    }
    setIsEditing(false)
    setCurrentMode('view')
    setError(null)
  }, [content])

  // 复制内容
  const copyContent = useCallback(async () => {
    try {
      let textToCopy = ''

      if (content.type === 'text' || content.type === 'code' || content.type === 'html') {
        textToCopy = (content as any).content || ''
      } else if (content.type === 'image') {
        textToCopy = (content as ImageContent).url
      } else if (content.type === 'audio') {
        textToCopy = (content as AudioContent).url
      } else if (content.type === 'file') {
        textToCopy = (content as FileContent).url
      }

      await navigator.clipboard.writeText(textToCopy)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }, [content])

  // 下载文件
  const downloadFile = useCallback(() => {
    let url = ''
    let filename = ''

    switch (content.type) {
      case 'image':
        url = (content as ImageContent).url
        filename = `image.${(content as ImageContent).format}`
        break
      case 'audio':
        url = (content as AudioContent).url
        filename = `audio.${(content as AudioContent).format}`
        break
      case 'file':
        url = (content as FileContent).url
        filename = (content as FileContent).filename
        break
      default:
        return
    }

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [content])

  // 获取内容类型图标和标签
  const getContentTypeInfo = useCallback((type: ContentType) => {
    switch (type) {
      case 'text':
        return { icon: '📄', label: t('types.text') }
      case 'code':
        return { icon: '💻', label: t('types.code') }
      case 'html':
        return { icon: '🌐', label: t('types.html') }
      case 'image':
        return { icon: '🖼️', label: t('types.image') }
      case 'audio':
        return { icon: '🎵', label: t('types.audio') }
      case 'file':
        return { icon: '📁', label: t('types.file') }
      default:
        return { icon: '📄', label: t('types.unknown') }
    }
  }, [t])

  // 渲染工具栏
  const renderToolbar = useCallback(() => {
    const typeInfo = getContentTypeInfo(content.type)

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{typeInfo.icon}</span>
          <Badge variant="secondary">{typeInfo.label}</Badge>
          {content.type === 'code' && (
            <Badge variant="outline">
              {(content as CodeContent).language}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* 模式切换 */}
          {(content.type === 'text' || content.type === 'code' || content.type === 'html') && (
            <div className="flex items-center space-x-1 bg-white rounded-md p-1">
              <Button
                variant={currentMode === 'view' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleModeChange('view')}
              >
                <ViewIcon />
                {t('modes.view')}
              </Button>
              {content.type === 'html' && (
                <Button
                  variant={currentMode === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeChange('preview')}
                >
                  <PlayIcon />
                  {t('modes.preview')}
                </Button>
              )}
              {editable && (
                <Button
                  variant={currentMode === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={startEditing}
                >
                  <EditIcon />
                  {t('modes.edit')}
                </Button>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <Button variant="ghost" size="sm" onClick={copyContent}>
            <CopyIcon />
          </Button>

          {(content.type === 'image' || content.type === 'audio' || content.type === 'file') && (
            <Button variant="ghost" size="sm" onClick={downloadFile}>
              <DownloadIcon />
            </Button>
          )}
        </div>
      </div>
    )
  }, [content, currentMode, editable, t, getContentTypeInfo, handleModeChange, startEditing, copyContent, downloadFile])

  // 渲染文本内容
  const renderTextContent = useCallback((textContent: TextContent) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t('placeholders.text')}
          />
          <div className="flex space-x-2">
            <Button onClick={saveEditing} size="sm">
              {t('actions.save')}
            </Button>
            <Button variant="outline" onClick={cancelEditing} size="sm">
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="p-4">
        <div className="whitespace-pre-wrap text-gray-900">
          {textContent.content}
        </div>
      </div>
    )
  }, [isEditing, editedContent, saveEditing, cancelEditing, t])

  // 渲染代码内容
  const renderCodeContent = useCallback((codeContent: CodeContent) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="h-64">
            <MonacoEditor
              language={codeContent.language}
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on'
              }}
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={saveEditing} size="sm">
              {t('actions.save')}
            </Button>
            <Button variant="outline" onClick={cancelEditing} size="sm">
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="h-64">
        <MonacoEditor
          language={codeContent.language}
          value={codeContent.content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on'
          }}
        />
      </div>
    )
  }, [isEditing, editedContent, saveEditing, cancelEditing, t])

  // 渲染 HTML 内容
  const renderHTMLContent = useCallback((htmlContent: HTMLContent) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="h-64">
            <MonacoEditor
              language="html"
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on'
              }}
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={saveEditing} size="sm">
              {t('actions.save')}
            </Button>
            <Button variant="outline" onClick={cancelEditing} size="sm">
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      )
    }

    if (currentMode === 'preview') {
      return (
        <div className="h-64 border">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent.content}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
          />
        </div>
      )
    }

    return (
      <div className="h-64">
        <MonacoEditor
          language="html"
          value={htmlContent.content}
          theme="vs-light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on'
          }}
        />
      </div>
    )
  }, [isEditing, currentMode, editedContent, saveEditing, cancelEditing, t])

  // 渲染图像内容
  const renderImageContent = useCallback((imageContent: ImageContent) => {
    return (
      <div className="p-4">
        <div className="relative">
          <img
            src={imageContent.url}
            alt={imageContent.alt || ''}
            className="max-w-full h-auto rounded-md"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDNWMUg5VjNIMTlWOUgyMVYzWk0xIDIxSDNWMTFIMVYyMVpNMjEgMjFWMTlIMTFWMjFIMjFaTTMgOUgxVjNIMTFWMUg5VjNIM1Y5Wk0xMyA3VjExSDlWN0gxM1pNMTUgMTNWMTdIMTFWMTNIMTVaTTcgMTVWMTlIM1YxNUg3WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
            }}
          />
          {imageContent.caption && (
            <p className="mt-2 text-sm text-gray-600 text-center">
              {imageContent.caption}
            </p>
          )}
        </div>
      </div>
    )
  }, [])

  // 渲染音频内容
  const renderAudioContent = useCallback((audioContent: AudioContent) => {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {audioContent.title && (
            <h4 className="font-medium text-gray-900">{audioContent.title}</h4>
          )}
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={audioContent.url}
          >
            {t('audio.unsupported')}
          </audio>
          {audioContent.transcript && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                {t('audio.transcript')}
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                {audioContent.transcript}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }, [t])

  // 渲染文件内容
  const renderFileContent = useCallback((fileContent: FileContent) => {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md">
          <div className="text-3xl">📁</div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{fileContent.filename}</h4>
            <p className="text-sm text-gray-500">
              {fileContent.mimeType}
              {fileContent.metadata.size && (
                <span> • {Math.round(fileContent.metadata.size / 1024)} KB</span>
              )}
            </p>
          </div>
          {fileContent.downloadable && (
            <Button variant="outline" size="sm" onClick={downloadFile}>
              <DownloadIcon />
              {t('actions.download')}
            </Button>
          )}
        </div>
      </div>
    )
  }, [downloadFile, t])

  // 主渲染逻辑
  const renderContent = useCallback(() => {
    switch (content.type) {
      case 'text':
        return renderTextContent(content as TextContent)
      case 'code':
        return renderCodeContent(content as CodeContent)
      case 'html':
        return renderHTMLContent(content as HTMLContent)
      case 'image':
        return renderImageContent(content as ImageContent)
      case 'audio':
        return renderAudioContent(content as AudioContent)
      case 'file':
        return renderFileContent(content as FileContent)
      default:
        return (
          <div className="p-4 text-center text-gray-500">
            {t('unsupported', { type: content.type })}
          </div>
        )
    }
  }, [
    content,
    renderTextContent,
    renderCodeContent,
    renderHTMLContent,
    renderImageContent,
    renderAudioContent,
    renderFileContent,
    t
  ])

  return (
    <Card className={cn("overflow-hidden", className)}>
      {renderToolbar()}

      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        renderContent()
      )}
    </Card>
  )
}