/**
 * Web Service Types
 * CLI 端口扫描发现的 Web 服务类型定义
 */

export interface DiscoveredWebService {
  id: string;
  port: number;
  protocol: 'http' | 'https';
  host: string;
  status: 'online' | 'offline';
  title?: string;
  serverHeader?: string;
  responseTimeMs?: number;
  lastCheckedAt: string;
  lastSeenAt?: string;
}
