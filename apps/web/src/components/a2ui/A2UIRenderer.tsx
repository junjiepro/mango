/**
 * A2UI Renderer Component
 * Renders A2UI components dynamically
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import type { A2UIComponent } from '@mango/shared/types/a2ui.types';
import { parseA2UISchema, sanitizeProps } from '@/lib/a2ui-parser';

// Component imports will be added here
import { FormComponent } from './components/FormComponent';
import { ButtonComponent } from './components/ButtonComponent';
import { ListComponent } from './components/ListComponent';
import { CardComponent } from './components/CardComponent';
import { TableComponent } from './components/TableComponent';
import { InputComponent } from './components/InputComponent';
import { SelectComponent } from './components/SelectComponent';
import { TabsComponent } from './components/TabsComponent';
import { GridComponent } from './components/GridComponent';
import { ChartComponent } from './components/ChartComponent';
import { ImageComponent } from './components/ImageComponent';
import { VideoComponent } from './components/VideoComponent';
import { AudioComponent } from './components/AudioComponent';

interface A2UIRendererProps {
  schema: A2UIComponent | unknown;
  onEvent?: (event: { componentId: string; action: string; payload: any }) => void;
}

/**
 * Component registry mapping
 */
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  form: FormComponent,
  button: ButtonComponent,
  list: ListComponent,
  card: CardComponent,
  table: TableComponent,
  input: InputComponent,
  select: SelectComponent,
  tabs: TabsComponent,
  grid: GridComponent,
  chart: ChartComponent,
  image: ImageComponent,
  video: VideoComponent,
  audio: AudioComponent,
};

export function A2UIRenderer({ schema, onEvent }: A2UIRendererProps) {
  // Parse and validate schema
  let component: A2UIComponent;
  try {
    component = parseA2UISchema(schema);
  } catch (error) {
    console.error('A2UI parsing error:', error);
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded">
        <p className="text-red-600 text-sm">Invalid A2UI component</p>
      </div>
    );
  }

  // Get component from registry
  const Component = COMPONENT_MAP[component.type];

  if (!Component) {
    console.warn(`Unknown A2UI component type: ${component.type}`);
    return null;
  }

  // Sanitize props
  const sanitizedProps = sanitizeProps(component.props);

  // Handle events
  const handleEvent = (eventName: string, data: any) => {
    const handler = component.events?.find(e => e.event === eventName);
    if (handler && onEvent) {
      onEvent({
        componentId: component.id,
        action: handler.action,
        payload: { ...handler.payload, ...data },
      });
    }
  };

  return (
    <Component {...sanitizedProps} onEvent={handleEvent}>
      {component.children?.map(child => (
        <A2UIRenderer key={child.id} schema={child} onEvent={onEvent} />
      ))}
    </Component>
  );
}
