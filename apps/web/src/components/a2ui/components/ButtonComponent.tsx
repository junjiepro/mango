/**
 * Button Component for A2UI
 */

'use client';

import React from 'react';
import type { ButtonProps } from '@mango/shared/types/a2ui.types';
import { Button } from '@/components/ui/button';

interface ButtonComponentProps extends ButtonProps {
  onEvent?: (eventName: string, data: any) => void;
}

export function ButtonComponent({
  label,
  variant = 'primary',
  size = 'md',
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
