/**
 * Offline Skill Cache
 * T191: CLI 离线 Skill 缓存支持
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface CachedSkill {
  id: string;
  name: string;
  content: string;
  hash: string;
  cachedAt: string;
}

export class OfflineSkillCache {
  private cacheDir: string;
  private indexFile: string;

  constructor(dataDir: string) {
    this.cacheDir = join(dataDir, 'offline-skills');
    this.indexFile = join(this.cacheDir, 'index.json');
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  async getIndex(): Promise<Map<string, CachedSkill>> {
    if (!existsSync(this.indexFile)) {
      return new Map();
    }
    const content = await readFile(this.indexFile, 'utf-8');
    const arr = JSON.parse(content) as CachedSkill[];
    return new Map(arr.map((s) => [s.id, s]));
  }

  async saveIndex(index: Map<string, CachedSkill>): Promise<void> {
    await writeFile(
      this.indexFile,
      JSON.stringify(Array.from(index.values()), null, 2)
    );
  }

  async cacheSkill(id: string, name: string, content: string): Promise<void> {
    await this.initialize();
    const hash = createHash('md5').update(content).digest('hex');
    const filePath = join(this.cacheDir, `${id}.md`);

    await writeFile(filePath, content);

    const index = await this.getIndex();
    index.set(id, {
      id,
      name,
      content: filePath,
      hash,
      cachedAt: new Date().toISOString(),
    });
    await this.saveIndex(index);
  }

  async getSkill(id: string): Promise<string | null> {
    const filePath = join(this.cacheDir, `${id}.md`);
    if (!existsSync(filePath)) return null;
    return readFile(filePath, 'utf-8');
  }

  async listSkills(): Promise<CachedSkill[]> {
    const index = await this.getIndex();
    return Array.from(index.values());
  }
}
