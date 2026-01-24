/**
 * Previewer Registry
 * 预览器注册中心 - 管理所有文件类型预览器
 */

import type { FileCategory, PreviewerProps, PreviewerRegistration } from './types';
import { getFileCategory } from './types';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Globe,
  Link2,
  File,
} from 'lucide-react';

// 预览器注册表
const previewerRegistry = new Map<FileCategory, PreviewerRegistration>();

/**
 * 注册预览器
 */
export function registerPreviewer(registration: PreviewerRegistration): void {
  const existing = previewerRegistry.get(registration.category);

  // 如果已存在且新注册的优先级不高于现有的，则跳过
  if (existing && (registration.priority ?? 0) <= (existing.priority ?? 0)) {
    return;
  }

  previewerRegistry.set(registration.category, registration);
}

/**
 * 获取指定分类的预览器
 */
export function getPreviewer(category: FileCategory): PreviewerRegistration | undefined {
  return previewerRegistry.get(category);
}

/**
 * 根据文件名获取预览器
 */
export function getPreviewerForFile(filename: string): PreviewerRegistration | undefined {
  const category = getFileCategory(filename);
  return getPreviewer(category);
}

/**
 * 获取所有已注册的预览器
 */
export function getAllPreviewers(): PreviewerRegistration[] {
  return Array.from(previewerRegistry.values());
}

/**
 * 获取文件分类对应的图标
 */
export function getFileIcon(category: FileCategory): React.ComponentType<{ className?: string }> {
  switch (category) {
    case 'image':
      return ImageIcon;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'pdf':
      return FileText;
    case 'office-word':
      return FileText;
    case 'office-excel':
      return FileSpreadsheet;
    case 'office-ppt':
      return Presentation;
    case 'markdown':
      return FileText;
    case 'html':
      return Globe;
    case 'link':
      return Link2;
    case 'code':
      return FileCode;
    case 'text':
      return FileText;
    default:
      return File;
  }
}

/**
 * 获取文件分类的显示标签
 */
export function getFileCategoryLabel(category: FileCategory): string {
  switch (category) {
    case 'image':
      return '图片';
    case 'video':
      return '视频';
    case 'audio':
      return '音频';
    case 'pdf':
      return 'PDF 文档';
    case 'office-word':
      return 'Word 文档';
    case 'office-excel':
      return 'Excel 表格';
    case 'office-ppt':
      return 'PPT 演示文稿';
    case 'markdown':
      return 'Markdown';
    case 'html':
      return 'HTML 页面';
    case 'link':
      return '链接';
    case 'code':
      return '代码';
    case 'text':
      return '文本';
    default:
      return '文件';
  }
}
