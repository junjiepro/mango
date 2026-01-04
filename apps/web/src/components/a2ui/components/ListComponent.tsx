/**
 * List Component for A2UI
 * 用于展示列表数据（待办事项、笔记等）
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';

interface ListItem {
  id: string;
  text: string;
  completed?: boolean;
  description?: string;
}

interface ListComponentProps {
  title?: string;
  items: ListItem[];
  onEvent?: (eventName: string, data: any) => void;
}

export function ListComponent({ title, items, onEvent }: ListComponentProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              onClick={() => onEvent?.('onItemClick', { itemId: item.id })}
            >
              {item.completed !== undefined && (
                <div className="flex-shrink-0 mt-0.5">
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.text}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
