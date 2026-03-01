/**
 * SkillMarkdownParser - Skill Markdown 解析器
 * 从 Markdown 文件中提取 Skill 元数据
 */

interface ParsedSkill {
  name: string;
  description: string;
  whenToUse: string[];
  tools: ParsedTool[];
  tags: string[];
}

interface ParsedTool {
  name: string;
  description: string;
  parameters: ParsedParameter[];
  returns: string;
}

interface ParsedParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export class SkillMarkdownParser {
  /**
   * 解析 Skill Markdown 内容
   */
  parse(content: string): ParsedSkill | null {
    try {
      const name = this.extractName(content);
      if (!name) return null;

      return {
        name,
        description: this.extractDescription(content),
        whenToUse: this.extractWhenToUse(content),
        tools: this.extractTools(content),
        tags: this.extractTags(content),
      };
    } catch {
      return null;
    }
  }

  private extractName(content: string): string | null {
    const match = content.match(/^#\s+(.+)/m);
    return match ? match[1].trim() : null;
  }

  private extractDescription(content: string): string {
    const match = content.match(/## Description\s*\n([\s\S]*?)(?=\n##|$)/);
    return match ? match[1].trim() : '';
  }

  private extractWhenToUse(content: string): string[] {
    const match = content.match(/## When to Use\s*\n([\s\S]*?)(?=\n##|$)/);
    if (!match) return [];

    const lines = match[1].split('\n');
    return lines
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }

  private extractTools(content: string): ParsedTool[] {
    const toolsSection = content.match(/## Tools\s*\n([\s\S]*?)(?=\n## Examples|$)/);
    if (!toolsSection) return [];

    const tools: ParsedTool[] = [];
    const toolMatches = toolsSection[1].matchAll(/### (\w+)\s*\n([\s\S]*?)(?=\n###|$)/g);

    for (const match of toolMatches) {
      tools.push({
        name: match[1],
        description: this.extractToolDescription(match[2]),
        parameters: this.extractParameters(match[2]),
        returns: this.extractReturns(match[2]),
      });
    }

    return tools;
  }

  private extractToolDescription(toolContent: string): string {
    const match = toolContent.match(/\*\*Description\*\*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractParameters(toolContent: string): ParsedParameter[] {
    const params: ParsedParameter[] = [];
    const paramSection = toolContent.match(/\*\*Parameters\*\*:\s*\n([\s\S]*?)(?=\n\*\*|$)/);
    if (!paramSection) return params;

    const lines = paramSection[1].split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of lines) {
      const match = line.match(/`(\w+)`\s*\((\w+),\s*(required|optional)\):\s*(.+)/);
      if (match) {
        params.push({
          name: match[1],
          type: match[2],
          required: match[3] === 'required',
          description: match[4].trim(),
        });
      }
    }

    return params;
  }

  private extractReturns(toolContent: string): string {
    const match = toolContent.match(/\*\*Returns\*\*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractTags(content: string): string[] {
    const match = content.match(/## Tags\s*\n([\s\S]*?)(?=\n##|$)/);
    if (!match) return [];

    return match[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }
}

export default SkillMarkdownParser;
