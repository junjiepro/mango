/**
 * Form Component for A2UI
 */

'use client';

import React from 'react';
import type { FormProps } from '@mango/shared/types/a2ui.types';

interface FormComponentProps extends FormProps {
  children?: React.ReactNode;
  onEvent?: (eventName: string, data: any) => void;
}

export function FormComponent({
  title,
  description,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  layout = 'vertical',
  children,
  onEvent,
}: FormComponentProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    onEvent?.('onSubmit', data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 p-4 border rounded-lg ${
        layout === 'horizontal' ? 'flex flex-wrap gap-4' : ''
      }`}
    >
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="text-sm text-gray-600">{description}</p>}

      <div className={layout === 'horizontal' ? 'flex gap-4 flex-1' : 'space-y-4'}>
        {children}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => onEvent?.('onCancel', {})}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
