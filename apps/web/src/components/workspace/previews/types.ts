/**
 * File Preview Types
 * 文件预览器类型定义
 */

import type { FileNode, DeviceClientAPI } from '@/hooks/useDeviceClient';

// 支持的文件类型分类
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'office-word'
  | 'office-excel'
  | 'office-ppt'
  | 'markdown'
  | 'html'
  | 'link'
  | 'code'
  | 'text'
  | 'unknown';

// 预览器通用属性
export interface PreviewerProps {
  file: FileNode;
  deviceClient: DeviceClientAPI | null;
  className?: string;
}

// 文件信息
export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  category: FileCategory;
  mimeType?: string;
  size?: number;
}

// 预览器注册信息
export interface PreviewerRegistration {
  category: FileCategory;
  extensions: string[];
  mimeTypes?: string[];
  component: React.ComponentType<PreviewerProps>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  priority?: number; // 优先级，数值越高优先级越高
}

// 文件扩展名到分类的映射
export const FILE_EXTENSION_MAP: Record<string, FileCategory> = {
  // 图片
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  bmp: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  tiff: 'image',
  tif: 'image',
  avif: 'image',

  // 视频
  mp4: 'video',
  webm: 'video',
  ogg: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  wmv: 'video',
  flv: 'video',

  // 音频
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  m4a: 'audio',
  wma: 'audio',

  // PDF
  pdf: 'pdf',

  // Office Word
  doc: 'office-word',
  docx: 'office-word',
  odt: 'office-word',
  rtf: 'office-word',

  // Office Excel
  xls: 'office-excel',
  xlsx: 'office-excel',
  ods: 'office-excel',
  csv: 'office-excel',

  // Office PPT
  ppt: 'office-ppt',
  pptx: 'office-ppt',
  odp: 'office-ppt',

  // Markdown
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',

  // HTML
  html: 'html',
  htm: 'html',
  xhtml: 'html',

  // 代码文件 (由 Monaco 处理)
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  json: 'code',
  css: 'code',
  scss: 'code',
  less: 'code',
  sass: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  py: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  cs: 'code',
  go: 'code',
  rs: 'code',
  php: 'code',
  rb: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  sql: 'code',
  graphql: 'code',
  vue: 'code',
  svelte: 'code',

  // 文本
  txt: 'text',
  log: 'text',
  ini: 'text',
  conf: 'text',
  cfg: 'text',
  env: 'text',
  gitignore: 'text',
  dockerignore: 'text',
  editorconfig: 'text',
};

/**
 * 根据文件名获取文件分类
 */
export function getFileCategory(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_EXTENSION_MAP[ext] || 'unknown';
}

/**
 * 根据文件名获取扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 判断文件是否应该使用编辑器打开
 */
export function shouldUseEditor(filename: string): boolean {
  const category = getFileCategory(filename);
  return category === 'code' || category === 'text' || category === 'markdown';
}

/**
 * 判断文件是否支持预览模式
 * 返回 true 表示该文件类型有专门的预览器
 */
export function hasPreviewSupport(filename: string): boolean {
  const category = getFileCategory(filename);
  // 这些类型有专门的预览器
  const previewableCategories: FileCategory[] = [
    'image',
    'video',
    'audio',
    'pdf',
    'office-word',
    'office-excel',
    'office-ppt',
    'markdown',
    'html',
  ];
  return previewableCategories.includes(category);
}

/**
 * 判断文件是否为二进制文件（不适合用编辑器打开）
 */
export function isBinaryFile(filename: string): boolean {
  const category = getFileCategory(filename);
  const binaryCategories: FileCategory[] = [
    'image',
    'video',
    'audio',
    'pdf',
    'office-word',
    'office-excel',
    'office-ppt',
  ];
  return binaryCategories.includes(category);
}

/**
 * 构建文件 URL（直接访问 CLI 设备）
 */
export function buildFileUrl(deviceUrl: string, filePath: string): string {
  return `${deviceUrl}/files/download?path=${encodeURIComponent(filePath)}`;
}
