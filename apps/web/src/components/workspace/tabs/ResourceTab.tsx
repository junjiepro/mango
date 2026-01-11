/**
 * ResourceTab Component
 * 工作区资源标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { ResourceItem } from '../../resource/ResourceItem';

interface ResourceTabProps {
  resources: DetectedResource[];
  onResourceClick?: (resource: DetectedResource) => void;
}

export function ResourceTab({ resources, onResourceClick }: ResourceTabProps) {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">暂无资源</p>
        <p className="text-xs text-gray-400 mt-1">对话中的文件、链接等资源会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {resources.map(resource => (
        <ResourceItem
          key={resource.id}
          resource={resource}
          onClick={onResourceClick}
        />
      ))}
    </div>
  );
}
