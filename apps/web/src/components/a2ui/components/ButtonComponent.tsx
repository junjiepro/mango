/**
 * Button Component for A2UI
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ButtonComponentProps {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  onEvent?: (eventName: string, data: any) => void;
}

export function ButtonComponent({
  label,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  icon,
  onEvent,
}: ButtonComponentProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || loading}
      onClick={() => onEvent?.('onClick', {})}
    >
      {loading ? 'Loading...' : label}
    </Button>
  );
}
