/**
 * Resource Types for User Story 5
 * 资源嗅探与管理
 */

export type ResourceType =
  | 'file'
  | 'link'
  | 'miniapp'
  | 'code'
  | 'html'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive';

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
  messageIds?: string[];
  timestamp?: string;
  occurrences?: number;
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
  language?: string;
  code?: string;
  isBlock?: boolean;
  isUnwrapped?: boolean;
  miniAppId?: string;
  installationId?: string;
  name?: string;
  icon?: string;
  url?: string;
  fileExtension?: string;
  title?: string;
  description?: string;
  isA2UI?: boolean;
  a2uiSchema?: unknown;
  miniApp?: unknown;
  installation?: unknown;
}
