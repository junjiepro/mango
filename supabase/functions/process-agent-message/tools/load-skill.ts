/**
 * Load Skill Tool
 * Agent 按需加载 Skill 完整内容的工具
 * 适配 Edge Function 环境（无文件系统操作）
 */

import { tool } from 'https://esm.sh/ai@5.0.110';
import { z } from 'https://esm.sh/zod@3.23.8';
import type { SkillLoader } from '../lib/skill-loader.ts';

/**
 * 创建 load_skill 工具
 */
export function createLoadSkillTool(loader: SkillLoader) {
  return tool({
    description: `加载指定技能的完整内容。

查看 <available-skills> 或 <matched-skills> 后，
使用此工具加载相关技能的详细指南。

参数:
- skill_id: 技能ID (如 edge:a2ui)
- section: 可选，只加载特定章节`,

    inputSchema: z.object({
      skill_id: z.string().describe('技能ID'),
      section: z.string().optional().describe('章节名称'),
    }),

    execute: async ({ skill_id, section }) => {
      try {
        console.log(`Loading skill: ${skill_id}`);

        const content = await loader.loadContent(skill_id);

        if (!content) {
          return `技能 "${skill_id}" 不存在或已禁用`;
        }

        // 提取特定章节
        let result = content;
        if (section) {
          const extracted = extractSection(content, section);
          if (!extracted) {
            return `未找到章节 "${section}"`;
          }
          result = extracted;
        }

        // 限制长度
        if (result.length > 6000) {
          result = result.substring(0, 6000) + '\n\n... (内容已截断，请指定 section 参数)';
        }

        return result;
      } catch (error) {
        console.error(`Failed to load skill ${skill_id}:`, error);
        return `加载失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 提取特定章节
 */
function extractSection(content: string, sectionName: string): string {
  const lines = content.split('\n');
  const sectionLower = sectionName.toLowerCase();

  let inSection = false;
  let sectionLevel = 0;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].toLowerCase();

      if (title.includes(sectionLower)) {
        inSection = true;
        sectionLevel = level;
        sectionLines.push(line);
        continue;
      }

      if (inSection && level <= sectionLevel) {
        break;
      }
    }

    if (inSection) {
      sectionLines.push(line);
    }
  }

  return sectionLines.join('\n').trim();
}
