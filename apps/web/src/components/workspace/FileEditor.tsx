/**
 * FileEditor Component
 * 文件编辑器组件 - 集成 Monaco Editor 和文件保存功能
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useDeviceClient, type FileNode } from '@/hooks/useDeviceClient';
import type { DeviceBinding } from '@/services/DeviceService';

interface FileEditorProps {
  file: FileNode;
  device?: DeviceBinding;
  onSave?: (path: string, content: string) => void;
  className?: string;
}

export function FileEditor({ file, device, onSave, className = '' }: FileEditorProps) {
  const { client, isReady } = useDeviceClient(device);

  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 加载文件内容
  useEffect(() => {
    const loadFile = async () => {
      if (!client) return;

      setIsLoading(true);
      try {
        const data = await client.files.read(file.path);
        const fileContent = data.content || '';
        setContent(fileContent);
        setOriginalContent(fileContent);
        setIsDirty(false);
      } catch (error) {
        toast.error('读取失败', {
          description: error instanceof Error ? error.message : '未知错误',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [file.path, client]);

  // 处理内容变化
  const handleChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setIsDirty(newContent !== originalContent);
  };

  // 保存文件
  const handleSave = async () => {
    if (!client) return;

    setIsSaving(true);
    try {
      await client.files.write(file.path, content);

      setOriginalContent(content);
      setIsDirty(false);
      onSave?.(file.path, content);
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
  };

  // 重置内容
  const handleReset = () => {
    setContent(originalContent);
    setIsDirty(false);
  };

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
        />
      </div>
    </div>
  );
}
