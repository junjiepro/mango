/**
 * Tabs Component for A2UI
 * 用于标签页切换
 */

'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabItem {
  id: string;
  label: string;
  content: any;
}

interface TabsComponentProps {
  tabs: TabItem[];
  defaultTab?: string;
  onEvent?: (eventName: string, data: any) => void;
  children?: React.ReactNode;
}

export function TabsComponent({
  tabs,
  defaultTab,
  onEvent,
  children,
}: TabsComponentProps) {
  const handleTabChange = (value: string) => {
    onEvent?.('onTabChange', { tabId: value });
  };

  return (
    <Tabs defaultValue={defaultTab || tabs[0]?.id} onValueChange={handleTabChange}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
      {children}
    </Tabs>
  );
}
