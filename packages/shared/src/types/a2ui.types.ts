/**
 * A2UI (Agent-to-UI) Type Definitions
 * Based on A2UI v0.8 Protocol Specification
 * User Story 5: 富交互界面与工作区
 */

// ============================================================================
// Core A2UI Types
// ============================================================================

/**
 * A2UI Component Type
 */
export type A2UIComponentType =
  | 'form'
  | 'input'
  | 'select'
  | 'button'
  | 'chart'
  | 'table'
  | 'card'
  | 'tabs'
  | 'list'
  | 'grid'
  | 'text'
  | 'image'
  | 'divider';

/**
 * Base A2UI Component Schema
 */
export interface A2UIComponent {
  id: string;
  type: A2UIComponentType;
  props: Record<string, unknown>;
  children?: A2UIComponent[];
  events?: A2UIEvent[];
}

/**
 * A2UI Event Definition
 */
export interface A2UIEvent {
  event: string; // onClick, onChange, onSubmit, etc.
  action: string; // submit, navigate, invoke, etc.
  payload?: Record<string, unknown>;
}

// ============================================================================
// Specific Component Props
// ============================================================================

/**
 * Form Component Props
 */
export interface FormProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  layout?: 'vertical' | 'horizontal';
}

/**
 * Input Component Props
 */
export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  defaultValue?: string | number;
}

/**
 * Select Component Props
 */
export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: Array<{ value: string | number; label: string }>;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  defaultValue?: string | number | Array<string | number>;
}

/**
 * Button Component Props
 */
export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

/**
 * Chart Component Props
 */
export interface ChartProps {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title?: string;
  data: Array<Record<string, unknown>>;
  xAxis?: { dataKey: string; label?: string };
  yAxis?: { label?: string };
  series: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  legend?: boolean;
  tooltip?: boolean;
  responsive?: boolean;
}

/**
 * Table Component Props
 */
export interface TableProps {
  columns: Array<{
    key: string;
    title: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  }>;
  data: Array<Record<string, unknown>>;
  pagination?: boolean;
  pageSize?: number;
}
