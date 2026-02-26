/**
 * FileEditor Component
 * 文件编辑器组件 - 集成 Monaco Editor 和文件保存功能
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('./MonacoEditor').then(mod => mod.MonacoEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div> }
);
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
  const t = useTranslations('workspace');
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
        toast.error(t('editor.readFailed'), {
          description: error instanceof Error ? error.message : '',
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
      toast.success(t('editor.saveSuccess'), {
        description: t('editor.saveSuccessDesc', { name: file.name }),
      });
    } catch (error) {
      toast.error(t('editor.saveFailed'), {
        description: error instanceof Error ? error.message : '',
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
        <div className="text-sm text-muted-foreground">{t('editor.loadingFile')}</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{file.name}</span>
          {isDirty && <span className="text-xs text-orange-500">● {t('editor.unsaved')}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('editor.reset')}
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
            {isSaving ? t('editor.saving') : t('editor.save')}
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
