/**
 * useWorkspaceLayout Hook
 * 管理工作区布局和响应式设计
 * User Story 5: 工作区布局与状态
 */

'use client';

import { useState, useEffect } from 'react';
import type { Breakpoint, LayoutDirection } from '@mango/shared/types/workspace.types';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

interface LayoutConfig {
  mode: 'fullscreen' | 'split';
  direction?: LayoutDirection;
  defaultRatio?: number;
  minChatWidth?: number;
  minWorkspaceWidth?: number;
  minChatHeight?: number;
  minWorkspaceHeight?: number;
}

const LAYOUT_CONFIG: Record<Breakpoint, LayoutConfig> = {
  mobile: {
    mode: 'fullscreen',
  },
  tablet: {
    mode: 'split',
    direction: 'vertical',
    defaultRatio: 0.5,
    minChatHeight: 200,
    minWorkspaceHeight: 300,
  },
  desktop: {
    mode: 'split',
    direction: 'horizontal',
    defaultRatio: 0.6,
    minChatWidth: 400,
    minWorkspaceWidth: 300,
  },
};

export function useWorkspaceLayout() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.tablet) {
        setBreakpoint('mobile');
      } else if (width < BREAKPOINTS.desktop) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const config = LAYOUT_CONFIG[breakpoint];

  return {
    breakpoint,
    config,
    isWorkspaceOpen,
    setIsWorkspaceOpen,
    splitRatio,
    setSplitRatio,
  };
}
