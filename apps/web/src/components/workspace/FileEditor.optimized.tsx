/**
 * FileEditor Component (Optimized)
 * 文件编辑器组件 - 集成 Monaco Editor 和文件保存功能
 * User Story 5: 富交互界面与工作区
 *
 * 性能优化:
 * - 使用文件内容缓存,避免重复加载
 * - 支持内容变更检测(基于修改时间)
 * - 防抖保存,减少网络请求
 * - 优化渲染性能
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useDeviceClient, type FileNode } from '@/hooks/useDeviceClient';
import { useFileContentCache } from '@/hooks/useFileContentCache';
import type { DeviceBinding } from '@/services/DeviceService';

// 全局跟踪已加载的文件及其修改时间（跨组件实例共享）
const globalLoadedFiles = new Map<string, string>(); // path -> lastModified

// 清理指定文件的全局缓存（关闭标签页时调用）
export function clearFileCache(filePath: string) {
  globalLoadedFiles.delete(filePath);
  console.log(`[FileEditor] 清理文件缓存: ${filePath}`);
}

interface FileEditorProps {
  file: FileNode;
  device?: DeviceBinding;
  tabId?: string;
  isActive?: boolean;
  onSave?: (path: string, content: string) => void;
  onMarkDirty?: (tabId: string, isDirty: boolean) => void;
  className?: string;
}

export function FileEditor({ file, device, tabId, isActive = false, onSave, onMarkDirty, className = '' }: FileEditorProps) {
  const { client, isReady } = useDeviceClient(device);
  const fileCache = useFileContentCache();

  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastModified, setLastModified] = useState<string | undefined>(file.modified);

  // 用于防抖的引用
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  // 标记是否已完成首次加载
  const hasInitialLoadRef = useRef(false);

  // 使用ref存储回调和tabId,避免loadFile依赖变化
  const onMarkDirtyRef = useRef(onMarkDirty);
  const tabIdRef = useRef(tabId);

  useEffect(() => {
    onMarkDirtyRef.current = onMarkDirty;
    tabIdRef.current = tabId;
  }, [onMarkDirty, tabId]);

  // 加载文件内容
  const loadFile = useCallback(async (forceReload = false) => {
    if (!client) return;

    console.log(`[FileEditor] loadFile 被调用: ${file.path}`);
    console.log(`  forceReload: ${forceReload}`);
    console.log(`  globalLoadedFiles:`, Array.from(globalLoadedFiles.keys()));

    setIsLoading(true);
    try {
      const isFirstLoad = !globalLoadedFiles.has(file.path);
      const cachedModified = globalLoadedFiles.get(file.path);

      console.log(`  isFirstLoad: ${isFirstLoad}`);
      console.log(`  cachedModified: ${cachedModified}`);
      console.log(`  lastModified (state): ${lastModified}`);

      // 检查是否需要重新加载(基于元数据比较)
      // 注意：如果content为空，说明组件刚挂载，必须加载内容
      if (!forceReload && !isFirstLoad && content) {
        // 不是首次加载且不是强制刷新且已有内容,先调用stat端点获取最新修改时间
        try {
          const statData = await client.files.stat(file.path);
          const latestModified = statData.modified;

          if (cachedModified && latestModified === cachedModified) {
            // 修改时间一致,不需要重新加载
            console.log(`[FileEditor] 文件未修改，跳过加载: ${file.path}`);
            setIsLoading(false);
            return;
          } else {
            // 修改时间不一致,文件已被外部修改
            console.log(`[FileEditor] 检测到文件已被外部修改: ${file.path}`);
            console.log(`  上次加载时间: ${cachedModified}`);
            console.log(`  当前文件时间: ${latestModified}`);

            // 如果用户有未保存的编辑,提示用户
            if (isDirty) {
              toast.warning('文件冲突', {
                description: '文件已被外部修改，但您有未保存的编辑。请先保存或放弃您的更改。',
                duration: 5000,
              });
              setIsLoading(false);
              return;
            }

            // 如果没有未保存的编辑,提示并继续加载
            toast.info('文件已更新', {
              description: '文件已被外部修改，正在重新加载...',
            });
          }
        } catch (statError) {
          console.error('[FileEditor] 获取文件状态失败:', statError);
          // stat失败时，如果不是首次加载，跳过重新加载
          if (!isFirstLoad) {
            setIsLoading(false);
            return;
          }
        }
      }

      // 从服务器加载文件内容
      const data = await client.files.read(file.path);
      const fileContent = data.content || '';
      const fileModified = data.modified;

      // 更新缓存（存储内容和修改时间）
      fileCache.set(file.path, fileContent, fileModified);

      setContent(fileContent);
      setOriginalContent(fileContent);
      setLastModified(fileModified);
      setIsDirty(false);

      // 通知标签页更新isDirty状态
      if (tabIdRef.current && onMarkDirtyRef.current) {
        onMarkDirtyRef.current(tabIdRef.current, false);
      }

      // 更新全局已加载文件记录
      globalLoadedFiles.set(file.path, fileModified);
      // 标记首次加载完成
      hasInitialLoadRef.current = true;

      console.log(`[FileEditor] 文件加载完成: ${file.path}, 修改时间: ${fileModified}`);
    } catch (error) {
      toast.error('读取失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsLoading(false);
    }
  }, [file.path, file.modified, client]);
  // 移除fileCache依赖,使用闭包访问

  // 初始加载 - 在文件路径变化或client准备好时加载
  useEffect(() => {
    if (client) {
      loadFile();
    }
  }, [file.path, client]); // 添加client依赖，确保client准备好后加载

  // 检测文件是否在外部被修改
  // 注意：只在用户主动操作后（如切换标签页回来）才检测，首次加载不检测
  const hasUserInteractionRef = useRef(false);

  // 当用户切换到其他标签页再切回来时，标记为有用户交互
  useEffect(() => {
    if (isActive && hasInitialLoadRef.current) {
      // 延迟标记，避免首次激活时触发
      const timer = setTimeout(() => {
        hasUserInteractionRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    // 首次加载完成前不检测
    if (!hasInitialLoadRef.current) return;
    // 没有用户交互前不检测
    if (!hasUserInteractionRef.current) return;
    if (!file.modified || !lastModified) return;

    if (file.modified !== lastModified && !isDirty) {
      // 文件在外部被修改,提示用户重新加载
      toast.info('文件已更新', {
        description: '文件在外部被修改,点击刷新按钮重新加载',
        action: {
          label: '刷新',
          onClick: () => loadFile(true),
        },
      });
    }
  }, [file.modified, lastModified, isDirty, loadFile]);

  // 使用ref存储originalContent,避免handleChange频繁重建
  const originalContentRef = useRef(originalContent);

  useEffect(() => {
    originalContentRef.current = originalContent;
  }, [originalContent]);

  // 处理Monaco Editor挂载,恢复编辑状态
  const handleEditorMount = useCallback((currentValue: string) => {
    console.log(`[FileEditor] handleEditorMount 被调用: ${file.path}`);
    console.log(`  currentValue length: ${currentValue.length}`);
    console.log(`  originalContent length: ${originalContent.length}`);
    console.log(`  content length: ${content.length}`);

    // 如果跳过了加载，content和originalContent可能是空的
    // 但Monaco模型中有内容，需要恢复
    if (currentValue && !content) {
      console.log(`  [恢复] 从Monaco模型恢复内容`);
      setContent(currentValue);
      setOriginalContent(currentValue);
      setIsDirty(false);
      return;
    }

    // 如果模型中的内容与原始内容不同,说明有未保存的编辑
    if (currentValue !== originalContentRef.current) {
      console.log(`  [恢复] 检测到未保存的编辑`);
      setContent(currentValue);
      setIsDirty(true);

      // 通知标签页更新isDirty状态
      if (tabIdRef.current && onMarkDirtyRef.current) {
        onMarkDirtyRef.current(tabIdRef.current, true);
      }
    }
  }, [file.path, originalContent, content]);

  // 处理内容变化
  const handleChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    const dirty = newContent !== originalContentRef.current;
    setIsDirty(dirty);

    // 通知标签页更新isDirty状态
    if (tabIdRef.current && onMarkDirtyRef.current) {
      onMarkDirtyRef.current(tabIdRef.current, dirty);
    }
  }, []);

  // 保存文件
  const handleSave = useCallback(async (valueToSave?: string) => {
    if (!client) return;

    // 检查参数是否是字符串,如果不是则使用content
    const contentToSave = typeof valueToSave === 'string' ? valueToSave : content;

    setIsSaving(true);
    try {
      await client.files.write(file.path, contentToSave);

      // 获取保存后的文件状态,更新修改时间
      let newModified = file.modified;
      try {
        const statData = await client.files.stat(file.path);
        newModified = statData.modified;
      } catch {
        // 忽略stat错误
      }

      // 更新缓存
      fileCache.set(file.path, contentToSave, newModified);
      // 更新全局已加载文件记录
      globalLoadedFiles.set(file.path, newModified);

      // 如果传入了有效的字符串值,也要更新state
      if (typeof valueToSave === 'string') {
        setContent(contentToSave);
      }
      setOriginalContent(contentToSave);
      // 立即同步更新ref,避免handleChange比较时状态不一致
      originalContentRef.current = contentToSave;
      setLastModified(newModified);
      setIsDirty(false);

      // 通知标签页更新isDirty状态
      if (tabIdRef.current && onMarkDirtyRef.current) {
        onMarkDirtyRef.current(tabIdRef.current, false);
      }

      onSave?.(file.path, contentToSave);
      toast.success('保存成功', {
        description: `文件 ${file.name} 已保存`,
      });
    } catch (error) {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsSaving(false);
    }
  }, [client, file.path, file.name, file.modified, content, onSave]);

  // 重置内容
  const handleReset = useCallback(() => {
    setContent(originalContent);
    setIsDirty(false);

    // 通知标签页更新isDirty状态
    if (tabIdRef.current && onMarkDirtyRef.current) {
      onMarkDirtyRef.current(tabIdRef.current, false);
    }
  }, [originalContent]);

  // 刷新文件
  const handleRefresh = useCallback(() => {
    loadFile(true);
  }, [loadFile]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-sm text-muted-foreground">加载文件中...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{file.name}</span>
          {isDirty && <span className="text-xs text-orange-500">● 未保存</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 text-xs"
            title="刷新文件"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              重置
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-7 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={content}
          path={file.path}
          onChange={handleChange}
          onSave={handleSave}
          onMount={handleEditorMount}
          isVisible={isActive}
        />
      </div>
    </div>
  );
}
