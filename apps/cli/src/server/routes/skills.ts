/**
 * Skills Routes
 * T190: 设备 Skill 列表和内容端点
 */

import { Hono } from 'hono';
import { SkillSyncService } from '../lib/skill-sync';

const app = new Hono();

// 获取 Skill 列表
app.get('/', async (c) => {
  const syncService = c.get('skillSync') as SkillSyncService;
  const state = await syncService.getSyncState();

  return c.json({
    skills: state?.skills || [],
    lastSyncAt: state?.lastSyncAt,
  });
});

// 获取单个 Skill 内容
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const syncService = c.get('skillSync') as SkillSyncService;

  const content = await syncService.getCachedSkill(id);

  if (!content) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.json({ id, content });
});

export default app;
