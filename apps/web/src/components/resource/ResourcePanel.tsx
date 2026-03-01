/**
 * ResourcePanel Component
 * 显示对话中检测到的资源
 * User Story 5: 资源嗅探与管理
 */

'use client';

import React, { useMemo } from 'react';
import type { DetectedResource, ResourceType } from '@mango/shared/types/resource.types';
import { FileIcon, LinkIcon, ImageIcon, VideoIcon } from 'lucide-react';

interface ResourcePanelProps {
  resources: DetectedResource[];
  onResourceClick?: (resource: DetectedResource) => void;
}

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<any>> = {
  file: FileIcon,
  link: LinkIcon,
  miniapp: FileIcon,
  code: FileIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: VideoIcon,
};

export function ResourcePanel({ resources, onResourceClick }: ResourcePanelProps) {
  const groupedResources = useMemo(() => {
    return resources.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<ResourceType, DetectedResource[]>);
  }, [resources]);

  if (resources.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        暂无资源
      </div>
    );
  }

  return (
    <div className="border-t bg-gray-50 p-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">资源</span>
        <span className="text-xs text-gray-500">({resources.length})</span>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {Object.entries(groupedResources).map(([type, items]) => {
          const Icon = RESOURCE_ICONS[type as ResourceType];
          return (
            <div key={type} className="flex gap-1">
              {items.map(resource => (
                <button
                  key={resource.id}
                  onClick={() => onResourceClick?.(resource)}
                  className="flex items-center gap-1 px-2 py-1 bg-white border rounded hover:bg-gray-100 transition-colors"
                  title={resource.content}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs truncate max-w-[100px]">
                    {resource.metadata.filename || resource.metadata.domain || resource.content}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
