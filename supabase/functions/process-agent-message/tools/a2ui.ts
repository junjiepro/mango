/**
 * A2UI Tool Module
 * Agent 生成 A2UI 组件的工具
 */

import { tool } from 'https://esm.sh/ai@5.0.110';
import { z } from 'https://esm.sh/zod@3.23.8';

/**
 * A2UI 组件类型 (使用 z.lazy 支持递归结构)
 */
const A2UIComponentSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
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
      'image',
      'video',
      'audio',
    ]),
    props: z.record(z.any()),
    children: z.array(A2UIComponentSchema).optional(),
    events: z
      .array(
        z.object({
          event: z.string(),
          action: z.string(),
          payload: z.record(z.any()).optional(),
        })
      )
      .optional(),
  })
);

/**
 * 创建 A2UI 工具
 */
export function createA2UITool() {
  return tool({
    description: '生成富交互界面组件(A2UI),用于创建表单、图表、按钮等交互元素',
    inputSchema: z.object({
      component: A2UIComponentSchema,
    }),
    execute: async (args: any) => {
      const { component } = args;

      // 验证和清理组件结构
      const cleanedComponent = cleanComponent(component);

      console.log('A2UI component validated:', JSON.stringify(cleanedComponent));

      return JSON.stringify({
        success: true,
        component: cleanedComponent,
        message: 'A2UI 组件已生成',
      });
    },
  });
}

/**
 * 清理和验证组件结构
 */
function cleanComponent(component: any): any {
  if (!component || typeof component !== 'object') {
    throw new Error('Invalid component structure');
  }

  const cleaned: any = {
    id: component.id || `component-${Date.now()}`,
    type: component.type,
    props: component.props || {},
  };

  // 清理 children
  if (component.children && Array.isArray(component.children)) {
    cleaned.children = component.children
      .filter((child: any) => child && typeof child === 'object')
      .map((child: any) => cleanComponent(child));
  }

  // 清理 events
  if (component.events && Array.isArray(component.events)) {
    cleaned.events = component.events.filter((event: any) => event && event.event && event.action);
  }

  return cleaned;
}
