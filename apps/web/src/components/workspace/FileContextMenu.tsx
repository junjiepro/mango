/**
 * FileContextMenu Component
 * 文件右键菜单组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FileNode } from '@/hooks/useDeviceFiles';
import {
  FileEdit,
  Trash2,
  Copy,
  FolderPlus,
  FilePlus,
  Edit3,
  Download,
  Upload,
} from 'lucide-react';

interface FileContextMenuProps {
  node: FileNode;
  children: React.ReactNode;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDownload?: (node: FileNode) => void;
  onUpload?: (parentPath: string) => void;
}

export function FileContextMenu({
  node,
  children,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onUpload,
}: FileContextMenuProps) {
  const isDirectory = node.type === 'directory';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isDirectory && (
          <>
            <ContextMenuItem onClick={() => onCreateFile?.(node.path)}>
              <FilePlus className="mr-2 h-4 w-4" />
              新建文件
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCreateFolder?.(node.path)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              新建文件夹
            </ContextMenuItem>
            {onUpload && (
              <ContextMenuItem onClick={() => onUpload?.(node.path)}>
                <Upload className="mr-2 h-4 w-4" />
                上传文件
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}
        {!isDirectory && onDownload && (
          <>
            <ContextMenuItem onClick={() => onDownload?.(node)}>
              <Download className="mr-2 h-4 w-4" />
              下载
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onRename?.(node)}>
          <Edit3 className="mr-2 h-4 w-4" />
          重命名
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete?.(node)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
