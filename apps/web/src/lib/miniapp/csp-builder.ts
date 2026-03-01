/**
 * CSP 构建器
 * 根据配置动态生成 Content-Security-Policy 字符串
 */

import type { CSPConfig } from './types';

const DEFAULT_CSP: CSPConfig = {
  connectDomains: [],
  resourceDomains: [],
  frameDomains: [],
  scriptSrc: ["'unsafe-inline'"],
  styleSrc: ["'unsafe-inline'"],
};

export function buildCSP(config?: CSPConfig): string {
  const merged = { ...DEFAULT_CSP, ...config };

  const directives: string[] = [
    `default-src 'self' blob:`,
    `script-src ${(merged.scriptSrc ?? ["'unsafe-inline'"]).join(' ')}`,
    `style-src ${(merged.styleSrc ?? ["'unsafe-inline'"]).join(' ')}`,
  ];

  if (merged.connectDomains?.length) {
    directives.push(`connect-src 'self' ${merged.connectDomains.join(' ')}`);
  }

  if (merged.resourceDomains?.length) {
    directives.push(`img-src 'self' ${merged.resourceDomains.join(' ')}`);
  }

  if (merged.frameDomains?.length) {
    directives.push(`frame-src ${merged.frameDomains.join(' ')}`);
  } else {
    directives.push(`frame-src 'none'`);
  }

  return directives.join('; ');
}
