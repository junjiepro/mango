/**
 * Grid Component for A2UI
 * 用于网格布局
 */

'use client';

import React from 'react';

interface GridComponentProps {
  columns?: number;
  gap?: number;
  onEvent?: (eventName: string, data: any) => void;
  children?: React.ReactNode;
}

export function GridComponent({
  columns = 2,
  gap = 4,
  onEvent,
  children,
}: GridComponentProps) {
  return (
    <div
      className={`grid gap-${gap}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
