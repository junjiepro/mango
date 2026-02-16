/**
 * Skill Context Builder
 * 构建 Skill 上下文，注入系统提示词
 */

import type { SkillLoader, SkillMetadata } from './skill-loader.ts';

// Skill 匹配结果
export interface SkillMatch {
  metadata: SkillMetadata;
  score: number;
  matchType: 'keyword' | 'trigger' | 'tag';
  matchedTerms: string[];
}

// Skill 上下文
export interface SkillContext {
  allSkillsXml: string;
  matchedSkills: SkillMatch[];
  totalCount: number;
}

/**
 * 基于用户消息匹配相关 Skill
 */
export function matchSkillsByMessage(
  skills: SkillMetadata[],
  userMessage: string,
  limit: number = 5
): SkillMatch[] {
  const messageLower = userMessage.toLowerCase();
  const messageTokens = tokenize(messageLower);
  const matches: SkillMatch[] = [];

  for (const skill of skills) {
    let score = 0;
    let matchType: 'keyword' | 'trigger' | 'tag' = 'keyword';
    const matchedTerms: string[] = [];

    // 1. 关键词匹配 (权重: 3)
    for (const keyword of skill.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        score += 3;
        matchedTerms.push(keyword);
        matchType = 'keyword';
      }
    }

    // 2. 触发词匹配 (权重: 5)
    for (const trigger of skill.triggers) {
      if (messageLower.includes(trigger.toLowerCase())) {
        score += 5;
        matchedTerms.push(trigger);
        matchType = 'trigger';
      }
    }

    // 3. 标签匹配 (权重: 2)
    for (const tag of skill.tags) {
      if (messageLower.includes(tag.toLowerCase())) {
        score += 2;
        matchedTerms.push(tag);
        if (matchType === 'keyword') matchType = 'tag';
      }
    }

    // 4. 名称/描述模糊匹配 (权重: 1)
    const nameTokens = tokenize(skill.name.toLowerCase());
    const descTokens = skill.description ? tokenize(skill.description.toLowerCase()) : [];

    for (const token of messageTokens) {
      if (nameTokens.some(t => t.includes(token) || token.includes(t))) {
        score += 1;
      }
      if (descTokens.some(t => t.includes(token) || token.includes(t))) {
        score += 0.5;
      }
    }

    // 加入优先级加成
    score += skill.priority * 0.1;

    if (score > 0) {
      matches.push({ metadata: skill, score, matchType, matchedTerms });
    }
  }

  // 按分数排序并限制数量
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 将 Skill 元数据转换为 XML 格式
 * 类似 Claude Code 的 Skill 元数据注入方式
 */
export function formatSkillsAsXml(skills: SkillMetadata[]): string {
  if (skills.length === 0) {
    return '<available-skills count="0" />';
  }

  const skillElements = skills.map(skill => {
    const attrs = [
      `id="${escapeXml(skill.skill_id)}"`,
      `name="${escapeXml(skill.name)}"`,
      `category="${skill.category}"`,
      `priority="${skill.priority}"`,
    ];

    if (skill.skill_type) {
      attrs.push(`type="${skill.skill_type}"`);
    }

    const children: string[] = [];

    if (skill.description) {
      children.push(`  <description>${escapeXml(skill.description)}</description>`);
    }

    if (skill.keywords.length > 0) {
      children.push(`  <keywords>${skill.keywords.join(', ')}</keywords>`);
    }

    if (skill.triggers.length > 0) {
      children.push(`  <triggers>${skill.triggers.join(', ')}</triggers>`);
    }

    if (skill.tags.length > 0) {
      children.push(`  <tags>${skill.tags.join(', ')}</tags>`);
    }

    if (children.length > 0) {
      return `<skill ${attrs.join(' ')}>\n${children.join('\n')}\n</skill>`;
    } else {
      return `<skill ${attrs.join(' ')} />`;
    }
  });

  return `<available-skills count="${skills.length}">\n${skillElements.join('\n')}\n</available-skills>`;
}

/**
 * 格式化匹配的 Skill 为推荐列表
 */
export function formatMatchedSkillsAsXml(matches: SkillMatch[]): string {
  if (matches.length === 0) {
    return '<matched-skills count="0" />';
  }

  const elements = matches.map(match => {
    const attrs = [
      `id="${escapeXml(match.metadata.skill_id)}"`,
      `name="${escapeXml(match.metadata.name)}"`,
      `score="${match.score.toFixed(2)}"`,
      `match-type="${match.matchType}"`,
    ];

    if (match.matchedTerms.length > 0) {
      attrs.push(`matched="${escapeXml(match.matchedTerms.join(', '))}"`);
    }

    return `<skill ${attrs.join(' ')} />`;
  });

  return `<matched-skills count="${matches.length}">\n${elements.join('\n')}\n</matched-skills>`;
}

/**
 * 构建完整的 Skill 上下文
 */
export async function buildSkillContext(
  loader: SkillLoader,
  userMessage: string
): Promise<SkillContext> {
  // 1. 加载所有 Skill 元数据
  const allSkills = await loader.loadAllMetadata();

  // 2. 基于用户消息匹配相关 Skill
  const matchedSkills = matchSkillsByMessage(allSkills, userMessage);

  // 3. 生成 XML 格式的元数据
  const allSkillsXml = formatSkillsAsXml(allSkills);

  return {
    allSkillsXml,
    matchedSkills,
    totalCount: allSkills.length,
  };
}

/**
 * 生成 Skill 上下文注入到系统提示词的内容
 */
export function generateSkillContextPrompt(context: SkillContext): string {
  const sections: string[] = [];

  // 1. 可用 Skill 列表（元数据）
  sections.push(`## 可用技能 (Skills)

以下是当前可用的技能列表。你可以使用 \`load_skill\` 工具加载任何技能的完整内容。

${context.allSkillsXml}`);

  // 2. 推荐的 Skill（基于用户消息匹配）
  if (context.matchedSkills.length > 0) {
    const matchedXml = formatMatchedSkillsAsXml(context.matchedSkills);
    sections.push(`### 推荐技能

基于用户消息，以下技能可能与当前任务相关：

${matchedXml}

**提示**: 如果推荐的技能与用户需求匹配，请使用 \`load_skill\` 工具加载完整内容后再执行任务。`);
  }

  return sections.join('\n\n');
}

// 辅助函数：分词
function tokenize(text: string): string[] {
  return text
    .split(/[\s,，。！？、；：""''（）【】\[\]{}]+/)
    .filter(t => t.length > 1);
}

// 辅助函数：XML 转义
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
