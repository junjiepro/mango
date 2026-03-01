/**
 * build-skill-manifest.mjs
 * 构建时生成 skill-manifest.json
 *
 * 用法: node scripts/build-skill-manifest.mjs
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(__dirname, '../supabase/functions/skills');
const OUTPUT_PATH = path.join(__dirname, '../supabase/functions/process-agent-message/skill-manifest.json');

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parseSkillMarkdown(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterEnd = 0;
  const frontmatterLines = [];

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

  const metadata = {};
  for (const line of frontmatterLines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value && value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else if (value) {
        metadata[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  const bodyContent = lines.slice(frontmatterEnd + 1).join('\n');
  const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
  const name = metadata.name || (titleMatch ? titleMatch[1].trim() : null);

  if (!name) return null;

  let description = metadata.description || '';
  if (!description && titleMatch) {
    const afterTitle = bodyContent.slice(bodyContent.indexOf(titleMatch[0]) + titleMatch[0].length);
    const descMatch = afterTitle.match(/^\s*\n+([^#\n][^\n]+)/);
    description = descMatch ? descMatch[1].trim() : '';
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

async function buildManifest() {
  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('Skills directory not found, creating empty manifest');
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));

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

  const manifest = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    skills,
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${OUTPUT_PATH}`);
  console.log(`Total: ${skills.length} skills`);
}

buildManifest().catch(console.error);
