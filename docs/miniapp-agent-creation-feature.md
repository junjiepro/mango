# MiniApp Agent 创建和更新功能实现报告

**日期**: 2025-12-18
**版本**: v1.0
**状态**: ✅ 已完成

---

## 执行摘要

本次更新为 Agent 添加了创建和更新 MiniApp 的能力,使 Agent 能够根据用户需求动态创建小应用,并在需要时更新现有小应用。这是 MiniApp 生态系统的重要里程碑,实现了真正的"AI 驱动的应用生成"。

### 核心成果

- ✅ **create_miniapp 工具**: Agent 可以创建新的小应用
- ✅ **update_miniapp 工具**: Agent 可以更新现有小应用
- ✅ **智能系统提示词**: 详细的创建指南和最佳实践
- ✅ **自动安装**: 创建后自动为用户安装
- ✅ **完整审计**: 记录所有创建和更新操作

---

## 功能详情

### 1. create_miniapp 工具 ✅

#### 功能描述
允许 Agent 根据用户需求创建新的小应用,并自动为当前用户安装。

#### 参数定义

```typescript
{
  name: string;              // 唯一标识名称(字母、数字、下划线、连字符)
  display_name: string;      // 显示名称
  description: string;       // 功能描述
  code: string;              // JavaScript 代码
  icon_url?: string;         // 图标 URL(可选)
  tags?: string[];           // 标签数组(可选)
  required_permissions?: string[]; // 权限列表(可选)
}
```

#### 工作流程

1. **验证输入**
   - 检查名称格式(只允许字母、数字、下划线、连字符)
   - 验证必需字段完整性

2. **检查重复**
   - 查询数据库确认名称未被使用
   - 避免同一用户创建重名小应用

3. **创建小应用**
   - 构建 manifest 配置
   - 设置运行时配置(沙箱、超时、内存限制)
   - 插入 mini_apps 表

4. **自动安装**
   - 为当前用户创建安装记录
   - 授予所需权限
   - 设置为激活状态

5. **记录审计**
   - 记录创建操作到 audit_logs
   - 包含执行时间和安装状态

6. **返回结果**
   - 返回小应用 ID 和安装 ID
   - 提供友好的成功消息

#### 返回示例

```
✅ 小应用 "待办事项管理器" 创建成功!

**小应用信息**:
- ID: 550e8400-e29b-41d4-a716-446655440000
- 名称: todo-manager
- 显示名称: 待办事项管理器
- 描述: 管理待办事项列表,支持创建、查看、更新和删除
- 状态: active
- 安装ID: 660e8400-e29b-41d4-a716-446655440000
- 已自动安装并激活

你现在可以使用 invoke_miniapp 工具来调用这个小应用了。
```

---

### 2. update_miniapp 工具 ✅

#### 功能描述
允许 Agent 更新已存在的小应用,只能更新自己创建的小应用。

#### 参数定义

```typescript
{
  miniAppId: string;         // 要更新的小应用 ID
  updates: {
    display_name?: string;   // 新的显示名称
    description?: string;    // 新的功能描述
    code?: string;           // 新的代码
    icon_url?: string;       // 新的图标 URL
    tags?: string[];         // 新的标签
    status?: 'draft' | 'active' | 'suspended' | 'archived';
    is_public?: boolean;     // 是否公开
    is_shareable?: boolean;  // 是否可分享
  }
}
```

#### 工作流程

1. **验证权限**
   - 检查小应用是否存在
   - 验证是否为创建者(creator_id)

2. **验证更新**
   - 确保至少有一个字段需要更新
   - 验证字段值的有效性

3. **执行更新**
   - 更新指定字段
   - 自动更新 updated_at 时间戳

4. **记录审计**
   - 记录更新操作
   - 包含更新的字段列表

5. **返回结果**
   - 列出更新的字段
   - 显示当前状态

#### 返回示例

```
✅ 小应用 "待办事项管理器" 更新成功!

**更新的字段**:
- description: 增强版待办事项管理器,支持优先级和标签
- code: [更新的代码]

**当前信息**:
- ID: 550e8400-e29b-41d4-a716-446655440000
- 名称: todo-manager
- 显示名称: 待办事项管理器
- 状态: active
- 更新时间: 2025-12-18 14:30:25
```

---

### 3. 增强的系统提示词 ✅

#### 新增内容

**小应用能力说明**:
- 创建小应用
- 更新小应用
- 调用小应用

**创建最佳实践**:
- 名称规范指南
- 代码结构模板
- 常见小应用类型

**代码模板**:
```javascript
// 标准的 CRUD 操作模板
switch (action) {
  case 'create':
    // 创建逻辑
  case 'read':
    // 读取逻辑
  case 'update':
    // 更新逻辑
  case 'delete':
    // 删除逻辑
}
```

**工作流程示例**:
- 场景1: 创建新小应用
- 场景2: 修改现有小应用
- 场景3: 使用已安装小应用

---

## 技术实现

### 数据库操作

#### 创建小应用
```sql
INSERT INTO mini_apps (
  creator_id, name, display_name, description, code,
  icon_url, manifest, runtime_config, status,
  is_public, is_shareable, tags
) VALUES (...);
```

#### 自动安装
```sql
INSERT INTO mini_app_installations (
  user_id, mini_app_id, installed_version,
  granted_permissions, status
) VALUES (...);
```

#### 更新小应用
```sql
UPDATE mini_apps
SET display_name = ?, description = ?, code = ?, updated_at = NOW()
WHERE id = ? AND creator_id = ?;
```

### 安全措施

1. **权限验证**
   - 只能更新自己创建的小应用
   - 使用 creator_id 进行权限检查

2. **输入验证**
   - 名称格式验证(正则表达式)
   - 必需字段完整性检查
   - 重复名称检查

3. **沙箱配置**
   - 严格沙箱级别
   - 10MB 内存限制
   - 5 秒执行超时

4. **审计日志**
   - 记录所有创建和更新操作
   - 包含成功和失败记录
   - 记录执行时间

---

## 使用场景

### 场景 1: 用户需要待办事项管理器

**用户**: "帮我创建一个待办事项管理器"

**Agent 操作**:
1. 使用 `create_miniapp` 创建小应用
2. 生成标准的 CRUD 代码
3. 自动安装并返回 ID
4. 提示用户可以开始使用

**结果**: 用户获得一个功能完整的待办事项小应用

---

### 场景 2: 用户想添加新功能

**用户**: "给我的待办事项管理器添加优先级功能"

**Agent 操作**:
1. 识别要更新的小应用
2. 使用 `update_miniapp` 更新代码
3. 在代码中添加优先级字段和逻辑
4. 确认更新成功

**结果**: 小应用获得新功能,无需重新创建

---

### 场景 3: 用户想创建笔记本

**用户**: "创建一个笔记本,支持搜索和标签"

**Agent 操作**:
1. 使用 `create_miniapp` 创建笔记本小应用
2. 实现搜索和标签功能
3. 自动安装
4. 演示如何使用

**结果**: 用户获得一个支持搜索和标签的笔记本

---

## 代码示例

### 创建待办事项管理器

```javascript
// Agent 会生成类似这样的代码
async function getTodos() {
  return await storage.get('todos') || [];
}

async function createTodo(title, description) {
  const todos = await getTodos();
  const newTodo = {
    id: Date.now().toString(),
    title,
    description,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  await storage.set('todos', todos);
  return newTodo;
}

switch (action) {
  case 'create':
    return createTodo(params.title, params.description);
  case 'read':
    return getTodos();
  case 'update':
    // 更新逻辑
  case 'delete':
    // 删除逻辑
}
```

### 创建笔记本

```javascript
// Agent 会生成类似这样的代码
async function getNotes() {
  return await storage.get('notes') || [];
}

async function searchNotes(query) {
  const notes = await getNotes();
  const lowerQuery = query.toLowerCase();
  return notes.filter(note =>
    note.title.toLowerCase().includes(lowerQuery) ||
    note.content.toLowerCase().includes(lowerQuery) ||
    note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

switch (action) {
  case 'create':
    // 创建笔记
  case 'read':
    if (params.query) {
      return searchNotes(params.query);
    }
    return getNotes();
  // ...
}
```

---

## 测试建议

### 功能测试

#### 1. 创建小应用测试

**测试用例 1: 创建简单小应用**
```
用户: "创建一个计数器小应用"
预期: Agent 创建计数器,自动安装,返回 ID
```

**测试用例 2: 创建复杂小应用**
```
用户: "创建一个待办事项管理器,支持优先级、标签和截止日期"
预期: Agent 创建功能完整的待办事项管理器
```

**测试用例 3: 名称冲突**
```
用户: "创建一个名为 todo-manager 的小应用"(已存在)
预期: Agent 提示名称已存在,建议使用其他名称
```

#### 2. 更新小应用测试

**测试用例 1: 更新代码**
```
用户: "给我的待办事项管理器添加搜索功能"
预期: Agent 更新代码,添加搜索逻辑
```

**测试用例 2: 更新描述**
```
用户: "更新待办事项管理器的描述"
预期: Agent 更新 description 字段
```

**测试用例 3: 权限验证**
```
用户: "更新别人创建的小应用"
预期: Agent 提示无权限更新
```

#### 3. 集成测试

**测试用例 1: 创建并使用**
```
1. 用户: "创建一个笔记本"
2. Agent 创建并安装
3. 用户: "添加一条笔记:今天的会议记录"
4. Agent 使用 invoke_miniapp 调用笔记本
预期: 笔记成功添加
```

**测试用例 2: 更新并使用**
```
1. 用户: "给笔记本添加标签功能"
2. Agent 更新代码
3. 用户: "添加一条笔记,标签是工作"
4. Agent 使用更新后的笔记本
预期: 笔记带标签成功添加
```

### 性能测试

- 创建小应用响应时间 < 2 秒
- 更新小应用响应时间 < 1 秒
- 并发创建 10 个小应用无错误

### 安全测试

- 尝试创建恶意代码小应用(应被沙箱限制)
- 尝试更新他人小应用(应被权限拒绝)
- 尝试使用非法名称(应被验证拒绝)

---

## 监控指标

### 关键指标

#### 1. 创建成功率
```sql
SELECT
  COUNT(*) FILTER (WHERE details->>'success' != 'false') * 100.0 / COUNT(*) as success_rate
FROM audit_logs
WHERE action = 'miniapp_creation'
  AND created_at > NOW() - INTERVAL '24 hours';
```

#### 2. 平均创建时间
```sql
SELECT
  AVG((details->>'execution_time_ms')::int) as avg_creation_time
FROM audit_logs
WHERE action = 'miniapp_creation'
  AND details->>'success' != 'false'
  AND created_at > NOW() - INTERVAL '24 hours';
```

#### 3. 更新成功率
```sql
SELECT
  COUNT(*) FILTER (WHERE details->>'success' != 'false') * 100.0 / COUNT(*) as success_rate
FROM audit_logs
WHERE action = 'miniapp_update'
  AND created_at > NOW() - INTERVAL '24 hours';
```

#### 4. 自动安装成功率
```sql
SELECT
  COUNT(*) FILTER (WHERE details->>'auto_installed' = 'true') * 100.0 / COUNT(*) as auto_install_rate
FROM audit_logs
WHERE action = 'miniapp_creation'
  AND created_at > NOW() - INTERVAL '24 hours';
```

### 告警阈值

- 🚨 创建成功率 < 95%
- 🚨 平均创建时间 > 3000ms
- 🚨 更新成功率 < 98%
- 🚨 自动安装成功率 < 99%

---

## 代码变更统计

### 修改的文件

1. **supabase/functions/process-agent-message/index.ts**
   - 新增: `create_miniapp` 工具 (~200 行)
   - 新增: `update_miniapp` 工具 (~180 行)
   - 修改: 系统提示词 (~100 行)
   - 总计: ~480 行

### 新增功能

- ✅ create_miniapp 工具
- ✅ update_miniapp 工具
- ✅ 增强的系统提示词
- ✅ 自动安装机制
- ✅ 完整的审计日志
- ✅ 权限验证
- ✅ 输入验证

---

## 部署清单

### 1. 代码部署

```bash
# 部署更新的 Edge Function
supabase functions deploy process-agent-message
```

### 2. 验证部署

```bash
# 检查函数状态
supabase functions list

# 查看函数日志
supabase functions logs process-agent-message
```

### 3. 测试验证

- ✅ 创建测试小应用
- ✅ 更新测试小应用
- ✅ 验证自动安装
- ✅ 检查审计日志

---

## 未来优化方向

### 短期 (1-2 周)

1. **代码模板库**
   - 提供常见小应用的代码模板
   - Agent 可以快速生成标准小应用

2. **代码验证**
   - 静态分析小应用代码
   - 检测潜在的安全问题

3. **版本管理**
   - 支持小应用版本控制
   - 允许回滚到之前的版本

### 中期 (1-2 月)

1. **可视化编辑器**
   - 提供 Web UI 编辑小应用代码
   - 实时预览和测试

2. **小应用市场**
   - 用户可以分享小应用
   - 浏览和安装他人的小应用

3. **AI 代码优化**
   - Agent 自动优化小应用代码
   - 提供性能改进建议

### 长期 (3-6 月)

1. **协作开发**
   - 多用户协作开发小应用
   - 版本控制和合并

2. **高级功能**
   - 支持网络请求
   - 支持定时任务
   - 支持 Webhook

3. **企业功能**
   - 小应用审核流程
   - 企业级权限管理
   - 使用配额和计费

---

## 总结

本次更新为 Mango 平台的 MiniApp 生态系统带来了革命性的改进:

### 核心成果

- ✅ **Agent 驱动创建**: Agent 可以根据用户需求动态创建小应用
- ✅ **灵活更新**: 支持修改现有小应用的各个方面
- ✅ **无缝集成**: 创建后自动安装,立即可用
- ✅ **完整审计**: 所有操作都有详细记录

### 技术亮点

1. **智能代码生成**: Agent 理解用户需求并生成合适的代码
2. **安全可靠**: 完整的权限验证和输入验证
3. **用户友好**: 自动安装,无需手动配置
4. **可观测性**: 完整的审计日志和监控指标

### 业务价值

- 🚀 **降低门槛**: 用户无需编程即可创建小应用
- 💡 **激发创新**: 用户可以快速实现各种想法
- 🔄 **持续改进**: 小应用可以随时更新和优化
- 📈 **生态增长**: 为 MiniApp 市场奠定基础

### 下一步

继续按照未来优化方向推进,逐步构建完整的 MiniApp 生态系统,实现真正的"AI 驱动的应用平台"。

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**维护者**: Mango Team
