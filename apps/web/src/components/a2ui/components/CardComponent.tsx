/**
 * Card Component for A2UI
 * 用于展示单个项目的详细信息
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CardComponentProps {
  title?: string;
  description?: string;
  content?: string;
  footer?: string;
  onEvent?: (eventName: string, data: any) => void;
  children?: React.ReactNode;
}

export function CardComponent({
  title,
  description,
  content,
  footer,
  onEvent,
  children,
}: CardComponentProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {content && <p className="text-sm text-gray-700">{content}</p>}
        {children}
      </CardContent>
      {footer && (
        <div className="px-6 py-3 border-t bg-gray-50 text-sm text-gray-600">
          {footer}
        </div>
      )}
    </Card>
  );
}
