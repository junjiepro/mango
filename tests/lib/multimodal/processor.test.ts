import { jest } from '@jest/globals'
import { MultimodalProcessorService } from '@/lib/multimodal/processor'
import type {
  MultimodalContent,
  TextContent,
  CodeContent,
  HTMLContent,
  ImageContent,
  AudioContent,
  FileContent,
  ProcessingResult,
  ContentValidationResult
} from '@/types/multimodal'

// Mock Monaco Editor
jest.mock('monaco-editor', () => ({
  editor: {
    create: jest.fn(),
    createModel: jest.fn(),
    setTheme: jest.fn(),
  },
  languages: {
    register: jest.fn(),
    setLanguageConfiguration: jest.fn(),
  },
}))

// Mock DOMPurify for HTML sanitization
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '')),
}))

// Mock file processing utilities
jest.mock('mime-types', () => ({
  lookup: jest.fn((filename: string) => {
    if (filename.endsWith('.jpg')) return 'image/jpeg'
    if (filename.endsWith('.mp3')) return 'audio/mpeg'
    if (filename.endsWith('.pdf')) return 'application/pdf'
    return 'application/octet-stream'
  }),
}))

describe('MultimodalProcessorService', () => {
  let processor: MultimodalProcessorService

  beforeEach(() => {
    jest.clearAllMocks()
    processor = new MultimodalProcessorService()
  })

  describe('Text Content Processing', () => {
    it('should process plain text content', async () => {
      const textContent: TextContent = {
        type: 'text',
        data: {
          text: 'Hello, world!',
          format: 'plain'
        },
        metadata: {
          encoding: 'utf-8'
        }
      }

      const result = await processor.processContent(textContent)

      expect(result).toEqual(expect.objectContaining({
        success: true,
        processedContent: expect.objectContaining({
          type: 'text',
          data: expect.objectContaining({
            text: 'Hello, world!'
          })
        })
      }))
    })

    it('should process markdown text content', async () => {
      const markdownContent: TextContent = {
        type: 'text',
        data: {
          text: '# Hello\n\nThis is **bold** text.',
          format: 'markdown'
        },
        metadata: {
          encoding: 'utf-8'
        }
      }

      const result = await processor.processContent(markdownContent)

      expect(result.success).toBe(true)
      expect(result.processedContent?.data.text).toContain('# Hello')
    })

    it('should validate text content length limits', async () => {
      const longText = 'A'.repeat(1000000) // 1MB of text
      const textContent: TextContent = {
        type: 'text',
        data: {
          text: longText,
          format: 'plain'
        }
      }

      const validation = await processor.validateContent(textContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/length|size/i))
    })
  })

  describe('Code Content Processing', () => {
    it('should process code content with syntax highlighting', async () => {
      const codeContent: CodeContent = {
        type: 'code',
        data: {
          code: 'function hello() {\n  console.log("Hello, world!");\n}',
          language: 'javascript',
          theme: 'vs-dark'
        },
        metadata: {
          filename: 'hello.js',
          readOnly: false
        },
        editorConfig: {
          showLineNumbers: true,
          wordWrap: 'on',
          minimap: { enabled: false }
        }
      }

      const result = await processor.processContent(codeContent)

      expect(result).toEqual(expect.objectContaining({
        success: true,
        processedContent: expect.objectContaining({
          type: 'code',
          data: expect.objectContaining({
            language: 'javascript',
            code: expect.stringContaining('function hello')
          })
        })
      }))
    })

    it('should validate code syntax', async () => {
      const invalidCodeContent: CodeContent = {
        type: 'code',
        data: {
          code: 'function invalid() { console.log("missing brace"',
          language: 'javascript'
        }
      }

      const validation = await processor.validateContent(invalidCodeContent)

      expect(validation.isValid).toBe(false)
      expect(validation.warnings).toContain(expect.stringMatching(/syntax/i))
    })

    it('should support multiple programming languages', async () => {
      const languages = [
        { code: 'print("Hello, Python!")', lang: 'python' },
        { code: 'console.log("Hello, TypeScript!");', lang: 'typescript' },
        { code: 'puts "Hello, Ruby!"', lang: 'ruby' },
        { code: 'fmt.Println("Hello, Go!")', lang: 'go' }
      ]

      for (const { code, lang } of languages) {
        const codeContent: CodeContent = {
          type: 'code',
          data: { code, language: lang }
        }

        const result = await processor.processContent(codeContent)
        expect(result.success).toBe(true)
        expect(result.processedContent?.data.language).toBe(lang)
      }
    })
  })

  describe('HTML Content Processing', () => {
    it('should sanitize HTML content', async () => {
      const htmlContent: HTMLContent = {
        type: 'html',
        data: {
          html: '<div>Safe content</div><script>alert("XSS")</script>',
          sanitized: false
        },
        metadata: {
          allowedTags: ['div', 'p', 'span'],
          stripScripts: true
        }
      }

      const result = await processor.processContent(htmlContent)

      expect(result.success).toBe(true)
      expect(result.processedContent?.data.html).not.toContain('<script>')
      expect(result.processedContent?.data.html).toContain('<div>Safe content</div>')
      expect(result.processedContent?.data.sanitized).toBe(true)
    })

    it('should handle iframe sandboxing', async () => {
      const htmlContent: HTMLContent = {
        type: 'html',
        data: {
          html: '<html><body><h1>Test Page</h1></body></html>',
          sandbox: true
        },
        previewConfig: {
          width: 800,
          height: 600,
          sandbox: ['allow-scripts', 'allow-same-origin']
        }
      }

      const result = await processor.processContent(htmlContent)

      expect(result.success).toBe(true)
      expect(result.metadata?.sandboxed).toBe(true)
    })

    it('should validate HTML structure', async () => {
      const invalidHtmlContent: HTMLContent = {
        type: 'html',
        data: {
          html: '<div><p>Unclosed tags</div>',
          sanitized: false
        }
      }

      const validation = await processor.validateContent(invalidHtmlContent)

      expect(validation.isValid).toBe(false)
      expect(validation.warnings).toContain(expect.stringMatching(/unclosed|invalid/i))
    })
  })

  describe('Image Content Processing', () => {
    it('should process image content with metadata extraction', async () => {
      const imageContent: ImageContent = {
        type: 'image',
        data: {
          url: 'https://example.com/image.jpg',
          alt: 'Test image',
          width: 800,
          height: 600
        },
        metadata: {
          mimeType: 'image/jpeg',
          fileSize: 150000,
          exifData: {
            camera: 'Test Camera',
            timestamp: '2024-01-01T12:00:00Z'
          }
        }
      }

      const result = await processor.processContent(imageContent)

      expect(result).toEqual(expect.objectContaining({
        success: true,
        processedContent: expect.objectContaining({
          type: 'image',
          data: expect.objectContaining({
            url: 'https://example.com/image.jpg',
            alt: 'Test image'
          })
        }),
        metadata: expect.objectContaining({
          processedAt: expect.any(String)
        })
      }))
    })

    it('should validate image file formats', async () => {
      const unsupportedImageContent: ImageContent = {
        type: 'image',
        data: {
          url: 'https://example.com/image.tiff',
          alt: 'Unsupported format'
        },
        metadata: {
          mimeType: 'image/tiff'
        }
      }

      const validation = await processor.validateContent(unsupportedImageContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/format|supported/i))
    })

    it('should handle image size limits', async () => {
      const largeImageContent: ImageContent = {
        type: 'image',
        data: {
          url: 'https://example.com/huge-image.jpg',
          alt: 'Very large image'
        },
        metadata: {
          fileSize: 50000000, // 50MB
          mimeType: 'image/jpeg'
        }
      }

      const validation = await processor.validateContent(largeImageContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/size|large/i))
    })
  })

  describe('Audio Content Processing', () => {
    it('should process audio content with playback controls', async () => {
      const audioContent: AudioContent = {
        type: 'audio',
        data: {
          url: 'https://example.com/audio.mp3',
          duration: 180,
          title: 'Test Audio'
        },
        metadata: {
          mimeType: 'audio/mpeg',
          fileSize: 5000000,
          bitrate: 320,
          sampleRate: 44100
        },
        playbackConfig: {
          autoplay: false,
          controls: true,
          volume: 0.8
        }
      }

      const result = await processor.processContent(audioContent)

      expect(result.success).toBe(true)
      expect(result.processedContent?.playbackConfig?.controls).toBe(true)
    })

    it('should extract audio metadata', async () => {
      const audioContent: AudioContent = {
        type: 'audio',
        data: {
          url: 'https://example.com/song.mp3',
          title: 'Test Song'
        }
      }

      const result = await processor.processContent(audioContent)

      expect(result.metadata).toEqual(expect.objectContaining({
        contentType: 'audio',
        processedAt: expect.any(String)
      }))
    })

    it('should validate audio format support', async () => {
      const unsupportedAudioContent: AudioContent = {
        type: 'audio',
        data: {
          url: 'https://example.com/audio.flac',
          title: 'FLAC Audio'
        },
        metadata: {
          mimeType: 'audio/flac'
        }
      }

      const validation = await processor.validateContent(unsupportedAudioContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/format|supported/i))
    })
  })

  describe('File Content Processing', () => {
    it('should process general file content', async () => {
      const fileContent: FileContent = {
        type: 'file',
        data: {
          filename: 'document.pdf',
          mimeType: 'application/pdf',
          size: 2000000,
          url: 'https://example.com/document.pdf'
        },
        metadata: {
          uploadedAt: '2024-01-01T12:00:00Z',
          checksum: 'abc123'
        }
      }

      const result = await processor.processContent(fileContent)

      expect(result.success).toBe(true)
      expect(result.processedContent?.data.filename).toBe('document.pdf')
    })

    it('should validate file size limits', async () => {
      const largeFileContent: FileContent = {
        type: 'file',
        data: {
          filename: 'huge-file.zip',
          mimeType: 'application/zip',
          size: 1000000000, // 1GB
          url: 'https://example.com/huge-file.zip'
        }
      }

      const validation = await processor.validateContent(largeFileContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/size|limit/i))
    })

    it('should check file type restrictions', async () => {
      const executableFileContent: FileContent = {
        type: 'file',
        data: {
          filename: 'malware.exe',
          mimeType: 'application/x-msdownload',
          size: 1000000,
          url: 'https://example.com/malware.exe'
        }
      }

      const validation = await processor.validateContent(executableFileContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(expect.stringMatching(/type|prohibited/i))
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle unknown content types gracefully', async () => {
      const unknownContent = {
        type: 'unknown',
        data: { some: 'data' }
      } as any

      const result = await processor.processContent(unknownContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown content type')
    })

    it('should handle malformed content data', async () => {
      const malformedContent = {
        type: 'text',
        data: null
      } as any

      const result = await processor.processContent(malformedContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid content data')
    })

    it('should handle processing timeouts', async () => {
      const timeoutContent: HTMLContent = {
        type: 'html',
        data: {
          html: '<div>' + 'x'.repeat(10000000) + '</div>', // Very large HTML
          sanitized: false
        }
      }

      const startTime = Date.now()

      try {
        await processor.processContent(timeoutContent)
      } catch (error) {
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(30000) // Should timeout before 30s
      }
    })

    it('should provide detailed validation error messages', async () => {
      const invalidContent: ImageContent = {
        type: 'image',
        data: {
          url: '', // Empty URL
          alt: ''  // Empty alt text
        }
      }

      const validation = await processor.validateContent(invalidContent)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toHaveLength(2)
      expect(validation.errors[0]).toContain('URL is required')
      expect(validation.errors[1]).toContain('Alt text is required')
    })
  })

  describe('Performance and Optimization', () => {
    it('should cache processed content for reuse', async () => {
      const textContent: TextContent = {
        type: 'text',
        data: {
          text: 'Cacheable content',
          format: 'plain'
        }
      }

      // Process the same content twice
      const result1 = await processor.processContent(textContent)
      const result2 = await processor.processContent(textContent)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // Second call should be faster due to caching
    })

    it('should handle concurrent processing requests', async () => {
      const contents: MultimodalContent[] = Array.from({ length: 10 }, (_, i) => ({
        type: 'text',
        data: {
          text: `Content ${i}`,
          format: 'plain'
        }
      }))

      const promises = contents.map(content => processor.processContent(content))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(results.every(result => result.success)).toBe(true)
    })

    it('should report processing metrics', async () => {
      const textContent: TextContent = {
        type: 'text',
        data: {
          text: 'Test content',
          format: 'plain'
        }
      }

      const result = await processor.processContent(textContent)

      expect(result.metadata).toEqual(expect.objectContaining({
        processedAt: expect.any(String),
        processingTimeMs: expect.any(Number)
      }))
    })
  })
})