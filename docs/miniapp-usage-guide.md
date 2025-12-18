# MiniApp 使用指南

**日期**: 2025-12-18
**版本**: v1.0

---

## 完整的数据流

### 1. Agent 创建小应用 ✅

```
用户: "帮我创建一个待办事项管理器"
  ↓
Agent 使用 create_miniapp 工具
  ↓
Edge Function 创建小应用并自动安装
  ↓
返回: 小应用ID + 安装ID
```

### 2. 用户选择小应用 ✅

```
用户点击消息输入框的小应用图标
  ↓
MiniAppSelector 弹出对话框
  ↓
显示已安装的小应用列表
  ↓
用户选择一个小应用
  ↓
MessageInput 显示选中的小应用
```

### 3. 发送带小应用的消息 ✅

```
用户输入: "添加一个待办:完成项目报告"
  ↓
MessageInput 准备 miniAppData
  ↓
POST /api/conversations/[id]/messages
  ↓
消息保存到数据库,metadata 包含 miniApp 信息
```

### 4. Agent 识别并调用小应用 ✅

```
Edge Function 读取消息历史
  ↓
检测到 metadata.miniApp
  ↓
在系统提示词中添加小应用调用指南
  ↓
Agent 使用 invoke_miniapp 工具
  ↓
执行小应用代码并返回结果
```

---

## 测试步骤

### 步骤 1: 创建小应用

1. 打开对话页面
2. 输入: **"帮我创建一个待办事项管理器"**
3. 等待 Agent 响应
4. 确认看到类似消息:
   ```
   ✅ 小应用 "待办事项管理器" 创建成功!

   **小应用信息**:
   - ID: xxx-xxx-xxx
   - 名称: todo-manager
   - 显示名称: 待办事项管理器
   - 状态: active
   - 安装ID: xxx-xxx-xxx
   - 已自动安装并激活
   ```

### 步骤 2: 验证小应用已安装

**方法 1: 在浏览器 Console 中验证**

```javascript
// 查询已安装的小应用
fetch('/api/miniapps/installations')
  .then(r => r.json())
  .then(data => {
    console.log('已安装小应用:', data.data);
    if (data.data && data.data.length > 0) {
      console.log('✅ 找到', data.data.length, '个已安装的小应用');
      data.data.forEach(inst => {
        console.log(`  - ${inst.mini_app?.display_name}`);
        console.log(`    小应用ID: ${inst.mini_app_id}`);
        console.log(`    安装ID: ${inst.id}`);
      });
    } else {
      console.log('❌ 没有找到已安装的小应用');
    }
  });
```

**方法 2: 在 My Apps 页面查看**

1. 导航到 `/miniapps`
2. 点击 **"My Apps"** 标签
3. 应该看到创建的小应用

### 步骤 3: 选择小应用

1. 在对话页面的消息输入框中
2. 点击**小应用图标**(立方体图标,在附件按钮旁边)
3. 应该弹出"选择小应用"对话框
4. 应该看到刚创建的"待办事项管理器"
5. 点击选择它
6. 输入框上方应该显示: **"将调用: 待办事项管理器"**

### 步骤 4: 调用小应用

1. 在输入框中输入: **"添加一个待办:完成项目报告"**
2. 点击发送
3. 等待 Agent 响应
4. 应该看到 Agent 调用小应用并返回结果

**预期响应示例**:
```
✅ 小应用 "待办事项管理器" 执行成功
操作: create
执行时间: 123ms
结果: {
  "id": "1734567890123",
  "title": "完成项目报告",
  "completed": false,
  "createdAt": "2025-12-18T10:30:00.000Z"
}
```

### 步骤 5: 继续使用小应用

**查看所有待办**:
```
用户: "显示我的所有待办事项"
```

**标记完成**:
```
用户: "标记'完成项目报告'为已完成"
```

**删除待办**:
```
用户: "删除'完成项目报告'"
```

---

## 故障排查

### 问题 1: 看不到小应用选择器图标

**可能原因**:
- MessageInput 组件未正确导入 MiniAppSelector
- UI 渲染问题

**解决方案**:
1. 刷新页面
2. 检查浏览器 Console 是否有错误
3. 确认 MiniAppSelector 组件存在

---

### 问题 2: 点击小应用图标没有反应

**可能原因**:
- `/api/miniapps/installations` 返回 500 错误
- 没有已安装的小应用

**解决方案**:
1. 打开浏览器 Network 面板
2. 点击小应用图标
3. 查看 `/api/miniapps/installations` 请求
4. 如果返回 500,检查服务器日志
5. 如果返回空数组,说明没有安装的小应用

**验证安装记录**:
```sql
-- 在 Supabase SQL Editor 中
SELECT * FROM mini_app_installations
ORDER BY created_at DESC
LIMIT 10;
```

---

### 问题 3: 选择小应用后,Agent 没有调用

**可能原因**:
- 消息的 metadata 没有正确保存
- Edge Function 没有读取到 metadata

**调试步骤**:

**1. 检查消息数据**:
```sql
-- 查看最近的消息及其 metadata
SELECT
  id,
  content,
  sender_type,
  metadata,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**:
```json
{
  "miniApp": {
    "miniAppId": "xxx-xxx-xxx",
    "installationId": "xxx-xxx-xxx"
  }
}
```

**2. 检查 Edge Function 日志**:

在 Supabase Dashboard > Edge Functions > Logs 中查找:
```
User requested MiniApp: 待办事项管理器
```

如果看到这条日志,说明 metadata 正确传递。

**3. 检查 Agent 系统提示词**:

在 Edge Function 日志中应该看到:
```
**重要提示**: 用户在这条消息中选择了小应用 "待办事项管理器"。
```

---

### 问题 4: Agent 调用小应用失败

**可能原因**:
- 小应用代码有错误
- 权限不足
- 超时

**查看错误信息**:

在 Edge Function 日志中查找:
```
小应用调用失败: [错误信息]
```

**常见错误**:

1. **"小应用不存在"**: miniAppId 不正确
2. **"小应用未安装或已禁用"**: installationId 不正确或状态不是 active
3. **"缺少必需权限"**: 权限配置问题
4. **"执行超时"**: 代码执行时间超过 5 秒

---

## 调试工具

### 完整诊断脚本

在浏览器 Console 中运行:

```javascript
async function fullDiagnosis() {
  console.log('🔍 开始完整诊断...\n');

  // 1. 检查已安装的小应用
  console.log('📱 步骤 1: 检查已安装的小应用');
  try {
    const instRes = await fetch('/api/miniapps/installations');
    const instData = await instRes.json();
    console.log('   状态:', instRes.status);
    console.log('   数量:', instData.data?.length || 0);

    if (instData.data && instData.data.length > 0) {
      console.log('   ✅ 已安装的小应用:');
      instData.data.forEach(inst => {
        console.log(`      - ${inst.mini_app?.display_name}`);
        console.log(`        小应用ID: ${inst.mini_app_id}`);
        console.log(`        安装ID: ${inst.id}`);
      });
    } else {
      console.log('   ❌ 没有已安装的小应用');
      console.log('   💡 请先让 Agent 创建一个小应用');
      return;
    }
  } catch (e) {
    console.error('   ❌ 查询失败:', e);
    return;
  }

  // 2. 检查最近的消息
  console.log('\n💬 步骤 2: 检查最近的消息');
  console.log('   请在 Supabase SQL Editor 中运行:');
  console.log('   SELECT id, content, sender_type, metadata FROM messages ORDER BY created_at DESC LIMIT 5;');

  // 3. 测试小应用调用
  console.log('\n🧪 步骤 3: 测试流程');
  console.log('   1. 点击消息输入框的小应用图标');
  console.log('   2. 选择一个小应用');
  console.log('   3. 输入消息并发送');
  console.log('   4. 观察 Agent 是否调用小应用');

  console.log('\n✨ 诊断完成!');
}

fullDiagnosis();
```

---

## 数据库查询参考

### 查看所有小应用

```sql
SELECT
  id,
  name,
  display_name,
  creator_id,
  status,
  is_public,
  created_at
FROM mini_apps
ORDER BY created_at DESC;
```

### 查看所有安装记录

```sql
SELECT
  mai.id as installation_id,
  mai.mini_app_id,
  mai.user_id,
  mai.status,
  ma.display_name as app_name,
  au.email as user_email
FROM mini_app_installations mai
LEFT JOIN mini_apps ma ON mai.mini_app_id = ma.id
LEFT JOIN auth.users au ON mai.user_id = au.id
ORDER BY mai.created_at DESC;
```

### 查看带 miniApp metadata 的消息

```sql
SELECT
  id,
  content,
  sender_type,
  metadata,
  created_at
FROM messages
WHERE metadata IS NOT NULL
  AND metadata::text LIKE '%miniApp%'
ORDER BY created_at DESC
LIMIT 10;
```

### 查看小应用调用日志

```sql
SELECT
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  created_at
FROM audit_logs
WHERE action IN ('miniapp_creation', 'miniapp_invocation', 'miniapp_update')
ORDER BY created_at DESC
LIMIT 20;
```

---

## 常见问题

### Q1: 为什么选择小应用后,输入框会自动添加 @小应用名称?

**A**: 这是一个用户体验优化,提示用户已选择了小应用。这个文本不会影响小应用的调用,因为调用信息存储在 `miniAppData` 中。

### Q2: 可以同时选择多个小应用吗?

**A**: 目前不支持。每次只能选择一个小应用。如果需要调用多个小应用,需要分别发送消息。

### Q3: 如何取消选择的小应用?

**A**: 点击输入框上方显示的小应用卡片右侧的 ✕ 按钮。

### Q4: Agent 会自动识别需要调用哪个小应用吗?

**A**: 不会。用户必须手动选择小应用。Agent 只会在用户选择了小应用后才会调用它。

### Q5: 小应用的数据存储在哪里?

**A**: 存储在 `mini_app_data` 表中,每个安装实例有独立的数据空间。

---

## 下一步

### 功能增强

1. **智能推荐**: Agent 根据用户意图自动推荐合适的小应用
2. **批量操作**: 支持一次调用多个小应用
3. **快捷命令**: 支持 `/todo add xxx` 这样的快捷命令
4. **小应用市场**: 浏览和安装其他用户分享的小应用

### 性能优化

1. **缓存**: 缓存已安装的小应用列表
2. **预加载**: 提前加载常用小应用
3. **懒加载**: 按需加载小应用代码

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**维护者**: Mango Team
