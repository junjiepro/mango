/**
 * FileTree Component
 * 文件树组件，支持虚拟滚动
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileNode } from '@/hooks/useDeviceFiles';

interface FileTreeProps {
  files: FileNode[];
  onFileClick: (file: FileNode) => void;
  onDirectoryClick: (directory: FileNode) => void;
  selectedPath?: string;
  className?: string;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onFileClick: (file: FileNode) => void;
  onDirectoryClick: (directory: FileNode) => void;
}

function FileTreeItem({
  node,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onFileClick,
  onDirectoryClick,
}: FileTreeItemProps) {
  const isDirectory = node.type === 'directory';
  const paddingLeft = level * 12 + 8;

  const handleClick = () => {
    if (isDirectory) {
      onToggle();
      onDirectoryClick(node);
    } else {
      onFileClick(node);
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`w-full justify-start h-7 px-2 font-normal ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {isDirectory && (
          <span className="mr-1">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 mr-2 text-blue-500" />
          )
        ) : (
          <File className="h-4 w-4 mr-2 text-muted-foreground" />
        )}
        <span className="truncate text-sm">{node.name}</span>
      </Button>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItemWrapper
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onDirectoryClick={onDirectoryClick}
              selectedPath={isSelected ? node.path : undefined}
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
  onDirectoryClick,
  selectedPath,
}: {
  node: FileNode;
  level: number;
  onFileClick: (file: FileNode) => void;
  onDirectoryClick: (directory: FileNode) => void;
  selectedPath?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedPath === node.path;

  return (
    <FileTreeItem
      node={node}
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onToggle={() => setIsExpanded(!isExpanded)}
      onFileClick={onFileClick}
      onDirectoryClick={onDirectoryClick}
    />
  );
}

export function FileTree({
  files,
  onFileClick,
  onDirectoryClick,
  selectedPath,
  className = '',
}: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className={`p-4 text-sm text-muted-foreground ${className}`}>
        暂无文件
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {files.map((file) => (
        <FileTreeItemWrapper
          key={file.path}
          node={file}
          level={0}
          onFileClick={onFileClick}
          onDirectoryClick={onDirectoryClick}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
