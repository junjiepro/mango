/**
 * MiniAppEditor Component
 * MiniApp 代码编辑器组件 - 支持 Skill 和 Code 两种编辑模式
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Code, FileText, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MonacoEditor } from './MonacoEditor';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface MiniAppEditorProps {
  miniApp: MiniApp;
  initialMode?: 'skill' | 'code';
  onSave?: (updates: { code?: string; skill?: string }, changeSummary: string) => Promise<void>;
  onClose?: () => void;
  className?: string;
}

export function MiniAppEditor({
  miniApp,
  initialMode = 'skill',
  onSave,
  onClose,
  className,
}: MiniAppEditorProps) {
  const [editMode, setEditMode] = useState<'skill' | 'code'>(initialMode);
  const [skillContent, setSkillContent] = useState(miniApp.skill || '');
  const [codeContent, setCodeContent] = useState(miniApp.code || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 检测变更
  useEffect(() => {
    const skillChanged = skillContent !== (miniApp.skill || '');
    const codeChanged = codeContent !== (miniApp.code || '');
    setHasChanges(skillChanged || codeChanged);
  }, [skillContent, codeContent, miniApp.skill, miniApp.code]);

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!hasChanges || !onSave) return;

    setSaving(true);
    try {
      const updates: { code?: string; skill?: string } = {};

      if (skillContent !== (miniApp.skill || '')) {
        updates.skill = skillContent;
      }
      if (codeContent !== (miniApp.code || '')) {
        updates.code = codeContent;
      }

      const changeSummary = Object.keys(updates).join(' 和 ') + ' 已更新';
      await onSave(updates, changeSummary);

      toast.success('保存成功');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [hasChanges, onSave, skillContent, codeContent, miniApp]);

  // 重置内容
  const handleReset = useCallback(() => {
    setSkillContent(miniApp.skill || '');
    setCodeContent(miniApp.code || '');
  }, [miniApp]);

  // 获取当前编辑内容
  const currentContent = editMode === 'skill' ? skillContent : codeContent;
  const setCurrentContent = editMode === 'skill' ? setSkillContent : setCodeContent;

  // 获取语言类型
  const language = editMode === 'skill' ? 'markdown' : 'javascript';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        {/* 模式切换 */}
        <div className="flex gap-1">
          <Button
            variant={editMode === 'skill' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('skill')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Skill
          </Button>
          <Button
            variant={editMode === 'code' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('code')}
          >
            <Code className="h-4 w-4 mr-1" />
            Code
          </Button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          value={currentContent}
          language={language}
          path={`miniapp-${miniApp.id}-${editMode}`}
          onChange={(value) => setCurrentContent(value || '')}
          onSave={handleSave}
          className="h-full"
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 py-1 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>{miniApp.display_name}</span>
        <span>
          {hasChanges ? '● 未保存' : '已保存'} | {language}
        </span>
      </div>
    </div>
  );
}
