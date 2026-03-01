/**
 * Resource Detector
 * 检测消息中的资源 (文件、链接、小应用等)
 * User Story 5: 资源嗅探与管理
 */

import type { DetectedResource, ResourceType } from '@mango/shared/types/resource.types';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 资源检测器类
 */
export class ResourceDetector {
  private detectors: Map<ResourceType, RegExp[]>;

  constructor() {
    this.detectors = new Map([
      ['link', [
        /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
        /www\.[^\s<>"{}|\\^`\[\]]+/gi,
      ]],
      ['file', [
        /\[([^\]]+)\]\(file:\/\/([^\)]+)\)/gi,
        /attachment:\/\/([a-zA-Z0-9-_]+)/gi,
      ]],
      ['miniapp', [
        /miniapp:\/\/([a-zA-Z0-9-_]+)/gi,
      ]],
      ['image', [
        /!\[([^\]]*)\]\(([^\)]+)\)/gi,
      ]],
      ['code', [
        /```(\w+)?\n([\s\S]*?)```/gi,
      ]],
    ]);
  }

  /**
   * 检测内容中的资源
   */
  detect(content: string): DetectedResource[] {
    const resources: DetectedResource[] = [];

    for (const [type, patterns] of this.detectors) {
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          // 对于代码块，只收集多行代码（包含换行符）
          if (type === 'code') {
            const codeContent = match[2] || match[0];
            if (!codeContent.includes('\n')) {
              continue; // 跳过单行代码
            }
          }

          resources.push({
            id: generateId(),
            type,
            content: match[0],
            metadata: this.extractMetadata(type, match),
            position: {
              start: match.index!,
              end: match.index! + match[0].length,
            },
          });
        }
      }
    }

    // 检测未包裹在 ``` 中的 HTML 代码
    const htmlResources = this.detectHtmlCode(content);
    resources.push(...htmlResources);

    return this.deduplicateResources(resources);
  }

  /**
   * 提取资源元数据
   */
  private extractMetadata(type: ResourceType, match: RegExpMatchArray): any {
    switch (type) {
      case 'link':
        try {
          const url = new URL(match[0]);
          return { domain: url.hostname };
        } catch {
          return { domain: match[0] };
        }
      case 'file':
        return {
          filename: match[1] || 'unknown',
          path: match[2],
        };
      case 'miniapp':
        return { appId: match[1] };
      case 'image':
        return {
          alt: match[1] || '',
          src: match[2],
        };
      case 'code':
        // 检测是否是代码块 (```)
        if (match[0].startsWith('```')) {
          return {
            language: match[1] || 'text',
            code: match[2] || match[0],
            isBlock: true,
          };
        } else {
          return {
            code: match[1] || match[0],
            isBlock: false,
          };
        }
      default:
        return {};
    }
  }

  /**
   * 检测未包裹在 ``` 中的 HTML 代码
   */
  private detectHtmlCode(content: string): DetectedResource[] {
    const htmlResources: DetectedResource[] = [];

    // 检测常见的 HTML 标签模式
    const htmlTagPattern =
      /<(html|head|body|div|span|p|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|a|img|script|style|meta|link)[^>]*>/i;

    // 检测 DOCTYPE 声明
    const doctypePattern = /<!DOCTYPE\s+html/i;

    // 如果内容包含 HTML 标签或 DOCTYPE
    if (htmlTagPattern.test(content) || doctypePattern.test(content)) {
      // 匹配完整的 HTML 文档或 HTML 片段
      const htmlDocPattern =
        /<!DOCTYPE[^>]*>[\s\S]*?<\/html>|<html[^>]*>[\s\S]*?<\/html>/gi;

      const matches = content.matchAll(htmlDocPattern);
      for (const match of matches) {
        // 检查是否已经被 ``` 包裹
        const beforeMatch = content.substring(Math.max(0, match.index! - 10), match.index!);
        if (beforeMatch.includes('```')) {
          continue; // 跳过已经在代码块中的 HTML
        }

        htmlResources.push({
          id: generateId(),
          type: 'code',
          content: match[0],
          metadata: {
            language: 'html',
            code: match[0],
            isBlock: true,
            isUnwrapped: true, // 标记为未包裹的 HTML
          },
          position: {
            start: match.index!,
            end: match.index! + match[0].length,
          },
        });
      }
    }

    return htmlResources;
  }

  /**
   * 去重资源
   */
  private deduplicateResources(resources: DetectedResource[]): DetectedResource[] {
    const seen = new Set<string>();
    return resources.filter(resource => {
      const key = `${resource.type}:${resource.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
