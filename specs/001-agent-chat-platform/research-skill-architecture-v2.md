# Skill 架构优化设计 v2

**研究日期**: 2026-01-26
**基于**: research.md 第 13 节、skill-creator 最佳实践
**目标**: 优化三层 Skill 架构，提升可扩展性和智能化程度

---

## 1. 架构优化概览

### 1.1 优化前后对比

| 维度 | v1 设计 | v2 优化 |
|------|---------|---------|
| **触发机制** | 关键词 + 意图匹配 | 语义向量 + 上下文感知 + 条件组合 |
| **版本管理** | 无 | 支持版本历史和回滚 |
| **Skill 组合** | 不支持 | 支持 Skill 编排和依赖声明 |
| **Extension Skills** | 独立存储 | 整合为 Remote Skills 子类型 |
| **元数据** | 静态 JSON | 动态计算 + 使用统计 |
| **加载策略** | 按需加载 | 智能预加载 + 缓存 |

### 1.2 优化后的三层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skill 调度层 (Skill Orchestrator)            │
│  - 语义匹配引擎 (pgvector)                                       │
│  - 上下文感知选择                                                │
│  - Skill 组合编排                                                │
│  - 智能预加载                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Edge Function Skills                                   │
│ - 系统内置能力（A2UI、图片生成、MiniApp 管理）                   │
│ - 文件系统存储，版本随代码部署                                   │
│ - 优先级: 最高（系统级）                                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Remote Skills                                          │
│ ├── User Skills: 用户自定义 Skill                               │
│ ├── MiniApp Skills: MiniApp 提供的 Skill                        │
│ └── Extension Skills: 基于反馈自动生成的 Skill                  │
│ - 数据库存储，支持版本管理                                       │
│ - 优先级: 中等（用户级）                                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Device Skills                                          │
│ - 本地设备能力（文件操作、Git、终端）                            │
│ - 设备文件系统存储                                               │
│ - 优先级: 按需（设备级）                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 增强的 Skill Markdown 格式

### 2.1 扩展的 Skill 规格

```markdown
# Skill Name

Brief description of what this skill does.

## Metadata

- **Version**: 1.0.0
- **Author**: system | user_id
- **Category**: edge | remote | device
- **Priority**: 1-10 (higher = more important)
- **Tags**: [tag1, tag2]

## When to Use

Describe scenarios when this skill should be activated.

### Trigger Conditions

- **Keywords**: [keyword1, keyword2]
- **Intent Patterns**: [pattern1, pattern2]
- **Context Requirements**:
  - Has active device binding: true/false
  - Conversation type: general | coding | data-analysis
  - Previous tools used: [tool1, tool2]

### Anti-Patterns (When NOT to Use)

- Scenario where this skill should NOT be used
- Conflicts with other skills

## Dependencies

### Required Skills

- `edge:a2ui` - For UI rendering
- `device:file-ops` - For file access

### Optional Skills

- `remote:data-viz` - Enhanced visualization

## Tools

### tool_name

Description of the tool.

**Parameters:**
- `param1` (string, required): Description
- `param2` (number, optional): Description

**Returns:**
- Success: `{ result: ... }`
- Error: `{ error: string, code: number }`

**Example:**
\`\`\`json
{
  "param1": "value",
  "param2": 123
}
\`\`\`

## Resources

### resource_uri

Description of the resource.

**URI Pattern:** `resource://namespace/path`
**MIME Type:** application/json

## Examples

### Example 1: Common Use Case

**User Intent:** "I want to..."
**Context:** { relevant context }

\`\`\`
User: "..."
Agent: [Uses tool_name with...]
Result: ...
\`\`\`

## Version History

- **1.0.0** (2026-01-26): Initial version
- **1.1.0** (2026-02-01): Added new tool
```

---

## 3. Skill 调度层设计

### 3.1 语义匹配引擎

```typescript
interface SkillMatcher {
  // 基于语义向量的 Skill 匹配
  async matchBySemantics(
    userIntent: string,
    context: ConversationContext
  ): Promise<SkillMatch[]>;

  // 基于规则的 Skill 匹配
  matchByRules(
    message: string,
    context: ConversationContext
  ): SkillMatch[];

  // 组合匹配（语义 + 规则）
  async match(
    message: string,
    context: ConversationContext
  ): Promise<SkillMatch[]>;
}

interface SkillMatch {
  skillId: string;
  score: number;           // 0-1 匹配分数
  matchType: 'semantic' | 'rule' | 'hybrid';
  reason: string;          // 匹配原因（可解释性）
}
```

### 3.2 上下文感知选择

```typescript
interface ContextAwareSelector {
  // 根据上下文过滤和排序 Skill
  select(
    matches: SkillMatch[],
    context: ConversationContext
  ): SkillSelection;
}

interface ConversationContext {
  // 对话上下文
  conversationType: 'general' | 'coding' | 'data-analysis';
  recentTools: string[];           // 最近使用的工具
  activeSkills: string[];          // 当前激活的 Skill

  // 设备上下文
  hasDeviceBinding: boolean;
  deviceCapabilities: string[];    // 设备支持的能力

  // 用户上下文
  userPreferences: UserPreferences;
  extensionSkills: ExtensionSkill[]; // 用户的扩展 Skill
}

interface SkillSelection {
  primary: SkillMatch;             // 主要 Skill
  supporting: SkillMatch[];        // 辅助 Skill
  preload: string[];               // 预加载的 Skill ID
}
```

### 3.3 Skill 组合编排

```typescript
interface SkillOrchestrator {
  // 解析 Skill 依赖
  resolveDependencies(skillId: string): Promise<SkillDependencyGraph>;

  // 编排多个 Skill 的执行顺序
  orchestrate(skills: string[]): Promise<SkillExecutionPlan>;

  // 执行 Skill 组合
  execute(plan: SkillExecutionPlan, context: ConversationContext): Promise<SkillResult>;
}

interface SkillDependencyGraph {
  root: string;
  required: Map<string, SkillMetadata>;
  optional: Map<string, SkillMetadata>;
  conflicts: string[];  // 冲突的 Skill
}

interface SkillExecutionPlan {
  steps: SkillExecutionStep[];
  parallel: string[][];  // 可并行执行的 Skill 组
}
```

---

## 4. 数据模型优化

### 4.1 统一的 skills 表（支持版本管理）

```sql
-- 优化后的 skills 表
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL CHECK (
    skill_type IN ('user', 'miniapp', 'extension')
  ),

  -- 所有者
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  miniapp_id UUID REFERENCES mini_apps(id) ON DELETE CASCADE,

  -- 版本管理
  version TEXT NOT NULL DEFAULT '1.0.0',
  version_history JSONB DEFAULT '[]',

  -- Skill 内容
  skill_content TEXT NOT NULL,  -- Markdown 格式

  -- 语义向量（用于智能匹配）
  description_embedding vector(1536),

  -- 触发条件
  trigger_conditions JSONB DEFAULT '{
    "keywords": [],
    "intentPatterns": [],
    "contextRequirements": {}
  }',

  -- 依赖声明
  dependencies JSONB DEFAULT '{
    "required": [],
    "optional": [],
    "conflicts": []
  }',

  -- 元数据
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags TEXT[] DEFAULT '{}',

  -- 使用统计
  usage_stats JSONB DEFAULT '{
    "callCount": 0,
    "successCount": 0,
    "avgExecutionTimeMs": 0,
    "lastUsedAt": null
  }',

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_owner CHECK (
    (skill_type = 'user' AND user_id IS NOT NULL) OR
    (skill_type = 'miniapp' AND miniapp_id IS NOT NULL) OR
    (skill_type = 'extension' AND user_id IS NOT NULL)
  )
);

-- 语义搜索索引
CREATE INDEX idx_skills_embedding ON skills
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE description_embedding IS NOT NULL;

-- 常规索引
CREATE INDEX idx_skills_user ON skills(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_skills_miniapp ON skills(miniapp_id) WHERE miniapp_id IS NOT NULL;
CREATE INDEX idx_skills_type ON skills(skill_type);
CREATE INDEX idx_skills_active ON skills(is_active) WHERE is_active = true;
CREATE INDEX idx_skills_tags ON skills USING gin(tags);
```

### 4.2 Skill 版本历史表

```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  -- 版本信息
  version TEXT NOT NULL,
  skill_content TEXT NOT NULL,
  change_summary TEXT,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 约束
  UNIQUE (skill_id, version)
);

CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id, created_at DESC);
```

### 4.3 Skill 执行日志表

```sql
CREATE TABLE skill_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_category TEXT NOT NULL,  -- edge | remote | device
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 执行信息
  trigger_type TEXT NOT NULL,  -- semantic | rule | manual
  match_score FLOAT,
  match_reason TEXT,

  -- 结果
  success BOOLEAN NOT NULL,
  execution_time_ms INT NOT NULL,
  error_message TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_logs_skill ON skill_execution_logs(skill_id, created_at DESC);
CREATE INDEX idx_skill_logs_user ON skill_execution_logs(user_id, created_at DESC);
```

---

## 5. Edge Function Skills 优化

### 5.1 元数据索引格式优化

```json
// supabase/functions/skills/_metadata.json
{
  "version": "2.0.0",
  "skills": [
    {
      "id": "edge:a2ui",
      "name": "A2UI 界面生成",
      "description": "生成富交互用户界面组件",
      "file": "a2ui-skill.md",
      "version": "1.2.0",
      "priority": 8,
      "tags": ["ui", "form", "chart", "interactive"],
      "triggerConditions": {
        "keywords": ["表单", "图表", "界面", "form", "chart"],
        "intentPatterns": ["创建.*界面", "生成.*表单", "展示.*数据"],
        "contextRequirements": {}
      },
      "dependencies": {
        "required": [],
        "optional": ["edge:image-gen"],
        "conflicts": []
      },
      "descriptionEmbedding": null  // 运行时计算并缓存
    },
    {
      "id": "edge:miniapp-manager",
      "name": "MiniApp 管理",
      "description": "管理和调用 MiniApp",
      "file": "miniapp-skill.md",
      "version": "1.0.0",
      "priority": 7,
      "tags": ["miniapp", "extension"],
      "triggerConditions": {
        "keywords": ["小应用", "miniapp", "插件"],
        "intentPatterns": ["安装.*应用", "使用.*插件"],
        "contextRequirements": {}
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "conflicts": []
      }
    }
  ]
}
```

### 5.2 Edge Skill 加载器优化

```typescript
class EdgeSkillLoader {
  private cache: Map<string, SkillContent> = new Map();
  private metadataCache: SkillMetadata[] | null = null;

  // 加载元数据（启动时调用）
  async loadMetadata(): Promise<SkillMetadata[]> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    const metadataPath = './skills/_metadata.json';
    const metadata = await Deno.readTextFile(metadataPath);
    this.metadataCache = JSON.parse(metadata).skills;

    return this.metadataCache;
  }

  // 加载 Skill 内容（按需调用）
  async loadContent(skillId: string): Promise<string> {
    // 检查缓存
    if (this.cache.has(skillId)) {
      return this.cache.get(skillId)!.content;
    }

    const metadata = await this.getMetadata(skillId);
    const content = await Deno.readTextFile(`./skills/${metadata.file}`);

    // 缓存内容
    this.cache.set(skillId, {
      content,
      loadedAt: Date.now(),
      version: metadata.version
    });

    return content;
  }

  // 预加载常用 Skill
  async preload(skillIds: string[]): Promise<void> {
    await Promise.all(
      skillIds.map(id => this.loadContent(id))
    );
  }
}
```

---

## 6. Device Skills 优化

### 6.1 设备 Skill 发现机制

```typescript
interface DeviceSkillDiscovery {
  // 扫描设备上的 Skill
  async discover(deviceUrl: string, bindingCode: string): Promise<SkillMetadata[]>;

  // 监听 Skill 变更
  watch(deviceUrl: string, callback: (changes: SkillChange[]) => void): void;
}

// CLI 端实现
class LocalSkillScanner {
  private skillsDir = path.join(os.homedir(), '.mango', 'skills');

  async scan(): Promise<SkillMetadata[]> {
    const files = await fs.readdir(this.skillsDir);
    const skills: SkillMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('-skill.md')) {
        const content = await fs.readFile(
          path.join(this.skillsDir, file),
          'utf-8'
        );
        const metadata = this.parseMetadata(content, file);
        skills.push(metadata);
      }
    }

    return skills;
  }

  private parseMetadata(content: string, filename: string): SkillMetadata {
    // 解析 Markdown 中的 Metadata 部分
    const metadataMatch = content.match(/## Metadata\n([\s\S]*?)(?=\n## )/);
    // ... 解析逻辑
  }
}
```

### 6.2 设备 Skill 同步

```typescript
// 设备 Skill 元数据同步到云端（用于跨设备查询）
interface DeviceSkillSync {
  // 上报设备 Skill 元数据
  async syncMetadata(
    bindingId: string,
    skills: SkillMetadata[]
  ): Promise<void>;

  // 获取用户所有设备的 Skill
  async getAllDeviceSkills(userId: string): Promise<DeviceSkillInfo[]>;
}

interface DeviceSkillInfo {
  deviceId: string;
  deviceName: string;
  skills: SkillMetadata[];
  lastSyncAt: Date;
}
```

---

## 7. Extension Skills 整合

### 7.1 Extension Skills 作为 Remote Skills 子类型

```typescript
// Extension Skill 生成器（优化版）
class OptimizedExtensionSkillGenerator {
  async generateFromFeedback(
    userId: string,
    feedbacks: FeedbackRecord[]
  ): Promise<void> {
    // 1. 使用语义聚类（pgvector）
    const clusters = await this.semanticCluster(feedbacks);

    for (const cluster of clusters) {
      if (cluster.size < 5) continue;

      // 2. 生成 Skill Markdown
      const skillContent = this.generateSkillMarkdown(cluster);

      // 3. 计算描述向量
      const embedding = await this.computeEmbedding(cluster.description);

      // 4. 存储为 Remote Skill
      await this.saveAsRemoteSkill({
        userId,
        skillType: 'extension',
        name: cluster.name,
        description: cluster.description,
        skillContent,
        descriptionEmbedding: embedding,
        triggerConditions: {
          intentPatterns: cluster.intentPatterns,
          contextRequirements: cluster.contextRequirements
        }
      });
    }
  }

  private generateSkillMarkdown(cluster: FeedbackCluster): string {
    const isGood = cluster.avgRating >= 4;

    return `# ${isGood ? '推荐做法' : '避免做法'}: ${cluster.intent}

${cluster.description}

## Metadata

- **Version**: 1.0.0
- **Author**: system
- **Category**: remote
- **Priority**: ${isGood ? 7 : 9}
- **Tags**: [extension, ${isGood ? 'good-practice' : 'bad-practice'}]

## When to Use

当用户意图涉及「${cluster.intent}」时，${isGood ? '推荐' : '避免'}以下做法。

### Trigger Conditions

- **Intent Patterns**: ${JSON.stringify(cluster.intentPatterns)}
- **Context Requirements**: ${JSON.stringify(cluster.contextRequirements)}

${isGood ? '' : `### Anti-Patterns (When NOT to Use)

此 Skill 描述的是应该避免的做法，不要在正常情况下使用。
`}

## ${isGood ? '推荐案例' : '失败案例'}

${cluster.examples.map((ex, i) => `
### 案例 ${i + 1}

**用户意图**: ${ex.userIntent}
**Agent 行为**: ${ex.agentAction}
**结果**: ${ex.outcome}
**评分**: ${ex.rating}/5
`).join('\n')}

## Version History

- **1.0.0** (${new Date().toISOString().split('T')[0]}): 基于 ${cluster.size} 条反馈自动生成
`;
  }
}
```

---

## 8. 智能预加载策略

### 8.1 预加载决策器

```typescript
interface PreloadDecider {
  // 根据上下文决定预加载哪些 Skill
  decide(context: ConversationContext): Promise<string[]>;
}

class SmartPreloadDecider implements PreloadDecider {
  async decide(context: ConversationContext): Promise<string[]> {
    const preloadList: string[] = [];

    // 1. 基于对话类型预加载
    if (context.conversationType === 'coding') {
      preloadList.push('device:file-ops', 'device:git-ops');
    }

    // 2. 基于最近使用预加载
    const recentSkills = await this.getRecentlyUsedSkills(context.userId);
    preloadList.push(...recentSkills.slice(0, 3));

    // 3. 基于用户偏好预加载
    const preferredSkills = context.userPreferences.favoriteSkills || [];
    preloadList.push(...preferredSkills);

    // 4. 去重并限制数量
    return [...new Set(preloadList)].slice(0, 5);
  }
}
```

### 8.2 缓存策略

```typescript
interface SkillCache {
  // LRU 缓存，最多保留 20 个 Skill
  maxSize: 20;

  // 缓存过期时间
  ttl: {
    edge: Infinity,      // Edge Skill 永不过期
    remote: 5 * 60 * 1000,  // Remote Skill 5 分钟
    device: 2 * 60 * 1000   // Device Skill 2 分钟
  };

  // 缓存命中统计
  stats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}
```

---

## 9. 实施计划

### 9.1 迁移步骤

1. **Phase 1**: 数据模型迁移
   - 创建新的 `skills` 表（支持版本管理）
   - 创建 `skill_versions` 表
   - 创建 `skill_execution_logs` 表
   - 迁移现有 Extension Skills 数据

2. **Phase 2**: Edge Skills 优化
   - 更新 `_metadata.json` 格式
   - 实现新的 EdgeSkillLoader
   - 添加预加载机制

3. **Phase 3**: Skill 调度层
   - 实现语义匹配引擎
   - 实现上下文感知选择
   - 实现 Skill 组合编排

4. **Phase 4**: Device Skills 优化
   - 实现 Skill 发现机制
   - 实现元数据同步

### 9.2 兼容性考虑

- 保持现有 Skill Markdown 格式向后兼容
- 新增字段使用默认值
- 渐进式迁移，不影响现有功能

---

**文档版本**: 2.0.0
**最后更新**: 2026-01-26
**下一步**: 更新 tasks.md 添加实施任务
