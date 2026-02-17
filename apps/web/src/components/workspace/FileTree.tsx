/**
 * FileTree Component
 * 文件树组件，支持虚拟滚动
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileNode } from '@/hooks/useDeviceFiles';
import { FileContextMenu } from './FileContextMenu';

interface FileTreeProps {
  files: FileNode[];
  onFileClick: (file: FileNode) => void;
  onDirectoryExpand?: (directory: FileNode) => Promise<FileNode[]>;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
  selectedPath?: string;
  className?: string;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDownload?: (node: FileNode) => void;
  onUpload?: (parentPath: string) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onFileClick: (file: FileNode) => void;
  onDirectoryExpand?: (directory: FileNode) => Promise<FileNode[]>;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDownload?: (node: FileNode) => void;
  onUpload?: (parentPath: string) => void;
}

function FileTreeItem({
  node,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onFileClick,
  onDirectoryExpand,
  expandedPaths,
  onToggleExpand,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onUpload,
}: FileTreeItemProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isDirectory = node.type === 'directory';
  const paddingLeft = level * 12 + 8;

  const handleClick = async () => {
    if (isDirectory) {
      // 先切换展开状态
      onToggle();

      // 如果文件夹还没有加载子文件，且正在展开（不是折叠），则加载
      if (!node.children && onDirectoryExpand && !isExpanded) {
        setIsLoading(true);
        try {
          await onDirectoryExpand(node);
        } catch (error) {
          console.error('Failed to load children:', error);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      onFileClick(node);
    }
  };

  return (
    <div>
      <FileContextMenu
        node={node}
        onRename={onRename}
        onDelete={onDelete}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onDownload={onDownload}
        onUpload={onUpload}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={`w-full justify-start h-7 px-2 font-normal overflow-hidden ${
            isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {isDirectory && (
            <span className="mr-1 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          )}
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 mr-2 shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 mr-2 shrink-0 text-blue-500" />
            )
          ) : (
            <File className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm min-w-0">{node.name}</span>
        </Button>
      </FileContextMenu>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItemWrapper
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onDirectoryExpand={onDirectoryExpand}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              selectedPath={isSelected ? node.path : undefined}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDownload={onDownload}
              onUpload={onUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeItemWrapper({
  node,
  level,
  onFileClick,
  onDirectoryExpand,
  expandedPaths,
  onToggleExpand,
  selectedPath,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onUpload,
}: {
  node: FileNode;
  level: number;
  onFileClick: (file: FileNode) => void;
  onDirectoryExpand?: (directory: FileNode) => Promise<FileNode[]>;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
  selectedPath?: string;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDownload?: (node: FileNode) => void;
  onUpload?: (parentPath: string) => void;
}) {
  // 使用父组件传递的展开状态，而不是内部状态
  const isExpanded = expandedPaths?.has(node.path) ?? false;
  const isSelected = selectedPath === node.path;

  return (
    <FileTreeItem
      node={node}
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onToggle={() => onToggleExpand?.(node.path)}
      onFileClick={onFileClick}
      onDirectoryExpand={onDirectoryExpand}
      expandedPaths={expandedPaths}
      onToggleExpand={onToggleExpand}
      onRename={onRename}
      onDelete={onDelete}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
      onDownload={onDownload}
      onUpload={onUpload}
    />
  );
}

export function FileTree({
  files,
  onFileClick,
  onDirectoryExpand,
  expandedPaths,
  onToggleExpand,
  selectedPath,
  className = '',
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onUpload,
}: FileTreeProps) {
  const t = useTranslations('workspace');

  if (files.length === 0) {
    return <div className={`p-4 text-sm text-muted-foreground ${className}`}>{t('fileExplorer.noFiles')}</div>;
  }

  return (
    <div className={`${className}`}>
      {files.map((file) => (
        <FileTreeItemWrapper
          key={file.path}
          node={file}
          level={0}
          onFileClick={onFileClick}
          onDirectoryExpand={onDirectoryExpand}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          selectedPath={selectedPath}
          onRename={onRename}
          onDelete={onDelete}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onDownload={onDownload}
          onUpload={onUpload}
        />
      ))}
    </div>
  );
}
