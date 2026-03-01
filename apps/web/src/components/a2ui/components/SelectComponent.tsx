/**
 * Select Component for A2UI
 * 用于下拉选择
 */

'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectComponentProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string | number;
  onEvent?: (eventName: string, data: any) => void;
}

export function SelectComponent({
  label,
  placeholder,
  options,
  required = false,
  disabled = false,
  defaultValue,
  onEvent,
}: SelectComponentProps) {
  const handleChange = (value: string) => {
    onEvent?.('onChange', { value });
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        disabled={disabled}
        defaultValue={defaultValue?.toString()}
        onValueChange={handleChange}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
