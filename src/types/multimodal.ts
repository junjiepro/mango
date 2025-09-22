/**
 * 多模态内容类型系统
 * 支持丰富的多媒体内容类型，包括编辑器配置和预览选项
 */

import type { ReactNode } from 'react'

// ========================================
// 基础多模态内容类型
// ========================================

/**
 * 内容元数据基础接口
 */
export interface ContentMetadata {
  id: string
  timestamp: string
  source: 'user' | 'agent' | 'tool' | 'system'
  size?: number
  encoding?: string
  checksum?: string
  version?: string
}

/**
 * 编辑器基础配置
 */
export interface EditorConfig {
  readOnly: boolean
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  wordWrap: boolean
  lineNumbers: boolean
  autoSave: boolean
  placeholder?: string
}

/**
 * 预览基础配置
 */
export interface PreviewConfig {
  enabled: boolean
  mode: 'inline' | 'modal' | 'sidebar' | 'tab'
  autoRefresh: boolean
  refreshInterval?: number
  controls?: PreviewControl[]
}

/**
 * 预览控制按钮
 */
export interface PreviewControl {
  id: string
  label: string
  icon?: string
  action: () => void
  disabled?: boolean
  tooltip?: string
}

// ========================================
// 文本内容类型
// ========================================

/**
 * 文本内容接口
 */
export interface TextContent {
  type: 'text'
  metadata: ContentMetadata
  content: string
  format: TextFormat
  language?: string
  encoding?: string
  editorConfig: TextEditorConfig
  previewConfig: TextPreviewConfig
}

/**
 * 文本格式类型
 */
export type TextFormat = 'plain' | 'markdown' | 'rich' | 'html' | 'xml' | 'json' | 'yaml'

/**
 * 文本编辑器配置
 */
export interface TextEditorConfig extends EditorConfig {
  syntax: {
    highlighting: boolean
    language?: string
    autoDetect: boolean
  }
  formatting: {
    autoIndent: boolean
    tabSize: number
    useTabs: boolean
    trimWhitespace: boolean
  }
  assistance: {
    autoComplete: boolean
    spellCheck: boolean
    grammar: boolean
    suggestions: boolean
  }
}

/**
 * 文本预览配置
 */
export interface TextPreviewConfig extends PreviewConfig {
  renderAs: TextFormat
  maxLength?: number
  showLineNumbers: boolean
  showStatistics: boolean
  statistics: {
    characters: boolean
    words: boolean
    lines: boolean
    paragraphs: boolean
  }
}

// ========================================
// 代码内容类型
// ========================================

/**
 * 代码内容接口
 */
export interface CodeContent {
  type: 'code'
  metadata: ContentMetadata
  content: string
  language: CodeLanguage
  filename?: string
  executable: boolean
  editorConfig: CodeEditorConfig
  previewConfig: CodePreviewConfig
  executionConfig?: CodeExecutionConfig
}

/**
 * 支持的编程语言
 */
export type CodeLanguage =
  | 'javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'cpp' | 'c'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'scala' | 'r'
  | 'sql' | 'html' | 'css' | 'scss' | 'less' | 'json' | 'xml' | 'yaml'
  | 'markdown' | 'bash' | 'powershell' | 'dockerfile' | 'terraform'
  | 'graphql' | 'solidity' | 'dart' | 'lua' | 'elixir' | 'haskell'

/**
 * 代码编辑器配置
 */
export interface CodeEditorConfig extends EditorConfig {
  monacoOptions: {
    minimap: boolean
    folding: boolean
    bracketMatching: boolean
    autoClosingBrackets: boolean
    autoClosingQuotes: boolean
    formatOnSave: boolean
    formatOnPaste: boolean
  }
  intellisense: {
    enabled: boolean
    autoImport: boolean
    quickInfo: boolean
    parameterHints: boolean
    errorChecking: boolean
  }
  debugging: {
    breakpoints: boolean
    stepThrough: boolean
    variableInspection: boolean
  }
}

/**
 * 代码预览配置
 */
export interface CodePreviewConfig extends PreviewConfig {
  showAST: boolean
  showTokens: boolean
  showMetrics: boolean
  metrics: {
    linesOfCode: boolean
    complexity: boolean
    maintainabilityIndex: boolean
    duplicateLines: boolean
  }
  linting: {
    enabled: boolean
    rules: Record<string, any>
    showInline: boolean
  }
}

/**
 * 代码执行配置
 */
export interface CodeExecutionConfig {
  runtime: string
  version?: string
  timeout: number
  memoryLimit: number
  args?: string[]
  env?: Record<string, string>
  workingDirectory?: string
  allowNetworkAccess: boolean
}

// ========================================
// HTML 内容类型
// ========================================

/**
 * HTML 内容接口
 */
export interface HTMLContent {
  type: 'html'
  metadata: ContentMetadata
  content: string
  sanitized: boolean
  editorConfig: HTMLEditorConfig
  previewConfig: HTMLPreviewConfig
  sandboxConfig: HTMLSandboxConfig
}

/**
 * HTML 编辑器配置
 */
export interface HTMLEditorConfig extends EditorConfig {
  validation: {
    enabled: boolean
    strictMode: boolean
    showWarnings: boolean
    customRules: ValidationRule[]
  }
  autoCompletion: {
    tags: boolean
    attributes: boolean
    values: boolean
    customSnippets: HTMLSnippet[]
  }
  formatting: {
    indentSize: number
    wrapLines: boolean
    preserveNewlines: boolean
  }
}

/**
 * HTML 预览配置
 */
export interface HTMLPreviewConfig extends PreviewConfig {
  sandbox: boolean
  allowScripts: boolean
  allowForms: boolean
  allowFullscreen: boolean
  allowPointerLock: boolean
  viewport: {
    width?: number
    height?: number
    scalable: boolean
  }
  devTools: {
    inspect: boolean
    console: boolean
    network: boolean
  }
}

/**
 * HTML 沙盒配置
 */
export interface HTMLSandboxConfig {
  enabled: boolean
  permissions: HTMLSandboxPermission[]
  allowedDomains: string[]
  blockedElements: string[]
  maxExecutionTime: number
  cspPolicy?: string
}

/**
 * HTML 沙盒权限
 */
export type HTMLSandboxPermission =
  | 'allow-scripts'
  | 'allow-same-origin'
  | 'allow-forms'
  | 'allow-popups'
  | 'allow-modals'
  | 'allow-orientation-lock'
  | 'allow-pointer-lock'
  | 'allow-presentation'
  | 'allow-popups-to-escape-sandbox'
  | 'allow-top-navigation'

/**
 * HTML 验证规则
 */
export interface ValidationRule {
  id: string
  name: string
  description: string
  selector: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * HTML 代码片段
 */
export interface HTMLSnippet {
  name: string
  description: string
  prefix: string
  body: string
  scope: 'html' | 'css' | 'javascript' | 'all'
}

// ========================================
// 图像内容类型
// ========================================

/**
 * 图像内容接口
 */
export interface ImageContent {
  type: 'image'
  metadata: ContentMetadata
  url: string
  alt?: string
  caption?: string
  format: ImageFormat
  dimensions: ImageDimensions
  editorConfig: ImageEditorConfig
  previewConfig: ImagePreviewConfig
  processingConfig?: ImageProcessingConfig
}

/**
 * 图像格式
 */
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg' | 'bmp' | 'tiff' | 'ico'

/**
 * 图像尺寸
 */
export interface ImageDimensions {
  width: number
  height: number
  aspectRatio: number
  fileSize: number
  dpi?: number
}

/**
 * 图像编辑器配置
 */
export interface ImageEditorConfig extends EditorConfig {
  tools: {
    crop: boolean
    resize: boolean
    rotate: boolean
    flip: boolean
    filters: boolean
    annotations: boolean
  }
  filters: ImageFilter[]
  annotations: {
    enabled: boolean
    tools: AnnotationTool[]
    maxAnnotations: number
  }
}

/**
 * 图像预览配置
 */
export interface ImagePreviewConfig extends PreviewConfig {
  zoom: {
    enabled: boolean
    min: number
    max: number
    step: number
    fitToWindow: boolean
  }
  fullscreen: boolean
  slideshow: boolean
  comparison: {
    enabled: boolean
    splitView: boolean
    overlay: boolean
  }
  metadata: {
    exif: boolean
    technical: boolean
    histogram: boolean
  }
}

/**
 * 图像处理配置
 */
export interface ImageProcessingConfig {
  optimization: {
    enabled: boolean
    quality: number
    progressive: boolean
    lossless: boolean
  }
  resizing: {
    enabled: boolean
    maxWidth?: number
    maxHeight?: number
    algorithm: 'lanczos' | 'bicubic' | 'bilinear'
  }
  watermark?: {
    enabled: boolean
    text?: string
    image?: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity: number
  }
}

/**
 * 图像滤镜
 */
export interface ImageFilter {
  id: string
  name: string
  description: string
  parameters: FilterParameter[]
  preview?: string
}

/**
 * 滤镜参数
 */
export interface FilterParameter {
  name: string
  type: 'number' | 'range' | 'boolean' | 'color' | 'select'
  value: any
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: any }[]
}

/**
 * 注释工具
 */
export interface AnnotationTool {
  id: string
  name: string
  icon: string
  type: 'text' | 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'highlight'
  config: Record<string, any>
}

// ========================================
// 音频内容类型
// ========================================

/**
 * 音频内容接口
 */
export interface AudioContent {
  type: 'audio'
  metadata: ContentMetadata
  url: string
  title?: string
  artist?: string
  album?: string
  duration: number
  format: AudioFormat
  editorConfig: AudioEditorConfig
  previewConfig: AudioPreviewConfig
  processingConfig?: AudioProcessingConfig
}

/**
 * 音频格式
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'webm' | 'aac' | 'flac' | 'm4a' | 'wma'

/**
 * 音频编辑器配置
 */
export interface AudioEditorConfig extends EditorConfig {
  waveform: {
    enabled: boolean
    color: string
    height: number
    samplesPerPixel: number
  }
  tools: {
    trim: boolean
    split: boolean
    merge: boolean
    fadeIn: boolean
    fadeOut: boolean
    normalize: boolean
    amplify: boolean
  }
  effects: AudioEffect[]
}

/**
 * 音频预览配置
 */
export interface AudioPreviewConfig extends PreviewConfig {
  controls: {
    play: boolean
    pause: boolean
    stop: boolean
    seek: boolean
    volume: boolean
    mute: boolean
    speed: boolean
    loop: boolean
  }
  visualization: {
    waveform: boolean
    spectrum: boolean
    equalizer: boolean
  }
  transcript: {
    enabled: boolean
    autoGenerate: boolean
    editable: boolean
    synchronized: boolean
  }
}

/**
 * 音频处理配置
 */
export interface AudioProcessingConfig {
  normalization: {
    enabled: boolean
    target: number
    algorithm: 'peak' | 'rms' | 'lufs'
  }
  compression: {
    enabled: boolean
    bitrate: number
    quality: 'low' | 'medium' | 'high' | 'lossless'
  }
  effects: AudioEffectConfig[]
}

/**
 * 音频效果
 */
export interface AudioEffect {
  id: string
  name: string
  description: string
  parameters: FilterParameter[]
  enabled: boolean
}

/**
 * 音频效果配置
 */
export interface AudioEffectConfig extends AudioEffect {
  order: number
  bypass: boolean
}

// ========================================
// 文件内容类型
// ========================================

/**
 * 文件内容接口
 */
export interface FileContent {
  type: 'file'
  metadata: ContentMetadata
  url: string
  filename: string
  mimeType: string
  category: FileCategory
  downloadable: boolean
  previewSupported: boolean
  editorConfig: FileEditorConfig
  previewConfig: FilePreviewConfig
  accessConfig: FileAccessConfig
}

/**
 * 文件类别
 */
export type FileCategory =
  | 'document'      // 文档 (PDF, Word, etc.)
  | 'spreadsheet'   // 电子表格
  | 'presentation'  // 演示文稿
  | 'archive'       // 压缩文件
  | 'executable'    // 可执行文件
  | 'data'          // 数据文件
  | 'configuration' // 配置文件
  | 'database'      // 数据库文件
  | 'font'          // 字体文件
  | 'model'         // 3D模型
  | 'other'         // 其他

/**
 * 文件编辑器配置
 */
export interface FileEditorConfig extends EditorConfig {
  viewer: FileViewerType
  actions: {
    download: boolean
    share: boolean
    copy: boolean
    move: boolean
    delete: boolean
    rename: boolean
  }
  metadata: {
    showDetails: boolean
    showPermissions: boolean
    showHistory: boolean
  }
}

/**
 * 文件查看器类型
 */
export type FileViewerType =
  | 'native'        // 原生查看器
  | 'embedded'      // 嵌入式查看器
  | 'external'      // 外部程序
  | 'download-only' // 仅下载

/**
 * 文件预览配置
 */
export interface FilePreviewConfig extends PreviewConfig {
  thumbnail: {
    enabled: boolean
    size: 'small' | 'medium' | 'large'
    format: 'png' | 'jpg' | 'webp'
  }
  viewer: {
    type: FileViewerType
    zoomable: boolean
    paginated: boolean
    searchable: boolean
  }
  information: {
    properties: boolean
    permissions: boolean
    history: boolean
    sharing: boolean
  }
}

/**
 * 文件访问配置
 */
export interface FileAccessConfig {
  permissions: FilePermission[]
  encryption: {
    enabled: boolean
    algorithm?: string
    keyRotation?: boolean
  }
  access: {
    public: boolean
    requireAuth: boolean
    expiresAt?: string
    maxDownloads?: number
  }
  scanning: {
    antivirus: boolean
    contentAnalysis: boolean
    malwareDetection: boolean
  }
}

/**
 * 文件权限
 */
export type FilePermission = 'read' | 'write' | 'delete' | 'share' | 'admin'

// ========================================
// 内容处理和渲染接口
// ========================================

/**
 * 内容处理器接口
 */
export interface ContentProcessor<T = any> {
  type: string
  canProcess(content: any): boolean
  process(content: any, config?: any): Promise<T>
  validate(content: any): Promise<boolean>
  getMetadata(content: any): Promise<ContentMetadata>
}

/**
 * 内容渲染器接口
 */
export interface ContentRenderer<T = any> {
  type: string
  canRender(content: T): boolean
  render(content: T, config?: any): ReactNode
  getPreview(content: T): ReactNode
  getEditor(content: T, config?: EditorConfig): ReactNode
}

/**
 * 内容转换器接口
 */
export interface ContentConverter {
  from: string
  to: string
  convert(content: any, options?: any): Promise<any>
  supportsConversion(fromType: string, toType: string): boolean
}

/**
 * 内容验证结果
 */
export interface ContentValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string
  message: string
  line?: number
  column?: number
  severity: 'error' | 'warning' | 'info'
}

/**
 * 验证警告
 */
export interface ValidationWarning extends ValidationError {
  severity: 'warning'
}

/**
 * 验证建议
 */
export interface ValidationSuggestion extends ValidationError {
  severity: 'info'
  fix?: string
}

// ========================================
// 导出的联合类型
// ========================================

/**
 * 所有多模态内容类型的联合
 */
export type MultimodalContent =
  | TextContent
  | CodeContent
  | HTMLContent
  | ImageContent
  | AudioContent
  | FileContent

/**
 * 内容类型字符串
 */
export type ContentType = MultimodalContent['type']

/**
 * 内容配置联合类型
 */
export type ContentConfig =
  | TextEditorConfig
  | CodeEditorConfig
  | HTMLEditorConfig
  | ImageEditorConfig
  | AudioEditorConfig
  | FileEditorConfig

/**
 * 预览配置联合类型
 */
export type ContentPreviewConfig =
  | TextPreviewConfig
  | CodePreviewConfig
  | HTMLPreviewConfig
  | ImagePreviewConfig
  | AudioPreviewConfig
  | FilePreviewConfig