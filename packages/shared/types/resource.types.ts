/**
 * Resource Types for User Story 5
 * 资源嗅探与管理
 */

export type ResourceType =
  | 'file'
  | 'link'
  | 'miniapp'
  | 'code'
  | 'image'
  | 'video'
  | 'audio';

export interface DetectedResource {
  id: string;
  type: ResourceType;
  content: string;
  metadata: ResourceMetadata;
  position: {
    start: number;
    end: number;
  };
  messageId?: string;
  timestamp?: string;
}

export interface ResourceMetadata {
  filename?: string;
  domain?: string;
  size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  appId?: string;
}
