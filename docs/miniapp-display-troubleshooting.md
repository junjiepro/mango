# MiniApp 显示问题排查指南

**问题**: Agent创建的小应用在用户界面看不到

**日期**: 2025-12-18

---

## 问题分析

### 数据流程

1. **Agent创建小应用**:
   - Edge Function 使用 Service Role Key (绕过RLS)
   - 设置 `creator_id = userId` (从请求参数获取)
   - 设置 `is_public = false` (默认私有)

2. **前端查询小应用**:
   - 使用用户的认证token
   - 通过RLS策略过滤: `creator_id = auth.uid()`
   - 只能看到自己创建的小应用

### 可能的原因

#### 1. creator_id 不匹配 ⚠️ **最可能**

**症状**: 小应用创建成功,但在"My Apps"中看不到

**原因**:
- Agent创建时使用的 `userId` 与前端用户的 `auth.uid()` 不一致
- 可能是UUID格式问题或用户ID传递错误

**验证方法**:
```sql
-- 在 Supabase SQL Editor 中执行
-- 1. 查看创建的小应用
SELECT id, name, display_name, creator_id, created_at
FROM mini_apps
ORDER BY created_at DESC
LIMIT 5;

-- 2. 查看当前用户ID
SELECT auth.uid();

-- 3. 对比两者是否一致
```

**解决方案**:
- 确保传递给Edge Function的 `userId` 是正确的UUID
- 检查前端调用Edge Function时是否正确传递了用户ID

---

#### 2. RLS策略阻止访问

**症状**: 数据库中有数据,但API返回空数组

**原因**:
- RLS策略配置错误
- 前端使用的token无效或过期

**验证方法**:
```sql
-- 测试RLS策略
-- 1. 以特定用户身份查询
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "YOUR_USER_ID"}';

SELECT * FROM mini_apps WHERE creator_id = 'YOUR_USER_ID';
```

**解决方案**:
- 检查RLS策略是否正确启用
- 确认前端token有效

---

#### 3. 前端缓存问题

**症状**: 刷新页面后仍然看不到

**原因**: 浏览器缓存或React状态未更新

**解决方案**:
- 硬刷新页面 (Ctrl+Shift+R)
- 清除浏览器缓存
- 检查Network面板的API响应

---

## 调试步骤

### Step 1: 验证小应用是否创建成功

在浏览器开发者工具的Console中执行:

```javascript
// 1. 检查Agent响应
// 查看Agent返回的消息中是否包含小应用ID

// 2. 直接查询数据库
fetch('/api/miniapps?type=user&limit=50')
  .then(r => r.json())
  .then(data => {
    console.log('My Apps:', data);
    console.log('Count:', data.count);
    console.log('Apps:', data.data);
  });
```

**预期结果**:
- `data.count > 0`
- `data.data` 数组包含创建的小应用

**如果返回空数组**: 继续Step 2

---

### Step 2: 检查数据库中的数据

在 Supabase Dashboard > SQL Editor 中执行:

```sql
-- 查看最近创建的小应用
SELECT
  id,
  name,
  display_name,
  creator_id,
  status,
  is_public,
  created_at
FROM mini_apps
ORDER BY created_at DESC
LIMIT 10;
```

**检查点**:
- ✅ 是否有新创建的记录?
- ✅ `creator_id` 是否是有效的UUID?
- ✅ `status` 是否为 'active'?
- ✅ `created_at` 时间是否正确?

**如果没有记录**: 小应用创建失败,检查Edge Function日志

**如果有记录**: 继续Step 3

---

### Step 3: 验证用户ID匹配

在浏览器Console中执行:

```javascript
// 获取当前用户ID
fetch('/api/auth/user')
  .then(r => r.json())
  .then(user => {
    console.log('Current User ID:', user.id);
  });
```

然后对比Step 2中查询到的 `creator_id`:

```sql
-- 在SQL Editor中
SELECT
  ma.id,
  ma.name,
  ma.creator_id,
  au.email as creator_email
FROM mini_apps ma
LEFT JOIN auth.users au ON ma.creator_id = au.id
ORDER BY ma.created_at DESC
LIMIT 5;
```

**检查点**:
- ✅ `creator_id` 是否与当前用户ID一致?
- ✅ `creator_email` 是否是当前登录用户的邮箱?

**如果不一致**: 这就是问题所在! 继续Step 4

---

### Step 4: 检查Edge Function日志

在 Supabase Dashboard > Edge Functions > Logs 中查看:

```
搜索关键词: "创建小应用"
```

**查看日志**:
```
创建小应用: { name: 'xxx', display_name: 'xxx' }
小应用创建成功: xxx (xxxms)
```

**检查点**:
- ✅ 是否有创建成功的日志?
- ✅ 是否有错误日志?
- ✅ `userId` 的值是什么?

---

### Step 5: 检查API调用

在浏览器Network面板中:

1. 切换到"My Apps"标签
2. 查看 `/api/miniapps?type=user&limit=50` 请求
3. 检查响应:

```json
{
  "success": true,
  "data": [],  // 如果为空,说明查询有问题
  "count": 0
}
```

**检查点**:
- ✅ 请求是否成功 (200)?
- ✅ 是否有认证token (Authorization header)?
- ✅ 响应数据是否为空?

---

## 解决方案

### 方案 1: 修复 creator_id 不匹配 (推荐)

如果发现 `creator_id` 不匹配,需要确保Edge Function接收到正确的用户ID。

**检查前端调用代码**:

```typescript
// apps/web/src/app/api/conversations/[id]/messages/route.ts
// 确保传递正确的 userId

const { data: { user } } = await supabase.auth.getUser();

const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseServiceKey}`,
  },
  body: JSON.stringify({
    conversationId,
    messageId: agentMessage.id,
    userId: user.id,  // ✅ 确保这里传递的是正确的用户ID
  }),
});
```

---

### 方案 2: 临时修复 - 手动更新 creator_id

如果已经创建了小应用但 `creator_id` 不正确,可以手动修复:

```sql
-- 在 Supabase SQL Editor 中执行
-- 将小应用的 creator_id 更新为当前用户ID

UPDATE mini_apps
SET creator_id = 'YOUR_CORRECT_USER_ID'
WHERE name = 'YOUR_MINIAPP_NAME';
```

**获取正确的用户ID**:
```sql
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

---

### 方案 3: 添加调试日志

在 Edge Function 中添加更多日志:

```typescript
// supabase/functions/process-agent-message/index.ts
// 在 create_miniapp 工具的 execute 函数中

execute: async ({ name, display_name, ... }) => {
  console.log('=== CREATE MINIAPP DEBUG ===');
  console.log('userId:', userId);
  console.log('name:', name);
  console.log('display_name:', display_name);

  // ... 创建逻辑 ...

  console.log('Created miniApp:', {
    id: miniApp.id,
    creator_id: miniApp.creator_id,
    name: miniApp.name,
  });
  console.log('=== END DEBUG ===');
}
```

重新部署后测试:
```bash
supabase functions deploy process-agent-message
```

---

## 快速验证脚本

在浏览器Console中运行此脚本进行完整诊断:

```javascript
async function diagnoseMiniAppIssue() {
  console.log('🔍 开始诊断 MiniApp 显示问题...\n');

  // 1. 获取当前用户
  const userRes = await fetch('/api/auth/user');
  const user = await userRes.json();
  console.log('✅ 当前用户ID:', user.id);
  console.log('   邮箱:', user.email);

  // 2. 查询用户的小应用
  const appsRes = await fetch('/api/miniapps?type=user&limit=50');
  const appsData = await appsRes.json();
  console.log('\n📱 我的小应用:');
  console.log('   数量:', appsData.count);
  console.log('   列表:', appsData.data);

  // 3. 查询所有公开小应用
  const publicRes = await fetch('/api/miniapps?type=public&limit=50');
  const publicData = await publicRes.json();
  console.log('\n🌐 公开小应用:');
  console.log('   数量:', publicData.count);

  // 4. 查询安装的小应用
  const installRes = await fetch('/api/miniapps/installations');
  const installData = await installRes.json();
  console.log('\n💾 已安装小应用:');
  console.log('   数量:', installData.data?.length || 0);
  console.log('   列表:', installData.data);

  console.log('\n✨ 诊断完成!');
  console.log('\n💡 提示:');
  console.log('   - 如果"我的小应用"为空,但数据库中有数据,说明 creator_id 不匹配');
  console.log('   - 如果"已安装小应用"有数据,说明自动安装成功');
  console.log('   - 检查上面的用户ID是否与数据库中的 creator_id 一致');
}

// 运行诊断
diagnoseMiniAppIssue();
```

---

## 预防措施

### 1. 添加创建确认

在Agent返回消息中添加更多信息:

```typescript
return `✅ 小应用 "${miniApp.display_name}" 创建成功!

**小应用信息**:
- ID: ${miniApp.id}
- 创建者ID: ${miniApp.creator_id}  // ✅ 添加这行
- 名称: ${miniApp.name}
- 显示名称: ${miniApp.display_name}
- 状态: ${miniApp.status}

**提示**: 请在"My Apps"标签中查看你创建的小应用。`;
```

### 2. 添加前端刷新

在对话界面添加小应用创建成功的监听:

```typescript
// 监听 tool_call_result 事件
if (event.tool === 'create_miniapp' && event.status === 'success') {
  // 自动刷新小应用列表
  window.dispatchEvent(new CustomEvent('miniapp-created'));
}
```

### 3. 添加错误提示

如果创建失败,在UI中显示明确的错误信息。

---

## 常见问题

### Q1: 为什么小应用不在"Discover"中显示?

**A**: Agent创建的小应用默认是私有的 (`is_public: false`),只会在"My Apps"中显示。如果想公开,需要:

```typescript
// 在创建时设置
is_public: true

// 或者使用 update_miniapp 工具更新
{
  miniAppId: 'xxx',
  updates: {
    is_public: true
  }
}
```

### Q2: 小应用创建成功但立即消失?

**A**: 可能是:
1. 浏览器缓存问题 - 硬刷新页面
2. React状态未更新 - 检查前端状态管理
3. RLS策略问题 - 检查数据库权限

### Q3: 如何删除测试创建的小应用?

**A**:
```sql
-- 在 Supabase SQL Editor 中
DELETE FROM mini_apps WHERE name = 'test-app-name';
```

或者在前端UI中使用删除功能(如果已实现)。

---

## 总结

**最可能的问题**: `creator_id` 不匹配

**快速验证**:
1. 运行上面的诊断脚本
2. 对比用户ID和数据库中的 creator_id
3. 如果不匹配,检查Edge Function的 userId 参数传递

**快速修复**:
1. 确保前端正确传递 userId
2. 或手动更新数据库中的 creator_id

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**维护者**: Mango Team
