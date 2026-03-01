/**
 * EditorTabs Component
 * 编辑区标签页管理组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourcePreview } from './ResourcePreview';
import type { DetectedResource } from '@mango/shared/types/resource.types';

interface EditorTab {
  id: string;
  resource: DetectedResource;
  title: string;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  className?: string;
}

export function EditorTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  className = '',
}: EditorTabsProps) {
  const t = useTranslations('workspace');

  if (tabs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <div className="text-center">
          <p className="text-sm">{t('editor.selectResource')}</p>
          <p className="text-xs mt-2">{t('editor.orRunCommand')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
        {/* 标签页列表 */}
        <div className="border-b bg-muted/20 overflow-x-auto overflow-y-hidden shrink-0">
          <TabsList className="h-9 bg-transparent inline-flex justify-start rounded-none p-0 w-auto min-w-full">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background shrink-0"
              >
                <span className="truncate max-w-[120px] text-xs">{tab.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="h-3 w-3 ml-1.5 p-0 hover:bg-destructive/20"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 标签页内容 */}
        <div className="flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="h-full m-0 data-[state=inactive]:hidden"
            >
              <ResourcePreview resource={tab.resource} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
