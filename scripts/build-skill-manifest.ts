/**
 * build-skill-manifest.ts
 * 构建时生成 skill-manifest.json
 *
 * 用法: npx ts-node scripts/build-skill-manifest.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface SkillManifestEntry {
  skill_id: string;
  name: string;
  description: string;
  category: 'edge' | 'remote' | 'device';
  keywords: string[];
  triggers: string[];
  tags: string[];
  priority: number;
  content: string;  // 完整内容打包到 manifest
  content_hash: string;
}

interface SkillManifest {
  version: string;
  generated_at: string;
  skills: SkillManifestEntry[];
}

const SKILLS_DIR = path.join(__dirname, '../supabase/functions/skills');
const OUTPUT_PATH = path.join(__dirname, '../supabase/functions/process-agent-message/skill-manifest.json');

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

interface ParsedSkill {
  name: string;
  description: string;
  keywords: string[];
  triggers: string[];
  tags: string[];
  priority: number;
}

function parseSkillMarkdown(content: string): ParsedSkill | null {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterEnd = 0;
  const frontmatterLines: string[] = [];

  // 解析 YAML frontmatter
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(lines[i]);
    }
  }

  // 简单解析 YAML
  const metadata: Record<string, any> = {};
  for (const line of frontmatterLines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        metadata[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  // 从 Markdown 提取标题和描述
  const bodyContent = lines.slice(frontmatterEnd + 1).join('\n');
  const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
  const name = metadata.name || titleMatch?.[1]?.trim() || null;

  if (!name) return null;

  let description = metadata.description || '';
  if (!description && titleMatch) {
    const afterTitle = bodyContent.slice(bodyContent.indexOf(titleMatch[0]) + titleMatch[0].length);
    const descMatch = afterTitle.match(/^\s*\n+([^#\n][^\n]+)/);
    description = descMatch?.[1]?.trim() || '';
  }

  return {
    name,
    description,
    keywords: metadata.keywords || [],
    triggers: metadata.triggers || [],
    tags: metadata.tags || [],
    priority: parseInt(metadata.priority) || 5,
  };
}

async function buildManifest(): Promise<void> {
  const skills: SkillManifestEntry[] = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('Skills directory not found, creating empty manifest');
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SKILLS_DIR)
    .filter(f => f.endsWith('.md'));

  console.log(`Found ${files.length} skill files`);

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseSkillMarkdown(content);

    if (!parsed) {
      console.warn(`  Skipping ${file}: invalid format`);
      continue;
    }

    const skillId = `edge:${file.replace('.md', '').replace(/-skill$/, '')}`;

    skills.push({
      skill_id: skillId,
      name: parsed.name,
      description: parsed.description,
      category: 'edge',
      keywords: parsed.keywords,
      triggers: parsed.triggers,
      tags: parsed.tags,
      priority: parsed.priority,
      content,
      content_hash: hashContent(content),
    });

    console.log(`  + ${skillId}: ${parsed.name}`);
  }

  const manifest: SkillManifest = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    skills,
  };

  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${OUTPUT_PATH}`);
  console.log(`Total: ${skills.length} skills`);
}

buildManifest().catch(console.error);
