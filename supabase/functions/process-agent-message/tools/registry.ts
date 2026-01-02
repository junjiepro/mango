/**
 * Tool Registry Module
 * 工具注册和管理
 */

import { tool } from 'https://esm.sh/ai';
import { z } from 'https://esm.sh/zod@3.23.8';

/**
 * 创建基础工具集
 */
export function createBaseTools() {
  return {
    // 获取当前时间工具
    get_current_time: tool({
      description: '获取当前时间',
      parameters: z.object({}),
      execute: async () => {
        return {
          time: new Date().toISOString(),
          timezone: 'UTC',
        };
      },
    }),

    // 计算器工具
    calculate: tool({
      description: '执行数学计算',
      parameters: z.object({
        expression: z.string().describe('数学表达式'),
      }),
      execute: async ({ expression }) => {
        try {
          // 简单的计算器实现
          const result = eval(expression);
          return { result, expression };
        } catch (error) {
          return { error: '计算错误', expression };
        }
      },
    }),
  };
}
