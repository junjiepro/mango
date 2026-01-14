/**
 * FileExplorerTab Component
 * 工作区文件浏览器标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useEffect, useState } from 'react';
import { FolderIcon, Plus, FilePlus, FolderPlus } from 'lucide-react';
import { useDeviceFiles, type FileNode } from '@/hooks/useDeviceFiles';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from '@/components/workspace/FileTree';
import { FileInputDialog } from '@/components/workspace/FileInputDialog';
import { DeviceBinding } from '@/services/DeviceService';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FileExplorerTabProps {
  deviceId?: string;
  device?: DeviceBinding;
  onFileClick?: (file: FileNode) => void;
}

export function FileExplorerTab({ deviceId, device, onFileClick }: FileExplorerTabProps) {
  const {
    files,
    isLoading,
    error,
    loadDirectory,
    createFile,
    createDirectory,
    deleteFile,
    renameFile,
    currentPath,
  } = useDeviceFiles(device);

  // 展开状态管理
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  // 存储已加载的子节点数据
  const [loadedChildren, setLoadedChildren] = useState<Map<string, FileNode[]>>(new Map());

  // 对话框状态
  const [createFileDialog, setCreateFileDialog] = useState<{ open: boolean; parentPath: string }>({
    open: false,
    parentPath: '',
  });
  const [createFolderDialog, setCreateFolderDialog] = useState<{
    open: boolean;
    parentPath: string;
  }>({
    open: false,
    parentPath: '',
  });
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; node: FileNode | null }>({
    open: false,
    node: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; node: FileNode | null }>({
    open: false,
    node: null,
  });

  // 初始加载根目录
  useEffect(() => {
    if (deviceId) {
      loadDirectory('/');
    }
  }, [deviceId, loadDirectory]);

  // 重新加载指定目录的子节点
  const reloadDirectory = async (dirPath: string) => {
    try {
      const response = await fetch(
        `/api/devices/${deviceId}/files?path=${encodeURIComponent(dirPath)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cli-Url': device?.online_urls?.[0] || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('加载目录失败');
      }

      const data = await response.json();
      const children = data.files || [];

      // 更新缓存
      setLoadedChildren((prev) => {
        const next = new Map(prev);
        next.set(dirPath, children);
        return next;
      });

      // 如果是根目录，也更新 files 状态
      if (dirPath === currentPath) {
        await loadDirectory('/');
      }
    } catch (error) {
      console.error('Reload directory error:', error);
    }
  };

  // 事件处理函数
  const handleCreateFile = async (name: string) => {
    try {
      const parentPath = createFileDialog.parentPath || currentPath;
      const filePath = `${parentPath}/${name}`.replace(/\/+/g, '/');

      await createFile(filePath);

      // 重新加载父目录
      await reloadDirectory(parentPath);

      setCreateFileDialog({ open: false, parentPath: '' });
      toast.success('创建成功', { description: `文件 ${name} 已创建` });
    } catch (error) {
      toast.error('创建失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const parentPath = createFolderDialog.parentPath || currentPath;
      const folderPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
      await createDirectory(folderPath);

      // 重新加载父目录
      await reloadDirectory(parentPath);

      setCreateFolderDialog({ open: false, parentPath: '' });
      toast.success('创建成功', { description: `文件夹 ${name} 已创建` });
    } catch (error) {
      toast.error('创建失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog.node) return;
    try {
      const oldPath = renameDialog.node.path;
      const pathSeparator = oldPath.includes('\\') ? '\\' : '/';
      const lastSeparatorIndex = oldPath.lastIndexOf(pathSeparator);

      if (lastSeparatorIndex === -1) {
        throw new Error('无效的文件路径');
      }

      const parentPath = oldPath.substring(0, lastSeparatorIndex);
      const newPath = `${parentPath}${pathSeparator}${newName}`;

      await renameFile(oldPath, newPath);

      // 重新加载父目录
      await reloadDirectory(parentPath);

      setRenameDialog({ open: false, node: null });
      toast.success('重命名成功');
    } catch (error) {
      toast.error('重命名失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.node) return;
    try {
      const nodePath = deleteDialog.node.path;
      await deleteFile(nodePath);

      // 获取父目录路径
      const pathSeparator = nodePath.includes('\\') ? '\\' : '/';
      const lastSeparatorIndex = nodePath.lastIndexOf(pathSeparator);
      if (lastSeparatorIndex !== -1) {
        const parentPath = nodePath.substring(0, lastSeparatorIndex);
        // 重新加载父目录
        await reloadDirectory(parentPath);
      }

      setDeleteDialog({ open: false, node: null });
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  if (!deviceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <FolderIcon className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm text-gray-500">请先选择设备</p>
        <p className="text-xs text-gray-400 mt-1">选择设备后可以浏览设备上的文件</p>
      </div>
    );
  }

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      onFileClick?.(file);
    }
  };

  // 切换展开状态
  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // 合并文件数据和已加载的子节点
  const mergeFilesWithChildren = (fileList: FileNode[]): FileNode[] => {
    return fileList.map((file) => {
      if (file.type === 'directory') {
        const children = loadedChildren.get(file.path);
        if (children) {
          return {
            ...file,
            children: mergeFilesWithChildren(children),
          };
        }
      }
      return file;
    });
  };

  const filesWithChildren = React.useMemo(
    () => mergeFilesWithChildren(files),
    [files, loadedChildren]
  );

  // 懒加载子文件夹
  const handleDirectoryExpand = async (directory: FileNode): Promise<FileNode[]> => {
    try {
      const response = await fetch(
        `/api/devices/${deviceId}/files?path=${encodeURIComponent(directory.path)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cli-Url': device?.online_urls?.[0] || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('加载子文件失败');
      }

      const data = await response.json();
      const children = data.files || [];

      // 保存加载的子节点到状态中
      setLoadedChildren((prev) => {
        const next = new Map(prev);
        next.set(directory.path, children);
        return next;
      });

      return children;
    } catch (error) {
      console.error('Load children error:', error);
      toast.error('加载失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
      return [];
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* 文件树标题 */}
      <div className="p-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold truncate">文件</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setCreateFileDialog({ open: true, parentPath: currentPath })}
              >
                <FilePlus className="mr-2 h-4 w-4" />
                新建文件
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCreateFolderDialog({ open: true, parentPath: currentPath })}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                新建文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 文件树内容 */}
      <ScrollArea className="flex-1">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">加载中...</div>}
        {error && <div className="p-4 text-sm text-destructive">{error}</div>}
        {!isLoading && !error && (
          <FileTree
            files={filesWithChildren}
            onFileClick={handleFileClick}
            onDirectoryExpand={handleDirectoryExpand}
            expandedPaths={expandedPaths}
            onToggleExpand={toggleExpanded}
            onRename={(node) => setRenameDialog({ open: true, node })}
            onDelete={(node) => setDeleteDialog({ open: true, node })}
            onCreateFile={(parentPath) => setCreateFileDialog({ open: true, parentPath })}
            onCreateFolder={(parentPath) => setCreateFolderDialog({ open: true, parentPath })}
          />
        )}
      </ScrollArea>

      {/* 创建文件对话框 */}
      <FileInputDialog
        open={createFileDialog.open}
        title="新建文件"
        description="请输入文件名"
        placeholder="例如: index.ts"
        onConfirm={handleCreateFile}
        onCancel={() => setCreateFileDialog({ open: false, parentPath: '' })}
      />

      {/* 创建文件夹对话框 */}
      <FileInputDialog
        open={createFolderDialog.open}
        title="新建文件夹"
        description="请输入文件夹名"
        placeholder="例如: components"
        onConfirm={handleCreateFolder}
        onCancel={() => setCreateFolderDialog({ open: false, parentPath: '' })}
      />

      {/* 重命名对话框 */}
      <FileInputDialog
        open={renameDialog.open}
        title="重命名"
        description={`重命名 ${renameDialog.node?.name || ''}`}
        defaultValue={renameDialog.node?.name || ''}
        onConfirm={handleRename}
        onCancel={() => setRenameDialog({ open: false, node: null })}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, node: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 <strong>{deleteDialog.node?.name}</strong> 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
