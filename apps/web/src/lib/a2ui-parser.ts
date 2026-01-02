/**
 * A2UI Parser
 * Parses A2UI JSON schema and validates component structure
 * User Story 5: 富交互界面与工作区
 */

import type { A2UIComponent, A2UIComponentType } from '@mango/shared/types/a2ui.types';

/**
 * Validation error
 */
export class A2UIValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'A2UIValidationError';
  }
}

/**
 * Allowed component types (whitelist)
 */
const ALLOWED_COMPONENT_TYPES: A2UIComponentType[] = [
  'form',
  'input',
  'select',
  'button',
  'chart',
  'table',
  'card',
  'tabs',
  'list',
  'grid',
  'text',
  'image',
  'divider',
];

/**
 * Parse and validate A2UI schema
 */
export function parseA2UISchema(schema: unknown): A2UIComponent {
  if (!schema || typeof schema !== 'object') {
    throw new A2UIValidationError('Schema must be an object');
  }

  const component = schema as Record<string, any>;

  // Validate required fields
  if (!component.id || typeof component.id !== 'string') {
    throw new A2UIValidationError('Component must have a valid id');
  }

  if (!component.type || typeof component.type !== 'string') {
    throw new A2UIValidationError('Component must have a valid type');
  }

  // Validate component type (whitelist)
  if (!ALLOWED_COMPONENT_TYPES.includes(component.type as A2UIComponentType)) {
    throw new A2UIValidationError(`Unknown component type: ${component.type}`);
  }

  // Validate props
  if (!component.props || typeof component.props !== 'object') {
    throw new A2UIValidationError('Component must have props object');
  }

  // Validate children (if present)
  if (component.children !== undefined) {
    if (!Array.isArray(component.children)) {
      throw new A2UIValidationError('Children must be an array');
    }
    // Recursively validate children
    component.children = component.children.map(parseA2UISchema);
  }

  // Validate events (if present)
  if (component.events !== undefined) {
    if (!Array.isArray(component.events)) {
      throw new A2UIValidationError('Events must be an array');
    }
    component.events.forEach(validateEvent);
  }

  return component as A2UIComponent;
}

/**
 * Validate event definition
 */
function validateEvent(event: any): void {
  if (!event || typeof event !== 'object') {
    throw new A2UIValidationError('Event must be an object');
  }

  if (!event.event || typeof event.event !== 'string') {
    throw new A2UIValidationError('Event must have a valid event name');
  }

  if (!event.action || typeof event.action !== 'string') {
    throw new A2UIValidationError('Event must have a valid action');
  }
}

/**
 * Sanitize props to prevent XSS
 */
export function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous HTML/JS
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeProps(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeProps(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
