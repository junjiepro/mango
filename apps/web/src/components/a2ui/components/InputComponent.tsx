/**
 * Input Component for A2UI
 * 用于收集用户输入
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface InputComponentProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  defaultValue?: string | number;
  onEvent?: (eventName: string, data: any) => void;
}

export function InputComponent({
  label,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  multiline = false,
  rows = 3,
  defaultValue,
  onEvent,
}: InputComponentProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onEvent?.('onChange', { value: e.target.value });
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {multiline ? (
        <Textarea
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          defaultValue={defaultValue}
          onChange={handleChange}
        />
      ) : (
        <Input
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          defaultValue={defaultValue}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
