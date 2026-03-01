# User Story 4 架构更新说明

**更新日期**: 2026-01-06
**基于**: specs/001-agent-chat-platform/temp 额外说明

## 关键架构变更

### 1. Skill 存储架构调整

**原设计**：三层 Skill 都存储在数据库中

**新设计**：
- ✅ **Edge Function Skill**: 基于文件系统，不需要数据库表
- ✅ **设备 Skill**: 基于文件系统，不需要数据库表
- ✅ **Remote Skill**: 仅此层需要数据库表（用户自定义 Skill）

**理由**：
- Edge Function Skill 是系统内置能力，应该随代码部署
- 设备 Skill 存储在设备本地，通过配置文件管理
- 只有用户创建的 Remote Skill 需要数据库持久化

---

### 2. Claude Agent Skill 规格对齐

**核心要求**：三层 Skill 都需要与 Claude Agent Skill 规格一致

**Claude Agent Skill 标准格式**：

```markdown
# Skill Name

Brief description of what this skill does.

## When to Use

- Scenario 1
- Scenario 2

## Tools

### tool_name

Description of the tool.

**Parameters:**
- `param1` (string, required): Description
- `param2` (number, optional): Description

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

## Examples

### Example 1: Common Use Case

\`\`\`
User: "I want to..."
Agent: [Uses tool_name with...]
Result: ...
\`\`\`
```

---

### 3. 统一的 Skill 加载机制

**按需加载策略**：

```typescript
// Agent 启动时只加载 Skill 元数据
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: 'edge' | 'remote' | 'device';
  priority: number;
  tags: string[];
  triggerConditions: {
    keywords: string[];
    userIntent: string[];
  };
  // 不包含完整的 tools 和 resources 定义
}

// Agent 按需加载完整 Skill 内容
async function loadSkillContent(skillId: string): Promise<string> {
  // 返回 skill.md 的完整内容
  // Agent 可以解析 Markdown 获取 tools、resources、examples
}
```

**优势**：
- 减少初始上下文大小
- 支持动态加载
- 与 Claude Agent Skill 规格一致

---

### 4. 技术栈调整

**移除**：
- ❌ mcp-use（不再使用）

**新增**：
- ✅ @hono/mcp - Hono 的 MCP 传输层
- ✅ @mcp-ui/server - MCP UI Resource 创建工具
- ✅ @modelcontextprotocol/sdk/server/mcp.js - MCP Server 核心

**MiniApp MCP 服务实现栈**：
```
Supabase Edge Function
  ↓
Hono (HTTP 框架)
  ↓
@hono/mcp (StreamableHTTPTransport)
  ↓
@modelcontextprotocol/sdk (MCP Server)
  ↓
@mcp-ui/server (UI Resource)
```

---

## 更新后的架构图

```
┌─────────────────────────────────────────────────────────┐
│ Agent 启动                                               │
│ 1. 加载所有 Skill 元数据（轻量级）                       │
│ 2. 根据上下文选择相关 Skill                              │
│ 3. 按需加载 skill.md 内容                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Edge Function Skills (文件系统)                │
│ - 位置: supabase/functions/skills/*.md                  │
│ - 示例: a2ui-skill.md, image-gen-skill.md              │
│ - 加载: 直接读取文件系统                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Remote Skills (数据库)                         │
│ - 位置: PostgreSQL skills 表                            │
│ - 示例: 用户自定义 Skill、MiniApp Skill                 │
│ - 加载: 从数据库查询                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Device Skills (设备文件系统)                   │
│ - 位置: ~/.mango/skills/*.md                            │
│ - 示例: 本地文件操作、Git 操作                          │
│ - 加载: 通过设备 API 读取                                │
└─────────────────────────────────────────────────────────┘
```

---

**更新完成日期**: 2026-01-06
**下一步**: 更新具体实现方案
