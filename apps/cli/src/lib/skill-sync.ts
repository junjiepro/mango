/**
 * Skill Sync Service
 * T189: 设备 Skill 同步逻辑
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface SkillMetadata {
  id: string;
  name: string;
  version: string;
  hash: string;
  updatedAt: string;
}

interface SyncState {
  lastSyncAt: string;
  skills: SkillMetadata[];
}

export class SkillSyncService {
  private cacheDir: string;
  private syncStateFile: string;

  constructor(dataDir: string) {
    this.cacheDir = join(dataDir, 'skills');
    this.syncStateFile = join(dataDir, 'skill-sync-state.json');
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  async getSyncState(): Promise<SyncState | null> {
    if (!existsSync(this.syncStateFile)) {
      return null;
    }
    const content = await readFile(this.syncStateFile, 'utf-8');
    return JSON.parse(content);
  }

  async saveSyncState(state: SyncState): Promise<void> {
    await writeFile(this.syncStateFile, JSON.stringify(state, null, 2));
  }

  async cacheSkill(id: string, content: string): Promise<void> {
    const filePath = join(this.cacheDir, `${id}.md`);
    await writeFile(filePath, content);
  }

  async getCachedSkill(id: string): Promise<string | null> {
    const filePath = join(this.cacheDir, `${id}.md`);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFile(filePath, 'utf-8');
  }

  async syncSkills(
    remoteSkills: SkillMetadata[],
    fetchContent: (id: string) => Promise<string>
  ): Promise<{ added: number; updated: number }> {
    await this.initialize();

    const state = await this.getSyncState();
    const localSkills = new Map(state?.skills.map((s) => [s.id, s]) || []);

    let added = 0;
    let updated = 0;

    for (const remote of remoteSkills) {
      const local = localSkills.get(remote.id);

      if (!local || local.hash !== remote.hash) {
        const content = await fetchContent(remote.id);
        await this.cacheSkill(remote.id, content);

        if (!local) added++;
        else updated++;
      }
    }

    await this.saveSyncState({
      lastSyncAt: new Date().toISOString(),
      skills: remoteSkills,
    });

    return { added, updated };
  }
}
