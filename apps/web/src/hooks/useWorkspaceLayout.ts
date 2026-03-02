/**
 * useWorkspaceLayout Hook
 * 管理工作区布局和响应式设计
 * User Story 5: 工作区布局与状态
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LayoutDirection } from '@mango/shared/types/workspace.types';

// 断点定义（像素）
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultrawide: 1920,
} as const;

export type ExtendedBreakpoint = keyof typeof BREAKPOINTS;

// 面板尺寸配置（百分比）
interface PanelSizeConfig {
  default: number; // 默认尺寸百分比
  min: number; // 最小尺寸百分比
  max: number; // 最大尺寸百分比
}

interface LayoutConfig {
  mode: 'fullscreen' | 'split';
  direction?: LayoutDirection;
  chat: PanelSizeConfig;
  workspace: PanelSizeConfig;
}

// 各断点的布局配置
const LAYOUT_CONFIG: Record<ExtendedBreakpoint, LayoutConfig> = {
  mobile: {
    mode: 'fullscreen',
    chat: { default: 100, min: 100, max: 100 },
    workspace: { default: 100, min: 100, max: 100 },
  },
  tablet: {
    mode: 'fullscreen',
    chat: { default: 100, min: 100, max: 100 },
    workspace: { default: 100, min: 100, max: 100 },
  },
  desktop: {
    mode: 'split',
    direction: 'horizontal',
    chat: { default: 45, min: 10, max: 90 },
    workspace: { default: 55, min: 10, max: 90 },
  },
  wide: {
    mode: 'split',
    direction: 'horizontal',
    chat: { default: 40, min: 10, max: 90 },
    workspace: { default: 60, min: 10, max: 90 },
  },
  ultrawide: {
    mode: 'split',
    direction: 'horizontal',
    chat: { default: 30, min: 10, max: 90 },
    workspace: { default: 70, min: 10, max: 90 },
  },
};

export function useWorkspaceLayout() {
  const [breakpoint, setBreakpoint] = useState<ExtendedBreakpoint>('desktop');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6);

  // 计算当前断点
  const updateBreakpoint = useCallback(() => {
    const width = window.innerWidth;
    if (width >= BREAKPOINTS.ultrawide) {
      setBreakpoint('ultrawide');
    } else if (width >= BREAKPOINTS.wide) {
      setBreakpoint('wide');
    } else if (width >= BREAKPOINTS.desktop) {
      setBreakpoint('desktop');
    } else if (width >= BREAKPOINTS.tablet) {
      setBreakpoint('tablet');
    } else {
      setBreakpoint('mobile');
    }
  }, []);

  useEffect(() => {
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [updateBreakpoint]);

  const config = LAYOUT_CONFIG[breakpoint];

  // 是否为全屏切换模式（mobile 和 tablet）
  const isFullscreenMode = config.mode === 'fullscreen';

  // 是否为垂直布局
  const isVertical = config.direction === 'vertical';

  return {
    breakpoint,
    config,
    isWorkspaceOpen,
    setIsWorkspaceOpen,
    splitRatio,
    setSplitRatio,
    isFullscreenMode,
    isVertical,
    breakpoints: BREAKPOINTS,
  };
}
