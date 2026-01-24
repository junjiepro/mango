/**
 * WorkingDirectorySwitchDialog Component
 * 工作目录切换提示对话框
 * 当ACP会话的工作目录与当前工作区目录不一致时显示
 */

'use client';

import React from 'react';
import { FolderOpen, ArrowRight } from 'lucide-react';
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

interface WorkingDirectorySwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDirectory: string;
  targetDirectory: string;
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WorkingDirectorySwitchDialog({
  open,
  onOpenChange,
  currentDirectory,
  targetDirectory,
  sessionName,
  onConfirm,
  onCancel,
}: WorkingDirectorySwitchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            工作目录不一致
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                您正在切换到的会话 <strong>{sessionName}</strong> 使用了不同的工作目录。
              </p>

              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">当前目录：</span>
                  <span className="font-mono text-xs break-all">
                    {currentDirectory || '未设置'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">会话目录：</span>
                  <span className="font-mono text-xs break-all text-primary">
                    {targetDirectory}
                  </span>
                </div>
              </div>

              <p className="text-sm">
                是否将工作区目录切换到会话的工作目录？
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            保持当前目录
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            切换到会话目录
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
