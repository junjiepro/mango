# Skill 存储与加载架构 v3

**研究日期**: 2026-01-27
**目标**: 设计更优雅的三层 Skill 统一存储与加载方案

---

## 1. 现有设计问题分析

### 1.1 当前架构

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Edge Function Skills                               │
│ - 存储: supabase/functions/skills/*.md + _metadata.json    │
│ - 加载: Deno.readTextFile()                                 │
│ - 问题: 元数据与内容分离，需要手动同步                        │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Remote Skills                                      │
│ - 存储: PostgreSQL skills 表                                │
│ - 加载: supabase.from('skills').select()                   │
│ - 问题: 与 Edge Skills 加载逻辑完全不同                      │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Device Skills                                      │
│ - 存储: ~/.mango/skills/*.md                               │
│ - 加载: fetch(device_url + '/skills/' + id)                │
│ - 问题: 需要设备在线，延迟高                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **三套加载逻辑** | 每层都有独立的加载实现 | 代码重复，维护成本高 |
| **元数据不一致** | `_metadata.json` 与 Markdown 内容可能不同步 | 数据完整性风险 |
| **无统一缓存** | 每次请求都重新加载 | 性能损耗，延迟高 |
| **设备依赖** | Device Skills 需要设备在线 | 可用性降低 |
| **无版本控制** | Edge Skills 随代码部署，无法回滚 | 灵活性差 |

---

## 2. 优化方案：统一 Skill Registry

### 2.1 核心理念

**单一数据源 (Single Source of Truth)**：所有 Skill 元数据统一存储在 Supabase，内容按来源分布式存储。

```
┌─────────────────────────────────────────────────────────────┐
│                 Skill Registry (Supabase)                   │
│  - 统一元数据存储                                            │
│  - 统一查询接口                                              │
│  - 统一缓存策略                                              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Edge Storage  │    │ DB Storage    │    │Device Storage │
│ (文件系统)     │    │ (PostgreSQL)  │    │ (设备本地)    │
│ 内容: *.md    │    │ 内容: TEXT    │    │ 内容: *.md    │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 2.2 设计原则

1. **元数据集中，内容分布** - 元数据在数据库，内容按来源存储
2. **Markdown 自解析** - 从 Markdown 自动提取元数据，无需 `_metadata.json`
3. **统一加载接口** - 一个 `SkillLoader` 接口处理所有来源
4. **多层缓存** - Edge Cache → Memory Cache → Database
5. **离线优先** - Device Skills 元数据同步到云端，支持离线查询

---

## 3. 统一数据模型

### 3.1 Skill Registry 表（核心）

```sql
-- 统一的 Skill 注册表（元数据）
CREATE TABLE skill_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 标识
  skill_id TEXT NOT NULL UNIQUE,  -- 格式: edge:a2ui, remote:uuid, device:file-ops

  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',

  -- 分类
  category TEXT NOT NULL CHECK (category IN ('edge', 'remote', 'device')),
  skill_type TEXT CHECK (skill_type IN ('system', 'user', 'miniapp', 'extension')),

  -- 内容位置（根据 category 不同）
  content_ref JSONB NOT NULL,
  -- edge:   {"path": "skills/a2ui-skill.md"}
  -- remote: {"table": "skills", "id": "uuid"}
  -- device: {"device_id": "uuid", "path": "file-ops-skill.md"}

  -- 触发条件
  trigger_keywords TEXT[] DEFAULT '{}',
  trigger_patterns TEXT[] DEFAULT '{}',

  -- 依赖
  dependencies TEXT[] DEFAULT '{}',
  conflicts TEXT[] DEFAULT '{}',

  -- 优先级和标签
  priority INT DEFAULT 5,
  tags TEXT[] DEFAULT '{}',

  -- 语义向量
  embedding vector(1536),

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  content_hash TEXT  -- 内容哈希，用于缓存失效
);

-- 索引
CREATE INDEX idx_registry_category ON skill_registry(category);
CREATE INDEX idx_registry_active ON skill_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_registry_keywords ON skill_registry USING gin(trigger_keywords);
CREATE INDEX idx_registry_embedding ON skill_registry
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  WHERE embedding IS NOT NULL;
```

### 3.2 Skill 内容缓存表

```sql
-- Skill 内容缓存（减少重复加载）
CREATE TABLE skill_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL REFERENCES skill_registry(skill_id) ON DELETE CASCADE,

  -- 缓存内容
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- 缓存元数据
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  hit_count INT DEFAULT 0,

  UNIQUE(skill_id)
);

CREATE INDEX idx_cache_expires ON skill_content_cache(expires_at);
```

---

## 4. 统一加载器设计

### 4.1 核心接口

```typescript
// 统一 Skill 加载器接口
interface UnifiedSkillLoader {
  // 列出所有可用 Skill（仅元数据）
  listSkills(filter?: SkillFilter): Promise<SkillMetadata[]>;

  // 加载 Skill 内容
  loadContent(skillId: string): Promise<string>;

  // 语义搜索
  searchByIntent(intent: string, limit?: number): Promise<SkillMatch[]>;

  // 刷新缓存
  invalidateCache(skillId?: string): Promise<void>;
}

interface SkillMetadata {
  skillId: string;
  name: string;
  description: string;
  category: 'edge' | 'remote' | 'device';
  priority: number;
  tags: string[];
  triggerKeywords: string[];
}

interface SkillMatch {
  metadata: SkillMetadata;
  score: number;
  matchType: 'keyword' | 'semantic' | 'pattern';
}
```

### 4.2 统一加载器实现

```typescript
class UnifiedSkillLoaderImpl implements UnifiedSkillLoader {
  private supabase: SupabaseClient;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟

  async listSkills(filter?: SkillFilter): Promise<SkillMetadata[]> {
    // 1. 从 skill_registry 查询元数据
    let query = this.supabase
      .from('skill_registry')
      .select('*')
      .eq('is_active', true);

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    const { data } = await query;
    return data?.map(this.toMetadata) ?? [];
  }

  async loadContent(skillId: string): Promise<string> {
    // 1. 检查内存缓存
    const cached = this.memoryCache.get(skillId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.content;
    }

    // 2. 检查数据库缓存
    const dbCached = await this.loadFromDbCache(skillId);
    if (dbCached) {
      this.memoryCache.set(skillId, {
        content: dbCached,
        expiresAt: Date.now() + this.CACHE_TTL
      });
      return dbCached;
    }

    // 3. 从源加载
    const content = await this.loadFromSource(skillId);

    // 4. 更新缓存
    await this.updateCache(skillId, content);

    return content;
  }
}
```

### 4.3 分层内容加载策略

```typescript
private async loadFromSource(skillId: string): Promise<string> {
  const [category, id] = skillId.split(':');

  switch (category) {
    case 'edge':
      return this.loadEdgeContent(id);
    case 'remote':
      return this.loadRemoteContent(id);
    case 'device':
      return this.loadDeviceContent(id);
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

// Edge: 从 Edge Function 文件系统加载
private async loadEdgeContent(id: string): Promise<string> {
  const path = `./skills/${id}-skill.md`;
  return await Deno.readTextFile(path);
}

// Remote: 从数据库加载
private async loadRemoteContent(id: string): Promise<string> {
  const { data } = await this.supabase
    .from('skills')
    .select('skill_content')
    .eq('id', id)
    .single();
  return data?.skill_content ?? '';
}

// Device: 通过设备 API 加载
private async loadDeviceContent(id: string): Promise<string> {
  const registry = await this.getRegistry(`device:${id}`);
  const { device_id, path } = registry.content_ref;

  const binding = await this.getDeviceBinding(device_id);
  const response = await fetch(
    `${binding.device_url}/skills/${path}`,
    { headers: { Authorization: `Bearer ${binding.binding_code}` } }
  );

  return await response.text();
}
```

---

## 5. 多层缓存策略

### 5.1 缓存层次

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Memory Cache (Edge Function 内存)                  │
│ - TTL: 5 分钟                                               │
│ - 容量: LRU 20 个 Skill                                     │
│ - 命中率目标: 80%                                           │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Database Cache (skill_content_cache 表)           │
│ - TTL: 30 分钟                                              │
│ - 容量: 无限制                                              │
│ - 命中率目标: 95%                                           │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Source (文件系统/数据库/设备)                      │
│ - 始终最新                                                  │
│ - 延迟: Edge < Remote < Device                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 缓存失效策略

```typescript
// 基于内容哈希的缓存失效
async invalidateCache(skillId?: string): Promise<void> {
  if (skillId) {
    // 单个 Skill 失效
    this.memoryCache.delete(skillId);
    await this.supabase
      .from('skill_content_cache')
      .delete()
      .eq('skill_id', skillId);
  } else {
    // 全部失效
    this.memoryCache.clear();
    await this.supabase
      .from('skill_content_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}
```

---

## 6. Markdown 自解析（消除 _metadata.json）

### 6.1 从 Markdown 提取元数据

```typescript
interface ParsedSkill {
  name: string;
  description: string;
  version: string;
  keywords: string[];
  patterns: string[];
  dependencies: string[];
  priority: number;
  tags: string[];
}

function parseSkillMarkdown(content: string): ParsedSkill {
  const lines = content.split('\n');

  // 提取标题作为名称
  const name = lines.find(l => l.startsWith('# '))?.slice(2).trim() ?? '';

  // 提取描述（标题后的第一段）
  const descStart = lines.findIndex(l => l.startsWith('# ')) + 1;
  const descEnd = lines.findIndex((l, i) => i > descStart && l.startsWith('##'));
  const description = lines.slice(descStart, descEnd).join(' ').trim();

  // 提取 When to Use 部分作为触发模式
  const patterns = extractSection(content, 'When to Use')
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2));

  // 提取 Dependencies 部分
  const dependencies = extractSection(content, 'Dependencies')
    .filter(l => l.startsWith('- '))
    .map(l => l.match(/`([^`]+)`/)?.[1] ?? '');

  return { name, description, patterns, dependencies, /* ... */ };
}
```

### 6.2 Edge Skills 启动时自动注册

```typescript
// Edge Function 启动时同步 Skill 元数据到数据库
async function syncEdgeSkillsToRegistry(): Promise<void> {
  const skillFiles = await listSkillFiles('./skills');

  for (const file of skillFiles) {
    const content = await Deno.readTextFile(`./skills/${file}`);
    const parsed = parseSkillMarkdown(content);
    const hash = await computeHash(content);

    // Upsert 到 skill_registry
    await supabase.from('skill_registry').upsert({
      skill_id: `edge:${file.replace('-skill.md', '')}`,
      name: parsed.name,
      description: parsed.description,
      category: 'edge',
      skill_type: 'system',
      content_ref: { path: `skills/${file}` },
      trigger_keywords: parsed.keywords,
      trigger_patterns: parsed.patterns,
      dependencies: parsed.dependencies,
      content_hash: hash,
      updated_at: new Date().toISOString()
    }, { onConflict: 'skill_id' });
  }
}
```

---

## 7. Device Skills 离线同步

### 7.1 设备上线时同步元数据

```typescript
// CLI 启动时同步本地 Skill 元数据到云端
async function syncDeviceSkillsToCloud(
  bindingCode: string
): Promise<void> {
  const skillsDir = path.join(os.homedir(), '.mango', 'skills');
  const files = await fs.readdir(skillsDir);

  for (const file of files.filter(f => f.endsWith('.md'))) {
    const content = await fs.readFile(
      path.join(skillsDir, file), 'utf-8'
    );
    const parsed = parseSkillMarkdown(content);
    const hash = computeHash(content);

    // 同步到云端 registry
    await supabase.from('skill_registry').upsert({
      skill_id: `device:${file.replace('-skill.md', '')}`,
      name: parsed.name,
      description: parsed.description,
      category: 'device',
      content_ref: {
        device_id: deviceId,
        path: file
      },
      content_hash: hash
    }, { onConflict: 'skill_id' });
  }
}
```

### 7.2 设备离线时的降级策略

```typescript
async loadDeviceContent(id: string): Promise<string> {
  const registry = await this.getRegistry(`device:${id}`);

  // 1. 尝试从设备加载
  try {
    return await this.fetchFromDevice(registry);
  } catch (error) {
    // 2. 设备离线，尝试从缓存加载
    const cached = await this.loadFromDbCache(`device:${id}`);
    if (cached) {
      console.warn(`Device offline, using cached content for ${id}`);
      return cached;
    }

    // 3. 无缓存，抛出错误
    throw new Error(`Device offline and no cache for: ${id}`);
  }
}
```

---

## 8. 架构对比

### 8.1 v2 vs v3 对比

| 维度 | v2 设计 | v3 优化 |
|------|---------|---------|
| **元数据存储** | 分散（文件+数据库） | 统一（skill_registry） |
| **元数据来源** | `_metadata.json` 手动维护 | Markdown 自动解析 |
| **缓存策略** | 无 | 三层缓存（内存→数据库→源） |
| **设备离线** | 不可用 | 降级到缓存 |
| **查询接口** | 三套实现 | 统一 SkillLoader |
| **语义搜索** | 各层独立 | 统一 embedding 索引 |

### 8.2 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent 请求 Skill                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              UnifiedSkillLoader.listSkills()                │
│                              │                              │
│                              ▼                              │
│              skill_registry 表查询元数据                     │
│              (统一入口，支持语义搜索)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              UnifiedSkillLoader.loadContent()               │
│                              │                              │
│         ┌────────────────────┼────────────────────┐         │
│         ▼                    ▼                    ▼         │
│   Memory Cache         DB Cache              Source         │
│   (5min TTL)          (30min TTL)         (实时加载)        │
│         │                    │                    │         │
│         └────────────────────┴────────────────────┘         │
│                              │                              │
│                              ▼                              │
│                     返回 Skill 内容                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Supabase Edge Function 环境限制分析

### 9.1 环境特性

| 特性 | 限制 | 影响 |
|------|------|------|
| **文件系统** | 只读，部署时打包 | Edge Skills 必须打包到函数中 |
| **内存** | 150MB 限制 | 内存缓存容量有限 |
| **状态** | 无状态，每次请求独立 | 内存缓存无法跨请求持久化 |
| **冷启动** | 有延迟 | 首次请求需要初始化 |
| **执行时间** | 60s 默认 | 长时间操作需要分片 |

### 9.2 对 v3 设计的影响

```
原设计假设                    实际限制                     调整方案
─────────────────────────────────────────────────────────────────
内存缓存跨请求持久化    →    每次请求内存重置      →    依赖数据库缓存
启动时同步 Edge Skills  →    无持久化写入能力      →    部署时预生成
动态读取文件系统        →    只能读取打包的文件    →    构建时打包
```

---

## 10. 调整后的架构设计

### 10.1 Edge Function 适配方案

```
┌─────────────────────────────────────────────────────────────┐
│                    构建时 (Build Time)                       │
│  1. 扫描 skills/*.md 文件                                   │
│  2. 解析 Markdown 提取元数据                                 │
│  3. 生成 skill-manifest.json（打包到函数中）                 │
│  4. 计算内容哈希                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    部署时 (Deploy Time)                      │
│  1. Edge Function 部署，包含 skill-manifest.json            │
│  2. 首次请求时，将 manifest 同步到 skill_registry           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    运行时 (Runtime)                          │
│  1. 从 skill_registry 查询元数据（数据库）                   │
│  2. 从 skill_content_cache 查询缓存（数据库）                │
│  3. 缓存未命中时，从源加载并写入缓存                         │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 构建时脚本

```typescript
// scripts/build-skill-manifest.ts
// 在 CI/CD 构建阶段执行

import { walk } from "https://deno.land/std/fs/walk.ts";
import { crypto } from "https://deno.land/std/crypto/mod.ts";

interface SkillManifestEntry {
  skillId: string;
  name: string;
  description: string;
  version: string;
  keywords: string[];
  patterns: string[];
  dependencies: string[];
  priority: number;
  contentHash: string;
}

async function buildManifest(): Promise<void> {
  const manifest: SkillManifestEntry[] = [];
  const skillsDir = "./supabase/functions/skills";

  for await (const entry of walk(skillsDir, { exts: [".md"] })) {
    const content = await Deno.readTextFile(entry.path);
    const parsed = parseSkillMarkdown(content);
    const hash = await computeHash(content);

    manifest.push({
      skillId: `edge:${entry.name.replace("-skill.md", "")}`,
      ...parsed,
      contentHash: hash,
    });
  }

  // 写入 manifest 文件（将被打包到 Edge Function）
  await Deno.writeTextFile(
    "./supabase/functions/process-agent/skill-manifest.json",
    JSON.stringify(manifest, null, 2)
  );
}
```

### 10.3 运行时加载器（适配 Edge Function）

```typescript
// Edge Function 内的加载器
class EdgeFunctionSkillLoader {
  private manifest: SkillManifestEntry[];
  private supabase: SupabaseClient;
  private initialized = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // 从打包的文件加载 manifest
    this.manifest = JSON.parse(
      Deno.readTextFileSync("./skill-manifest.json")
    );
  }

  // 首次请求时同步 manifest 到数据库
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    for (const entry of this.manifest) {
      await this.supabase.from('skill_registry').upsert({
        skill_id: entry.skillId,
        name: entry.name,
        description: entry.description,
        category: 'edge',
        content_hash: entry.contentHash,
        trigger_keywords: entry.keywords,
        updated_at: new Date().toISOString()
      }, { onConflict: 'skill_id' });
    }

    this.initialized = true;
  }

  // 加载 Edge Skill 内容
  async loadEdgeContent(skillId: string): Promise<string> {
    const id = skillId.replace('edge:', '');

    // 1. 先查数据库缓存
    const { data: cached } = await this.supabase
      .from('skill_content_cache')
      .select('content')
      .eq('skill_id', skillId)
      .single();

    if (cached) return cached.content;

    // 2. 从打包的文件读取
    const content = Deno.readTextFileSync(`./skills/${id}-skill.md`);

    // 3. 写入数据库缓存
    await this.supabase.from('skill_content_cache').upsert({
      skill_id: skillId,
      content,
      cached_at: new Date().toISOString()
    });

    return content;
  }
}
```

### 10.4 缓存策略调整

由于 Edge Function 无状态，缓存策略调整为：

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: 请求内缓存 (Request Scope)                         │
│ - 生命周期: 单次请求                                         │
│ - 用途: 避免同一请求内重复查询                               │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: 数据库缓存 (skill_content_cache)                   │
│ - TTL: 30 分钟                                              │
│ - 用途: 跨请求持久化缓存                                     │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: 源 (打包文件/数据库/设备)                          │
│ - 始终最新                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 实施建议

### 11.1 迁移步骤

1. **创建 skill_registry 表** - 统一元数据存储
2. **实现 Markdown 解析器** - 自动提取元数据
3. **Edge Skills 启动同步** - 部署时自动注册
4. **实现统一 SkillLoader** - 替换三套加载逻辑
5. **添加缓存层** - 内存 + 数据库缓存
6. **Device Skills 同步** - CLI 上线时同步元数据

### 11.2 关键收益

| 收益 | 预期效果 |
|------|----------|
| 代码简化 | 三套加载逻辑 → 一套统一接口 |
| 性能提升 | 缓存命中率 80%+，延迟降低 60% |
| 可维护性 | 消除 `_metadata.json`，单一数据源 |
| 可用性 | Device Skills 离线降级支持 |

---

**文档版本**: 3.0.0
**最后更新**: 2026-01-27
**下一步**: 更新 data-model.md 添加 skill_registry 表
