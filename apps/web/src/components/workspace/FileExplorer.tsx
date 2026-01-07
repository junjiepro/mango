/**
 * FileExplorer Component
 * 文件浏览器组件，集成 Monaco Editor
 */

'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useDeviceFiles, type FileNode } from '@/hooks/useDeviceFiles';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit,
  Save
} from 'lucide-react';

interface FileExplorerProps {
  deviceId?: string;
  className?: string;
}

export function FileExplorer({ deviceId, className }: FileExplorerProps) {
  const {
    files,
    currentPath,
    isLoading,
    error,
    loadDirectory,
    readFile,
    writeFile,
  } = useDeviceFiles(deviceId);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  // 初始加载根目录
  useEffect(() => {
    if (deviceId) {
      loadDirectory('/');
    }
  }, [deviceId, loadDirectory]);

  return (
    <div className={`flex h-full ${className}`}>
      {/* 文件树 */}
      <div className="w-64 border-r bg-muted/40">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">文件浏览器</span>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-3rem)]">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">加载中...</div>
          )}
          {error && (
            <div className="p-4 text-sm text-destructive">{error}</div>
          )}
          {!isLoading && !error && files.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">暂无文件</div>
          )}
          {/* 文件树将在下一部分实现 */}
        </ScrollArea>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">{selectedFile}</span>
              <div className="flex gap-2">
                {isEditing && (
                  <Button variant="default" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="typescript"
                value={fileContent}
                onChange={(value) => setFileContent(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  readOnly: !isEditing,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            选择一个文件以查看内容
          </div>
        )}
      </div>
    </div>
  );
}
