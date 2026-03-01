/**
 * WorkingDirectorySwitchDialog Component
 * 工作目录切换提示对话框
 * 当ACP会话的工作目录与当前工作区目录不一致时显示
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('workspace');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('workingDir.mismatch')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {t('workingDir.switchingSession', { name: sessionName })}
              </p>

              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">{t('workingDir.currentDir')}</span>
                  <span className="font-mono text-xs break-all">
                    {currentDirectory || t('workingDir.notSet')}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">{t('workingDir.sessionDir')}</span>
                  <span className="font-mono text-xs break-all text-primary">
                    {targetDirectory}
                  </span>
                </div>
              </div>

              <p className="text-sm">
                {t('workingDir.switchConfirm')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t('workingDir.keepCurrent')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('workingDir.switchToSession')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
