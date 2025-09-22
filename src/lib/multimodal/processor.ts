/**
 * 多模态内容处理器
 * 支持文本、代码、HTML、图像、音频和文件的处理和渲染
 */

import type {
  MultimodalContent,
  TextContent,
  CodeContent,
  HTMLContent,
  ImageContent,
  AudioContent,
  FileContent,
  ContentProcessor,
  ContentRenderer,
  ContentConverter,
  ContentValidationResult,
  ValidationError,
  ContentMetadata
} from '@/types/multimodal'

/**
 * 多模态处理器配置
 */
export interface MultimodalProcessorConfig {
  // 编辑器配置
  monaco: {
    enabled: boolean
    theme: 'vs-light' | 'vs-dark' | 'hc-black'
    automaticLayout: boolean
    wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
    minimap: boolean
  }

  // HTML 沙盒配置
  htmlSandbox: {
    enabled: boolean
    allowedTags: string[]
    allowedAttributes: Record<string, string[]>
    allowedSchemes: string[]
    removeEmptyElements: boolean
  }

  // 文件处理配置
  fileHandling: {
    maxFileSize: number // bytes
    allowedMimeTypes: string[]
    thumbnailGeneration: boolean
    virusScanning: boolean
  }

  // 媒体配置
  media: {
    imageOptimization: boolean
    audioTranscription: boolean
    videoThumbnails: boolean
    maxResolution: { width: number; height: number }
  }

  // 缓存配置
  cache: {
    enabled: boolean
    ttl: number // seconds
    maxItems: number
    storage: 'memory' | 'localStorage' | 'sessionStorage'
  }
}

/**
 * 处理结果
 */
export interface ProcessingResult<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    processingTime: number
    contentType: string
    size: number
    timestamp: string
  }
  warnings?: string[]
}

/**
 * 多模态处理器接口
 */
export interface MultimodalProcessor {
  // 内容处理
  processContent(content: MultimodalContent): Promise<ProcessingResult>
  validateContent(content: MultimodalContent): Promise<ContentValidationResult>
  convertContent(content: MultimodalContent, targetType: string): Promise<MultimodalContent>

  // 特定类型处理
  processText(content: TextContent): Promise<ProcessingResult<TextContent>>
  processCode(content: CodeContent): Promise<ProcessingResult<CodeContent>>
  processHTML(content: HTMLContent): Promise<ProcessingResult<HTMLContent>>
  processImage(content: ImageContent): Promise<ProcessingResult<ImageContent>>
  processAudio(content: AudioContent): Promise<ProcessingResult<AudioContent>>
  processFile(content: FileContent): Promise<ProcessingResult<FileContent>>

  // 渲染支持
  canRender(content: MultimodalContent): boolean
  getRenderer(contentType: string): ContentRenderer | null
  registerRenderer(contentType: string, renderer: ContentRenderer): void

  // 转换支持
  canConvert(fromType: string, toType: string): boolean
  getConverter(fromType: string, toType: string): ContentConverter | null
  registerConverter(converter: ContentConverter): void

  // 配置管理
  updateConfig(config: Partial<MultimodalProcessorConfig>): void
  getConfig(): MultimodalProcessorConfig

  // 缓存管理
  clearCache(): void
  getCacheStats(): { hits: number; misses: number; size: number }
}

/**
 * 多模态处理器实现
 */
export class MultimodalProcessorService implements MultimodalProcessor {
  private config: MultimodalProcessorConfig
  private processors: Map<string, ContentProcessor> = new Map()
  private renderers: Map<string, ContentRenderer> = new Map()
  private converters: Map<string, ContentConverter> = new Map()
  private cache: Map<string, any> = new Map()
  private cacheStats = { hits: 0, misses: 0 }

  constructor(config?: Partial<MultimodalProcessorConfig>) {
    this.config = {
      monaco: {
        enabled: true,
        theme: 'vs-dark',
        automaticLayout: true,
        wordWrap: 'on',
        minimap: false
      },
      htmlSandbox: {
        enabled: true,
        allowedTags: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th'],
        allowedAttributes: {
          '*': ['class', 'style'],
          'a': ['href', 'target'],
          'img': ['src', 'alt', 'width', 'height']
        },
        allowedSchemes: ['http', 'https', 'data'],
        removeEmptyElements: true
      },
      fileHandling: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['*/*'], // Allow all by default
        thumbnailGeneration: true,
        virusScanning: false // Would require external service
      },
      media: {
        imageOptimization: true,
        audioTranscription: false, // Would require external service
        videoThumbnails: true,
        maxResolution: { width: 4096, height: 4096 }
      },
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxItems: 1000,
        storage: 'memory'
      },
      ...config
    }

    this.initializeDefaultProcessors()
    this.initializeDefaultRenderers()
    this.initializeDefaultConverters()
  }

  /**
   * 处理多模态内容
   */
  async processContent(content: MultimodalContent): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(content)
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        this.cacheStats.hits++
        return this.cache.get(cacheKey)
      }

      this.cacheStats.misses++

      // 验证内容
      const validation = await this.validateContent(content)
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content validation failed',
            details: validation.errors
          },
          metadata: {
            processingTime: Date.now() - startTime,
            contentType: content.type,
            size: this.getContentSize(content),
            timestamp: new Date().toISOString()
          }
        }
      }

      // 根据类型处理内容
      let result: ProcessingResult

      switch (content.type) {
        case 'text':
          result = await this.processText(content as TextContent)
          break
        case 'code':
          result = await this.processCode(content as CodeContent)
          break
        case 'html':
          result = await this.processHTML(content as HTMLContent)
          break
        case 'image':
          result = await this.processImage(content as ImageContent)
          break
        case 'audio':
          result = await this.processAudio(content as AudioContent)
          break
        case 'file':
          result = await this.processFile(content as FileContent)
          break
        default:
          throw new Error(`Unsupported content type: ${content.type}`)
      }

      // 缓存结果
      if (this.config.cache.enabled && result.success) {
        this.setCacheItem(cacheKey, result)
      }

      return result

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error),
          details: error
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: content.type,
          size: this.getContentSize(content),
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 验证内容
   */
  async validateContent(content: MultimodalContent): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    try {
      // 基础验证
      if (!content.metadata || !content.metadata.id) {
        errors.push({
          code: 'MISSING_METADATA',
          message: 'Content metadata is required',
          severity: 'error'
        })
      }

      // 类型特定验证
      switch (content.type) {
        case 'text':
          await this.validateTextContent(content as TextContent, errors, warnings, suggestions)
          break
        case 'code':
          await this.validateCodeContent(content as CodeContent, errors, warnings, suggestions)
          break
        case 'html':
          await this.validateHTMLContent(content as HTMLContent, errors, warnings, suggestions)
          break
        case 'image':
          await this.validateImageContent(content as ImageContent, errors, warnings, suggestions)
          break
        case 'audio':
          await this.validateAudioContent(content as AudioContent, errors, warnings, suggestions)
          break
        case 'file':
          await this.validateFileContent(content as FileContent, errors, warnings, suggestions)
          break
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }

    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed: ${error}`,
        severity: 'error'
      })

      return {
        valid: false,
        errors,
        warnings,
        suggestions
      }
    }
  }

  /**
   * 转换内容类型
   */
  async convertContent(content: MultimodalContent, targetType: string): Promise<MultimodalContent> {
    const converter = this.getConverter(content.type, targetType)
    if (!converter) {
      throw new Error(`No converter found for ${content.type} -> ${targetType}`)
    }

    const convertedData = await converter.convert(content)

    return {
      ...convertedData,
      metadata: {
        ...content.metadata,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 处理文本内容
   */
  async processText(content: TextContent): Promise<ProcessingResult<TextContent>> {
    const startTime = Date.now()

    try {
      const processedContent: TextContent = {
        ...content,
        content: await this.processTextContent(content.content, content.format)
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'text',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEXT_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'text',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 处理代码内容
   */
  async processCode(content: CodeContent): Promise<ProcessingResult<CodeContent>> {
    const startTime = Date.now()

    try {
      const processedContent: CodeContent = {
        ...content,
        content: await this.processCodeContent(content.content, content.language),
        editorConfig: {
          ...content.editorConfig,
          monacoOptions: {
            ...content.editorConfig.monacoOptions,
            theme: this.config.monaco.theme,
            automaticLayout: this.config.monaco.automaticLayout,
            wordWrap: this.config.monaco.wordWrap,
            'minimap.enabled': this.config.monaco.minimap
          }
        }
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'code',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CODE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'code',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 处理 HTML 内容
   */
  async processHTML(content: HTMLContent): Promise<ProcessingResult<HTMLContent>> {
    const startTime = Date.now()

    try {
      const processedContent: HTMLContent = {
        ...content,
        content: await this.sanitizeHTML(content.content),
        sanitized: true,
        sandboxConfig: {
          enabled: this.config.htmlSandbox.enabled,
          permissions: ['allow-scripts'], // TODO: 从配置中获取
          allowedDomains: [],
          blockedElements: [],
          maxExecutionTime: 5000
        }
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'html',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HTML_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'html',
          size: content.content.length,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 处理图像内容
   */
  async processImage(content: ImageContent): Promise<ProcessingResult<ImageContent>> {
    const startTime = Date.now()

    try {
      const processedContent: ImageContent = {
        ...content
      }

      // 图像优化
      if (this.config.media.imageOptimization) {
        processedContent.thumbnail = await this.generateImageThumbnail(content.url)
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'image',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMAGE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'image',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 处理音频内容
   */
  async processAudio(content: AudioContent): Promise<ProcessingResult<AudioContent>> {
    const startTime = Date.now()

    try {
      const processedContent: AudioContent = {
        ...content
      }

      // 音频转录
      if (this.config.media.audioTranscription) {
        processedContent.transcript = await this.generateAudioTranscript(content.url)
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'audio',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AUDIO_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'audio',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 处理文件内容
   */
  async processFile(content: FileContent): Promise<ProcessingResult<FileContent>> {
    const startTime = Date.now()

    try {
      const processedContent: FileContent = {
        ...content
      }

      // 文件大小检查
      if (content.metadata.size && content.metadata.size > this.config.fileHandling.maxFileSize) {
        throw new Error(`File size exceeds limit: ${content.metadata.size} > ${this.config.fileHandling.maxFileSize}`)
      }

      // 生成缩略图（如果支持）
      if (this.config.fileHandling.thumbnailGeneration && this.canGenerateThumbnail(content.mimeType)) {
        // TODO: 实现缩略图生成
      }

      return {
        success: true,
        data: processedContent,
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'file',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          processingTime: Date.now() - startTime,
          contentType: 'file',
          size: content.metadata.size || 0,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 检查是否可以渲染内容
   */
  canRender(content: MultimodalContent): boolean {
    return this.renderers.has(content.type)
  }

  /**
   * 获取渲染器
   */
  getRenderer(contentType: string): ContentRenderer | null {
    return this.renderers.get(contentType) || null
  }

  /**
   * 注册渲染器
   */
  registerRenderer(contentType: string, renderer: ContentRenderer): void {
    this.renderers.set(contentType, renderer)
  }

  /**
   * 检查是否可以转换
   */
  canConvert(fromType: string, toType: string): boolean {
    const key = `${fromType}->${toType}`
    return this.converters.has(key)
  }

  /**
   * 获取转换器
   */
  getConverter(fromType: string, toType: string): ContentConverter | null {
    const key = `${fromType}->${toType}`
    return this.converters.get(key) || null
  }

  /**
   * 注册转换器
   */
  registerConverter(converter: ContentConverter): void {
    const key = `${converter.from}->${converter.to}`
    this.converters.set(key, converter)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MultimodalProcessorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): MultimodalProcessorConfig {
    return { ...this.config }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheStats = { hits: 0, misses: 0 }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { hits: number; misses: number; size: number } {
    return {
      ...this.cacheStats,
      size: this.cache.size
    }
  }

  // ========================================
  // 私有方法
  // ========================================

  private initializeDefaultProcessors(): void {
    // TODO: 初始化默认处理器
  }

  private initializeDefaultRenderers(): void {
    // TODO: 初始化默认渲染器
  }

  private initializeDefaultConverters(): void {
    // TODO: 初始化默认转换器
  }

  private generateCacheKey(content: MultimodalContent): string {
    return `${content.type}_${content.metadata.id}_${content.metadata.timestamp}`
  }

  private getContentSize(content: MultimodalContent): number {
    switch (content.type) {
      case 'text':
      case 'code':
      case 'html':
        return (content as any).content.length
      default:
        return content.metadata.size || 0
    }
  }

  private setCacheItem(key: string, value: any): void {
    if (this.cache.size >= this.config.cache.maxItems) {
      // 移除最旧的项目
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, value)

    // 设置 TTL（如果支持）
    setTimeout(() => {
      this.cache.delete(key)
    }, this.config.cache.ttl * 1000)
  }

  private async processTextContent(text: string, format?: string): Promise<string> {
    // TODO: 根据格式处理文本内容
    return text
  }

  private async processCodeContent(code: string, language: string): Promise<string> {
    // TODO: 代码格式化、语法检查等
    return code
  }

  private async sanitizeHTML(html: string): Promise<string> {
    // TODO: 使用 DOMPurify 或类似库清理 HTML
    return html
  }

  private async generateImageThumbnail(imageUrl: string): Promise<string | undefined> {
    // TODO: 生成图像缩略图
    return undefined
  }

  private async generateAudioTranscript(audioUrl: string): Promise<string | undefined> {
    // TODO: 音频转录
    return undefined
  }

  private canGenerateThumbnail(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType.startsWith('video/')
  }

  // 验证方法
  private async validateTextContent(content: TextContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.content) {
      errors.push({
        code: 'EMPTY_CONTENT',
        message: 'Text content cannot be empty',
        severity: 'error'
      })
    }
  }

  private async validateCodeContent(content: CodeContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.language) {
      errors.push({
        code: 'MISSING_LANGUAGE',
        message: 'Code language is required',
        severity: 'error'
      })
    }
  }

  private async validateHTMLContent(content: HTMLContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.sanitized && this.config.htmlSandbox.enabled) {
      warnings.push({
        code: 'UNSANITIZED_HTML',
        message: 'HTML content should be sanitized',
        severity: 'warning'
      })
    }
  }

  private async validateImageContent(content: ImageContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.url) {
      errors.push({
        code: 'MISSING_IMAGE_URL',
        message: 'Image URL is required',
        severity: 'error'
      })
    }
  }

  private async validateAudioContent(content: AudioContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.url) {
      errors.push({
        code: 'MISSING_AUDIO_URL',
        message: 'Audio URL is required',
        severity: 'error'
      })
    }
  }

  private async validateFileContent(content: FileContent, errors: ValidationError[], warnings: ValidationError[], suggestions: ValidationError[]): Promise<void> {
    if (!content.url) {
      errors.push({
        code: 'MISSING_FILE_URL',
        message: 'File URL is required',
        severity: 'error'
      })
    }

    if (content.metadata.size && content.metadata.size > this.config.fileHandling.maxFileSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds limit: ${content.metadata.size} > ${this.config.fileHandling.maxFileSize}`,
        severity: 'error'
      })
    }
  }
}

/**
 * 创建默认多模态处理器实例
 */
export function createMultimodalProcessor(config?: Partial<MultimodalProcessorConfig>): MultimodalProcessor {
  return new MultimodalProcessorService(config)
}

/**
 * 全局多模态处理器实例（单例模式）
 */
let globalProcessorInstance: MultimodalProcessor | null = null

/**
 * 获取全局处理器实例
 */
export function getMultimodalProcessor(): MultimodalProcessor {
  if (!globalProcessorInstance) {
    globalProcessorInstance = createMultimodalProcessor()
  }
  return globalProcessorInstance
}

/**
 * 重置全局处理器实例
 */
export function resetMultimodalProcessor(): void {
  if (globalProcessorInstance) {
    globalProcessorInstance.clearCache()
    globalProcessorInstance = null
  }
}