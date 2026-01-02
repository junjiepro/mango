/**
 * Button Component for A2UI
 */

'use client';

import React from 'react';
import type { ButtonProps } from '@mango/shared/types/a2ui.types';

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
  const baseClasses = 'rounded font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => onEvent?.('onClick', {})}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? 'Loading...' : label}
    </button>
  );
}
