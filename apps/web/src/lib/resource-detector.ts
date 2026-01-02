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
      default:
        return {};
    }
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
