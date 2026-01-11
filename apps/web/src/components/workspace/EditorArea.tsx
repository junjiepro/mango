/**
 * EditorArea Component
 * VS Code 风格的中央编辑区/预览区
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditorAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function EditorArea({ children, className = '' }: EditorAreaProps) {
  return (
    <div className={`flex flex-col flex-1 bg-background ${className}`}>
      {children}
    </div>
  );
}
