/**
 * FileExplorerTab Component
 * 工作区文件浏览器标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  FolderIcon,
  Plus,
  FilePlus,
  FolderPlus,
  Upload,
  Download,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import { useDeviceClient, type FileNode } from '@/hooks/useDeviceClient';
import { useFileWatcher, type FileChangeEvent } from '@/hooks/useFileWatcher';
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
  DropdownMenuSeparator,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FileExplorerTabProps {
  deviceId?: string;
  device?: DeviceBinding;
  onFileClick?: (file: FileNode) => void;
  // 状态持久化
  initialExpandedPaths?: string[];
  onExpandedPathsChange?: (paths: string[]) => void;
  // 工作目录相关
  currentWorkingDirectory?: string;
  onWorkingDirectoryChange?: (path: string) => void;
}

export function FileExplorerTab({
  deviceId,
  device,
  onFileClick,
  initialExpandedPaths,
  onExpandedPathsChange,
  currentWorkingDirectory,
  onWorkingDirectoryChange,
}: FileExplorerTabProps) {
  // 使用新的 useDeviceClient Hook
  const { client, isReady } = useDeviceClient(device);

  // 状态管理
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 文件上传输入框ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 展开状态管理
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(initialExpandedPaths || [])
  );
  // 存储已加载的子节点数据
  const [loadedChildren, setLoadedChildren] = useState<Map<string, FileNode[]>>(new Map());
  const isInitializedRef = React.useRef(false);

  // 标记初始化完成（必须在所有条件返回之前调用）
  React.useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // 当 initialExpandedPaths 变化时，更新展开状态
  const prevInitialExpandedPathsRef = useRef<string[] | undefined>(undefined);
  useEffect(() => {
    if (
      initialExpandedPaths &&
      initialExpandedPaths.length > 0 &&
      JSON.stringify(initialExpandedPaths) !== JSON.stringify(prevInitialExpandedPathsRef.current)
    ) {
      prevInitialExpandedPathsRef.current = initialExpandedPaths;
      setExpandedPaths(new Set(initialExpandedPaths));
    }
  }, [initialExpandedPaths]);

  // 监听展开状态变化，通知外部
  const prevExpandedPathsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (isInitializedRef.current && onExpandedPathsChange) {
      const prevArray = Array.from(prevExpandedPathsRef.current).sort();
      const currentArray = Array.from(expandedPaths).sort();
      if (JSON.stringify(prevArray) !== JSON.stringify(currentArray)) {
        prevExpandedPathsRef.current = expandedPaths;
        onExpandedPathsChange(Array.from(expandedPaths));
      }
    }
  }, [expandedPaths, onExpandedPathsChange]);

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

  // 文件变化处理回调
  const handleFileChange = useCallback((event: FileChangeEvent) => {
    // 获取变化文件的父目录路径
    const getParentPath = (filePath: string) => {
      const separator = filePath.includes('\\') ? '\\' : '/';
      const lastIndex = filePath.lastIndexOf(separator);
      return lastIndex > 0 ? filePath.substring(0, lastIndex) : currentWorkingDirectory || '/';
    };

    const parentPath = getParentPath(event.path);

    // 刷新受影响的目录
    if (client) {
      client.files.list(parentPath).then((result) => {
        const children = result.files || [];

        // 如果是根目录，更新 files 状态
        if (parentPath === currentPath || parentPath === currentWorkingDirectory) {
          setFiles(children);
        }

        // 更新缓存中的子节点
        setLoadedChildren((prev) => {
          const next = new Map(prev);
          next.set(parentPath, children);
          return next;
        });
      }).catch((err) => {
        console.error('[FileExplorer] Failed to refresh directory:', err);
      });
    }
  }, [client, currentPath, currentWorkingDirectory]);

  // 使用文件监听 Hook
  useFileWatcher({
    device,
    watchPath: currentWorkingDirectory,
    onFileChange: handleFileChange,
    enabled: !!device && !!currentWorkingDirectory,
  });

  // 加载目录函数
  const loadDirectory = async (path: string) => {
    if (!client) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await client.files.list(path);
      setFiles(result.files || []);
      setCurrentPath(result.path || path);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载目录失败');
      console.error('Load directory error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载根目录（使用工作目录或根目录）
  useEffect(() => {
    if (client && deviceId) {
      loadDirectory(currentWorkingDirectory || '/');
    }
  }, [client, deviceId]);

  // 工作目录变更时重新加载文件列表并清空缓存
  const prevWorkingDirectoryRef = useRef(currentWorkingDirectory);
  useEffect(() => {
    if (client && deviceId && currentWorkingDirectory !== prevWorkingDirectoryRef.current) {
      prevWorkingDirectoryRef.current = currentWorkingDirectory;
      // 清空已加载的子节点缓存
      setLoadedChildren(new Map());
      // 清空展开状态
      setExpandedPaths(new Set());
      // 重新加载根目录（使用新的工作目录）
      loadDirectory(currentWorkingDirectory || '/');
    }
  }, [client, deviceId, currentWorkingDirectory]);

  // 恢复展开状态时，加载已展开目录的子内容
  useEffect(() => {
    if (!client || !deviceId || expandedPaths.size === 0) return;

    const loadExpandedDirectories = async () => {
      // 按路径深度排序，先加载浅层目录
      const sortedPaths = Array.from(expandedPaths).sort(
        (a, b) => a.split('/').length - b.split('/').length
      );

      for (const dirPath of sortedPaths) {
        // 跳过已加载的目录
        if (loadedChildren.has(dirPath)) continue;

        try {
          const result = await client.files.list(dirPath);
          const children = result.files || [];
          setLoadedChildren((prev) => {
            const next = new Map(prev);
            next.set(dirPath, children);
            return next;
          });
        } catch (error) {
          console.error(`加载目录失败: ${dirPath}`, error);
        }
      }
    };

    loadExpandedDirectories();
  }, [client, deviceId]); // 只在client和deviceId变化时执行

  // 重新加载指定目录的子节点
  const reloadDirectory = async (dirPath: string) => {
    if (!client) return;

    try {
      const result = await client.files.list(dirPath);
      const children = result.files || [];

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
    if (!client) return;

    try {
      const parentPath = createFileDialog.parentPath || currentPath;
      const filePath = `${parentPath}/${name}`.replace(/\/+/g, '/');

      await client.files.create(filePath, 'file');

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
    if (!client) return;

    try {
      const parentPath = createFolderDialog.parentPath || currentPath;
      const folderPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
      await client.files.create(folderPath, 'directory');

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
    if (!client || !renameDialog.node) return;
    try {
      const oldPath = renameDialog.node.path;
      const pathSeparator = oldPath.includes('\\') ? '\\' : '/';
      const lastSeparatorIndex = oldPath.lastIndexOf(pathSeparator);

      if (lastSeparatorIndex === -1) {
        throw new Error('无效的文件路径');
      }

      const parentPath = oldPath.substring(0, lastSeparatorIndex);
      const newPath = `${parentPath}${pathSeparator}${newName}`;

      await client.files.rename(oldPath, newPath);

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
    if (!client || !deleteDialog.node) return;
    try {
      const nodePath = deleteDialog.node.path;
      await client.files.delete(nodePath);

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

  // 处理文件上传
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !client) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const targetPath = `${currentPath}/${file.name}`.replace(/\/+/g, '/').replace(/\\/g, '/');
        await client.files.upload(file, targetPath);
        toast.success('上传成功', { description: file.name });
      }
      // 刷新当前目录
      await loadDirectory(currentPath);
    } catch (error) {
      toast.error('上传失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsUploading(false);
      // 清空输入框以允许重复上传相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理文件下载
  const handleDownload = async (file: FileNode) => {
    if (!client || file.type !== 'file') return;

    try {
      await client.files.downloadAndSave(file.path, file.name);
      toast.success('下载成功', { description: file.name });
    } catch (error) {
      toast.error('下载失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  // 打开目录选择
  const handleOpenDirectory = () => {
    // 触发工作目录选择
    onWorkingDirectoryChange?.(currentPath);
  };

  // 合并文件数据和已加载的子节点
  const filesWithChildren = React.useMemo(() => {
    if (!deviceId) {
      return [];
    }

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
    return mergeFilesWithChildren(files);
  }, [files, loadedChildren, deviceId]);

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

  // 懒加载子文件夹
  const handleDirectoryExpand = async (directory: FileNode): Promise<FileNode[]> => {
    if (!client) {
      toast.error('设备客户端未就绪');
      return [];
    }

    try {
      const data = await client.files.list(directory.path);
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
      {/* 隐藏的文件上传输入框 */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      {/* 文件树标题 */}
      <div className="p-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold truncate">文件</span>
          <div className="flex items-center gap-1">
            {/* 上传按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>上传文件</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 新建菜单 */}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  上传文件
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
            onDownload={handleDownload}
            onUpload={() => fileInputRef.current?.click()}
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
