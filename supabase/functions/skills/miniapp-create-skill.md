---
name: 创建/更新小应用
description: 创建或更新 MiniApp。当用户需要开发新功能时使用。
keywords: [创建, 开发, 新建, 更新, 修改, 小应用, miniapp]
triggers: [创建小应用, 新建应用, 开发功能, 更新小应用]
tags: [miniapp, 开发]
priority: 8
---

# 创建/更新小应用

MiniApp = Skill + MCP Server，运行在安全沙箱中。

## When to Use

- 用户说"创建一个xxx小应用"
- 用户说"帮我做一个xxx功能"
- 用户说"更新/修改xxx小应用"

## Tools

### create_miniapp

创建新的小应用。

**Parameters:**
- `name` (string, required): 唯一标识名
- `display_name` (string, required): 显示名称
- `description` (string, required): 功能描述
- `code` (string, required): MCP Server 代码
- `skill` (string, required): Skill 使用指南
- `html` (object, optional): UI 资源对象（JSON），key 为资源名，value 为 HTML 内容。如 `{"main": "<html>..."}`。code 中通过 `getUIResource(name)` 引用

### update_miniapp

更新已有小应用。更新时会自动创建版本记录。

**Parameters:**
- `miniAppId` (string, required): 小应用 ID
- `updates` (object, required): 更新内容 {code?, skill?, html?, html_mode?, html_delete_keys?, description?}
  - `html` (object, optional): UI 资源对象
  - `html_mode` (string, optional): 更新模式 - `replace`（默认）整体替换 / `merge` 合并模式 / `delete` 删除模式
  - `html_delete_keys` (string[], optional): delete 模式下要删除的资源 key 列表
- `changeSummary` (string, optional): 变更摘要

### get_miniapp

读取小应用详情，包括代码、Skill 和版本信息。**更新前先调用此工具了解当前状态**。

**Parameters:**
- `miniAppId` (string, required): 小应用 ID
- `includeCode` (boolean, optional): 是否包含完整代码，默认 true

### get_miniapp_versions

获取小应用的版本历史记录，支持查看特定版本的代码。

**Parameters:**
- `miniAppId` (string, required): 小应用 ID
- `version` (string, optional): 指定版本号，获取该版本的完整代码
- `limit` (number, optional): 返回版本数量限制，默认 10

### rollback_miniapp

将小应用回滚到指定版本。

**Parameters:**
- `miniAppId` (string, required): 小应用 ID
- `version` (string, required): 要回滚到的版本号

## 沙箱 API

```javascript
// UI 资源函数（由 html 字段自动注入）
getUIResource('main')      // 获取主 UI 资源
getUIResource('settings')  // 获取指定名称的 UI 资源

// 工具注册（ext-apps 标准 API）
registerAppTool(mcpServer, 'tool-name', {
  title: '工具标题',
  description: '工具描述',
  inputSchema: z.object({ ... }),
  _meta: { ui: { resourceUri } },  // 可选：关联 UI 资源
}, async (args) => {
  return { structuredContent: { ... } };
});

// UI 资源注册（ext-apps 标准 API）
const resourceUri = 'ui://mango/main';
registerAppResource(mcpServer, 'Main UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '应用主界面',
}, async () => ({
  contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: '<html>...</html>' }]
}));

// 存储 API
storage.get(key)
storage.set(key, value)

// 用户信息
user.id
user.email

// HTTP 请求
http.get(url, options)
http.post(url, body, options)
http.put(url, body, options)
http.delete(url, options)
```

## 网络请求示例

```javascript
// GET 请求
const res = await http.get('https://api.example.com/data');
console.log(res.data);

// POST 请求
const res = await http.post('https://api.example.com/items', {
  name: 'New Item'
});

// 带选项的请求
const res = await http.get('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 5000
});
```

## 代码示例

### 待办小应用 code

```javascript
// 添加待办
registerAppTool(mcpServer, 'add_todo', {
  title: '添加待办',
  description: '添加待办事项',
  inputSchema: z.object({
    title: z.string().describe('待办标题'),
    priority: z.enum(['high', 'medium', 'low']).optional()
  }),
}, async ({ title, priority = 'medium' }) => {
  const todos = await storage.get('todos') || [];
  const newTodo = {
    id: Date.now().toString(),
    title,
    priority,
    done: false,
    createdAt: new Date().toISOString()
  };
  todos.push(newTodo);
  await storage.set('todos', todos);
  return { structuredContent: { success: true, todo: newTodo } };
});

// 列出待办
registerAppTool(mcpServer, 'list_todos', {
  title: '列出待办',
  description: '列出所有待办事项',
  inputSchema: z.object({
    filter: z.enum(['all', 'done', 'pending']).optional()
  }),
}, async ({ filter = 'all' }) => {
  const todos = await storage.get('todos') || [];
  let result = todos;
  if (filter === 'done') result = todos.filter(t => t.done);
  if (filter === 'pending') result = todos.filter(t => !t.done);
  return { structuredContent: result };
});
```

### 待办小应用 skill

```markdown
---
name: "待办事项管理"
description: "管理用户的待办事项列表"
keywords: [待办, 任务, todo]
triggers: [添加待办, 查看待办]
tags: [miniapp, 效率]
priority: 5
---

# 待办事项管理

## When to Use
- 用户说"添加待办"、"新建任务"
- 用户说"查看待办"、"我的任务"

## Tools

### add_todo
添加新的待办事项。
- `title` (string): 待办标题
- `priority` (enum): 优先级

### list_todos
列出待办事项。
- `filter` (enum): 筛选条件
```

## UI 资源示例

```javascript
const resourceUri = 'ui://mango/main';

// 注册 UI 资源（HTML 通过 html 参数传入，code 中用 getUIResource('main') 引用）
registerAppResource(mcpServer, 'Todo UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '待办事项界面',
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: getUIResource('main'),
  }]
}));

// 注册工具并关联 UI 资源
registerAppTool(mcpServer, 'show_add_form', {
  title: '显示添加表单',
  description: '显示添加待办的表单',
  inputSchema: z.object({}),
  _meta: { ui: { resourceUri } },
}, async () => {
  return { structuredContent: { ui: resourceUri } };
});
```

## Best Practices

1. **同时提供 code 和 skill**: 创建时必须两者都有
2. **Skill 要清晰**: 明确说明何时使用、有哪些工具
3. **使用 ext-apps 标准 API**: 使用 `registerAppTool()` / `registerAppResource()` 注册
4. **更新前先读取**: 使用 `get_miniapp` 了解当前代码状态
5. **提供变更摘要**: 更新时填写 `changeSummary` 便于追踪
6. **版本回滚**: 出问题时使用 `rollback_miniapp` 恢复
7. **HTML 独立传入**: 将 UI HTML 通过 `html` 参数以 JSON 对象格式传入（如 `{"main": "<html>..."}`），code 中使用 `getUIResource('main')` 引用。更新单个资源时使用 `html_mode: 'merge'` 避免覆盖其他资源

## 完整示例：个人记账本

一个功能完整的个人记账本，覆盖**全部沙箱 API**（registerAppTool, registerAppResource, RESOURCE_MIME_TYPE, z, storage, user, http, notification, console）和**全部 View SDK 特性**（connect, callServerTool, readResource, openLink, sendMessage, requestResize, 事件回调, 暗色模式适配）。

功能包括：收入/支出记录、编辑/删除、分类管理、月度统计图表、预算管理、汇率换算、数据导出。

### 个人记账本 code

```javascript
// === 个人记账本 MiniApp ===
// 覆盖全部沙箱 API: registerAppTool, registerAppResource, RESOURCE_MIME_TYPE,
// z, storage, user, http, notification, console, _meta, annotations

const resourceUri = 'ui://mango/main';

// ========== 辅助函数 ==========

async function getRecords() {
  return await storage.get('records') || [];
}

async function saveRecords(records) {
  await storage.set('records', records);
}

async function getCategories() {
  const cats = await storage.get('categories');
  if (cats) return cats;
  const defaults = [
    { id: 'food', name: '餐饮', icon: '🍜', type: 'expense' },
    { id: 'transport', name: '交通', icon: '🚌', type: 'expense' },
    { id: 'shopping', name: '购物', icon: '🛒', type: 'expense' },
    { id: 'fun', name: '娱乐', icon: '🎮', type: 'expense' },
    { id: 'medical', name: '医疗', icon: '💊', type: 'expense' },
    { id: 'housing', name: '住房', icon: '🏠', type: 'expense' },
    { id: 'salary', name: '工资', icon: '💰', type: 'income' },
    { id: 'bonus', name: '奖金', icon: '🎁', type: 'income' },
    { id: 'invest', name: '投资', icon: '📈', type: 'income' },
    { id: 'other_in', name: '其他收入', icon: '💵', type: 'income' },
    { id: 'other_out', name: '其他支出', icon: '📦', type: 'expense' },
  ];
  await storage.set('categories', defaults);
  return defaults;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 金额用分存储，避免浮点精度问题
function yuanToCent(yuan) { return Math.round(yuan * 100); }
function centToYuan(cent) { return cent / 100; }

async function checkBudget(records) {
  const budgets = await storage.get('budgets') || [];
  if (!budgets.length) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthExpense = records
    .filter(r => {
      if (r.type !== 'expense') return false;
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((s, r) => s + r.amount, 0);
  for (const b of budgets) {
    if (b.category === 'total' && monthExpense > b.amount) {
      await notification.send('预算超支提醒',
        `本月总支出 ¥${centToYuan(monthExpense)} 已超出预算 ¥${centToYuan(b.amount)}`);
      console.log(`预算超支: 总支出 ${centToYuan(monthExpense)} > ${centToYuan(b.amount)}`);
    }
  }
}

// ========== 注册 UI 资源（ext-apps 标准 API） ==========
registerAppResource(mcpServer, 'Expense Tracker UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '个人记账本主界面',
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: getUIResource('main'),
    _meta: { ui: { csp: { connectDomains: ['api.exchangerate-api.com'] } } },
  }],
}));

// ========== 工具 1: 初始化应用 ==========
registerAppTool(mcpServer, 'init_app', {
  title: '初始化记账本',
  description: '首次使用时初始化默认分类和设置',
  inputSchema: z.object({}),
  _meta: { ui: { resourceUri } },
}, async () => {
  const categories = await getCategories();
  const settings = await storage.get('settings') || {
    currency: 'CNY', locale: 'zh-CN', createdAt: new Date().toISOString(),
  };
  await storage.set('settings', settings);
  const records = await getRecords();
  console.log(`初始化: user=${user.id}, ${categories.length} 分类, ${records.length} 条记录`);
  return {
    structuredContent: {
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      categoriesCount: categories.length,
      recordsCount: records.length,
    },
  };
});

// ========== 工具 2: 添加收支记录 ==========
registerAppTool(mcpServer, 'add_transaction', {
  title: '添加记录',
  description: '添加一笔收入或支出记录',
  inputSchema: z.object({
    type: z.enum(['income', 'expense']).describe('类型：income 收入 / expense 支出'),
    amount: z.number().describe('金额（元），如 12.5'),
    categoryId: z.string().describe('分类 ID，如 food / salary'),
    note: z.string().describe('备注说明'),
    date: z.string().describe('日期 YYYY-MM-DD，留空则为今天'),
  }),
  _meta: { ui: { resourceUri } },
}, async ({ type, amount, categoryId, note, date }) => {
  const records = await getRecords();
  const categories = await getCategories();
  const cat = categories.find(c => c.id === categoryId);
  const record = {
    id: genId(),
    type,
    amount: yuanToCent(amount),
    categoryId,
    categoryName: cat ? cat.name : categoryId,
    note,
    date: date || new Date().toISOString().slice(0, 10),
    userId: user.id,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  await saveRecords(records);
  console.log(`新增${type === 'income' ? '收入' : '支出'}: ¥${amount} [${record.categoryName}]`);
  if (type === 'expense') await checkBudget(records);
  return {
    content: [{ type: 'text', text: `已记录: ${type === 'income' ? '+' : '-'}¥${amount} ${record.categoryName} - ${note}` }],
    structuredContent: { success: true, record },
  };
});

// ========== 工具 3: 编辑记录 ==========
registerAppTool(mcpServer, 'update_transaction', {
  title: '编辑记录',
  description: '修改一条收支记录的金额、分类、备注或日期',
  inputSchema: z.object({
    id: z.string().describe('记录 ID'),
    amount: z.number().describe('新金额（元）').optional(),
    categoryId: z.string().describe('新分类 ID').optional(),
    note: z.string().describe('新备注').optional(),
    date: z.string().describe('新日期 YYYY-MM-DD').optional(),
  }),
  _meta: { ui: { resourceUri } },
}, async ({ id, amount, categoryId, note, date }) => {
  const records = await getRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    return { content: [{ type: 'text', text: `未找到记录 ${id}` }], isError: true };
  }
  const r = records[idx];
  if (amount !== undefined) r.amount = yuanToCent(amount);
  if (categoryId) {
    const cats = await getCategories();
    const cat = cats.find(c => c.id === categoryId);
    r.categoryId = categoryId;
    r.categoryName = cat ? cat.name : categoryId;
  }
  if (note !== undefined) r.note = note;
  if (date) r.date = date;
  r.updatedAt = new Date().toISOString();
  records[idx] = r;
  await saveRecords(records);
  console.log(`编辑记录 ${id}: amount=${centToYuan(r.amount)}, cat=${r.categoryName}`);
  return { structuredContent: { success: true, record: r } };
});

// ========== 工具 4: 删除记录 ==========
registerAppTool(mcpServer, 'delete_transaction', {
  title: '删除记录',
  description: '按 ID 删除一条收支记录',
  inputSchema: z.object({
    id: z.string().describe('记录 ID'),
  }),
  _meta: { ui: { resourceUri } },
}, async ({ id }) => {
  const records = await getRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    return { content: [{ type: 'text', text: `未找到记录 ${id}` }], isError: true };
  }
  const removed = records.splice(idx, 1)[0];
  await saveRecords(records);
  const allKeys = await storage.list();
  console.log(`删除记录 ${id}, 存储 keys: ${allKeys.join(', ')}`);
  return { structuredContent: { success: true, deleted: removed } };
});

// ========== 工具 5: 查询列表（只读） ==========
registerAppTool(mcpServer, 'list_transactions', {
  title: '查看记录',
  description: '按条件筛选收支记录，支持分页',
  inputSchema: z.object({
    type: z.enum(['all', 'income', 'expense']).describe('类型筛选'),
    categoryId: z.string().describe('分类 ID 筛选，留空不筛选').optional(),
    startDate: z.string().describe('起始日期 YYYY-MM-DD').optional(),
    endDate: z.string().describe('结束日期 YYYY-MM-DD').optional(),
    page: z.number().describe('页码，从 1 开始，默认 1').optional(),
    pageSize: z.number().describe('每页条数，默认 20').optional(),
  }),
  annotations: { readOnlyHint: true },
  _meta: { ui: { resourceUri } },
}, async ({ type = 'all', categoryId, startDate, endDate, page = 1, pageSize = 20 }) => {
  let records = await getRecords();
  if (type !== 'all') records = records.filter(r => r.type === type);
  if (categoryId) records = records.filter(r => r.categoryId === categoryId);
  if (startDate) records = records.filter(r => r.date >= startDate);
  if (endDate) records = records.filter(r => r.date <= endDate);
  records.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const total = records.length;
  const start = (page - 1) * pageSize;
  const paged = records.slice(start, start + pageSize);
  console.log(`查询记录: type=${type}, 共 ${total} 条, 返回第 ${page} 页`);
  return {
    structuredContent: { records: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  };
});

// ========== 工具 6: 统计 ==========
registerAppTool(mcpServer, 'get_statistics', {
  title: '收支统计',
  description: '获取月度或周度收支统计，含分类汇总',
  inputSchema: z.object({
    period: z.enum(['month', 'week']).describe('统计周期'),
    month: z.string().describe('月份 YYYY-MM，留空则为当月').optional(),
  }),
  annotations: { readOnlyHint: true },
}, async ({ period = 'month', month }) => {
  const records = await getRecords();
  const now = new Date();
  let filtered;
  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = weekAgo.toISOString().slice(0, 10);
    filtered = records.filter(r => r.date >= cutoff);
  } else {
    const target = month || now.toISOString().slice(0, 7);
    filtered = records.filter(r => r.date.startsWith(target));
  }
  const income = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const byCategory = {};
  filtered.forEach(r => {
    const key = r.categoryName || r.categoryId;
    if (!byCategory[key]) byCategory[key] = { income: 0, expense: 0 };
    byCategory[key][r.type] += r.amount;
  });
  const dailyTrend = {};
  filtered.forEach(r => {
    if (!dailyTrend[r.date]) dailyTrend[r.date] = { income: 0, expense: 0 };
    dailyTrend[r.date][r.type] += r.amount;
  });
  const budgets = await storage.get('budgets') || [];
  console.log(`统计: period=${period}, 收入=${centToYuan(income)}, 支出=${centToYuan(expense)}`);
  return {
    structuredContent: {
      period, income, expense, balance: income - expense,
      byCategory, dailyTrend, budgets,
      incomeYuan: centToYuan(income),
      expenseYuan: centToYuan(expense),
    },
  };
});

// ========== 工具 7: 设置预算 ==========
registerAppTool(mcpServer, 'set_budget', {
  title: '设置预算',
  description: '设置或清除月度预算，超支时自动通知',
  inputSchema: z.object({
    category: z.string().describe('分类 ID 或 "total" 表示总预算'),
    amount: z.number().describe('预算金额（元），设为 0 则清除'),
  }),
  _meta: { ui: { resourceUri } },
}, async ({ category, amount }) => {
  const budgets = await storage.get('budgets') || [];
  const idx = budgets.findIndex(b => b.category === category);
  if (amount <= 0) {
    if (idx !== -1) budgets.splice(idx, 1);
    await storage.set('budgets', budgets);
    if (budgets.length === 0) await storage.delete('budgets');
    return { structuredContent: { success: true, message: `已清除 ${category} 预算` } };
  }
  const budget = { category, amount: yuanToCent(amount), updatedAt: new Date().toISOString() };
  if (idx !== -1) budgets[idx] = budget; else budgets.push(budget);
  await storage.set('budgets', budgets);
  await notification.send('预算设置成功', `${category} 预算已设为 ¥${amount}`);
  console.log(`${user.name} 设置预算: ${category} = ¥${amount}`);
  return { structuredContent: { success: true, budget } };
});

// ========== 工具 8: 汇率换算 ==========
registerAppTool(mcpServer, 'convert_currency', {
  title: '汇率换算',
  description: '查询实时汇率并换算金额',
  inputSchema: z.object({
    amount: z.number().describe('金额（元）'),
    from: z.string().describe('源货币，默认 CNY').optional(),
    to: z.enum(['USD', 'EUR', 'JPY', 'GBP', 'HKD']).describe('目标货币'),
  }),
}, async ({ amount, from = 'CNY', to }) => {
  // 先检查缓存（1小时有效）
  const cacheKey = 'cache:rates';
  const cached = await storage.get(cacheKey);
  let rates;
  if (cached && Date.now() - cached.ts < 3600000) {
    rates = cached.rates;
    console.log('使用缓存汇率');
  } else {
    const res = await http.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      { headers: { 'Accept': 'application/json' }, timeout: 5000 }
    );
    rates = res.data.rates;
    await storage.set(cacheKey, { rates, ts: Date.now() });
    console.log(`汇率已更新并缓存: ${from} -> ${Object.keys(rates).length} 种货币`);
  }
  const rate = rates[to];
  const converted = Math.round(amount * rate * 100) / 100;
  return {
    structuredContent: { amount, from, to, rate, converted },
  };
});

// ========== 工具 9: 导出数据 ==========
registerAppTool(mcpServer, 'export_data', {
  title: '导出数据',
  description: '导出收支记录为 CSV 格式文本',
  inputSchema: z.object({
    month: z.string().describe('月份 YYYY-MM，留空导出全部').optional(),
    format: z.enum(['csv', 'json']).describe('导出格式').optional(),
  }),
  annotations: { readOnlyHint: true },
}, async ({ month, format = 'csv' }) => {
  let records = await getRecords();
  if (month) records = records.filter(r => r.date.startsWith(month));
  records.sort((a, b) => a.date.localeCompare(b.date));
  let output;
  if (format === 'csv') {
    const header = '日期,类型,分类,金额(元),备注';
    const rows = records.map(r =>
      `${r.date},${r.type === 'income' ? '收入' : '支出'},${r.categoryName},${centToYuan(r.amount)},${r.note || ''}`
    );
    output = [header, ...rows].join('\n');
  } else {
    output = JSON.stringify(records.map(r => ({
      ...r, amountYuan: centToYuan(r.amount),
    })), null, 2);
  }
  console.log(`导出: ${records.length} 条记录, 格式=${format}`);
  return {
    content: [{ type: 'text', text: output }],
    structuredContent: { count: records.length, format },
  };
});
```

### 个人记账本 UI（HTML）— 作为 `html` 参数的 `main` 资源传入

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
/* ===== 基础重置 ===== */
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB",sans-serif;
  font-size:14px;line-height:1.5;
  background:#f5f5f5;color:#1a1a1a;
  transition:background .3s,color .3s;
}
body.dark{background:#0d0d0d;color:#e5e5e5}

/* ===== 页面容器 ===== */
.app-root{display:flex;flex-direction:column;height:100%;overflow:hidden}
.page-container{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 16px 80px;-webkit-overflow-scrolling:touch}
.page{display:none;animation:fadeIn .25s ease}
.page.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ===== 底部导航 ===== */
.bottom-nav{
  position:fixed;bottom:0;left:0;right:0;
  display:flex;height:56px;
  background:#fff;border-top:1px solid #e5e5e5;
  z-index:100;
}
body.dark .bottom-nav{background:#1a1a1a;border-color:#333}
.nav-item{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-size:10px;color:#999;cursor:pointer;transition:color .2s;
  -webkit-tap-highlight-color:transparent;
}
.nav-item.active{color:#4f46e5}
body.dark .nav-item.active{color:#818cf8}
.nav-icon{font-size:20px;margin-bottom:2px}

/* ===== FAB 浮动按钮 ===== */
.fab{
  position:fixed;bottom:72px;right:16px;
  width:52px;height:52px;border-radius:50%;
  background:#4f46e5;color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:28px;cursor:pointer;z-index:101;
  box-shadow:0 4px 12px rgba(79,70,229,.4);
  transition:transform .2s,box-shadow .2s;
}
.fab:active{transform:scale(.92);box-shadow:0 2px 6px rgba(79,70,229,.3)}
body.dark .fab{background:#6366f1;box-shadow:0 4px 12px rgba(99,102,241,.4)}

/* ===== 卡片 ===== */
.card{
  background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;
  box-shadow:0 1px 3px rgba(0,0,0,.06);
}
body.dark .card{background:#1a1a1a;box-shadow:0 1px 3px rgba(0,0,0,.3)}

/* ===== 概览卡片 ===== */
.overview{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.overview-item{
  text-align:center;padding:12px 8px;border-radius:10px;
  background:#f8f8f8;
}
body.dark .overview-item{background:#222}
.overview-item .label{font-size:11px;color:#888;margin-bottom:4px}
.overview-item .value{font-size:18px;font-weight:700}
.overview-item .value.income{color:#10b981}
.overview-item .value.expense{color:#ef4444}
.overview-item .value.balance{color:#4f46e5}
body.dark .overview-item .value.balance{color:#818cf8}

/* ===== 预算进度条 ===== */
.budget-bar{margin-bottom:12px}
.budget-bar .bar-bg{
  height:8px;border-radius:4px;background:#e5e5e5;overflow:hidden;
}
body.dark .budget-bar .bar-bg{background:#333}
.budget-bar .bar-fill{height:100%;border-radius:4px;transition:width .5s ease}
.budget-bar .bar-label{display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px}

/* ===== 记录列表 ===== */
.record-group-title{font-size:12px;color:#888;margin:12px 0 6px;font-weight:600}
.record-item{
  display:flex;align-items:center;padding:10px 0;
  border-bottom:1px solid #f0f0f0;position:relative;
  transition:background .15s;cursor:pointer;
}
.record-item:hover{background:rgba(0,0,0,.03)}
body.dark .record-item{border-color:#222}
body.dark .record-item:hover{background:rgba(255,255,255,.05)}
.record-item .icon{
  width:36px;height:36px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;background:#f0f0f0;margin-right:10px;flex-shrink:0;
}
body.dark .record-item .icon{background:#222}
.record-item .info{flex:1;min-width:0}
.record-item .info .name{font-size:14px;font-weight:500}
.record-item .info .note{font-size:11px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.record-item .amount{font-size:15px;font-weight:600;flex-shrink:0;margin-left:8px}
.record-item .amount.income{color:#10b981}
.record-item .amount.expense{color:#ef4444}
.record-item .delete-btn{
  flex-shrink:0;margin-left:8px;
  background:none;color:#ccc;border:none;border-radius:6px;
  padding:4px 8px;font-size:16px;cursor:pointer;
  opacity:0;transition:opacity .15s,color .15s;
}
.record-item:hover .delete-btn{opacity:1}
.record-item .delete-btn:hover{color:#ef4444}
body.dark .record-item .delete-btn{color:#555}
body.dark .record-item .delete-btn:hover{color:#ef4444}
@media (hover:none){.record-item .delete-btn{opacity:1;color:#ccc}}

/* ===== 筛选栏 ===== */
.filter-bar{display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px}
.filter-btn{
  padding:6px 14px;border-radius:20px;border:1px solid #ddd;
  background:transparent;font-size:12px;cursor:pointer;white-space:nowrap;
  color:#666;transition:all .2s;
}
body.dark .filter-btn{border-color:#444;color:#aaa}
.filter-btn.active{background:#4f46e5;color:#fff;border-color:#4f46e5}
body.dark .filter-btn.active{background:#6366f1;border-color:#6366f1}

/* ===== 弹窗 ===== */
.modal-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;
  display:none;align-items:flex-end;justify-content:center;
}
.modal-overlay.show{display:flex}
.modal{
  width:100%;max-width:420px;max-height:85vh;
  background:#fff;border-radius:16px 16px 0 0;
  padding:20px 16px;overflow-y:auto;
  animation:slideUp .3s ease;
}
body.dark .modal{background:#1a1a1a}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.modal-header h3{font-size:16px;font-weight:600}
.modal-close{
  width:28px;height:28px;border-radius:50%;border:none;
  background:#f0f0f0;cursor:pointer;font-size:16px;
  display:flex;align-items:center;justify-content:center;
}
body.dark .modal-close{background:#333;color:#e5e5e5}

/* ===== 类型切换 ===== */
.type-switch{display:flex;gap:0;margin-bottom:16px;border-radius:8px;overflow:hidden;border:1px solid #ddd}
body.dark .type-switch{border-color:#444}
.type-switch button{
  flex:1;padding:8px;border:none;background:transparent;
  font-size:13px;cursor:pointer;font-weight:500;color:#666;
  transition:all .2s;
}
body.dark .type-switch button{color:#aaa}
.type-switch button.active-expense{background:#fef2f2;color:#ef4444}
.type-switch button.active-income{background:#ecfdf5;color:#10b981}

/* ===== 分类网格 ===== */
.category-grid{
  display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;
}
.cat-item{
  display:flex;flex-direction:column;align-items:center;
  padding:8px 4px;border-radius:10px;cursor:pointer;
  font-size:11px;color:#666;transition:all .2s;
}
body.dark .cat-item{color:#aaa}
.cat-item .cat-icon{font-size:22px;margin-bottom:2px}
.cat-item.selected{background:#eef2ff;color:#4f46e5}
body.dark .cat-item.selected{background:#1e1b4b;color:#818cf8}

/* ===== 数字键盘 ===== */
.numpad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}
.numpad button{
  padding:14px;border:none;border-radius:10px;
  font-size:18px;font-weight:500;cursor:pointer;
  background:#f5f5f5;color:#1a1a1a;
  transition:background .1s;
  -webkit-tap-highlight-color:transparent;
}
body.dark .numpad button{background:#222;color:#e5e5e5}
.numpad button:active{background:#e0e0e0}
body.dark .numpad button:active{background:#333}
.numpad .key-confirm{
  background:#4f46e5;color:#fff;grid-row:span 2;
  display:flex;align-items:center;justify-content:center;
}
body.dark .numpad .key-confirm{background:#6366f1}
.numpad .key-confirm:active{background:#4338ca}

/* ===== 金额显示 ===== */
.amount-display{
  font-size:32px;font-weight:700;text-align:right;
  padding:12px 0;border-bottom:2px solid #4f46e5;margin-bottom:12px;
  min-height:52px;
}
body.dark .amount-display{border-color:#6366f1}

/* ===== 输入框 ===== */
.input-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.input-row label{font-size:13px;color:#888;white-space:nowrap;width:48px}
.input-row input,.input-row select{
  flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:8px;
  font-size:14px;background:transparent;color:inherit;
}
body.dark .input-row input,body.dark .input-row select{border-color:#444;background:#222}

/* ===== 统计页 ===== */
.stat-period{display:flex;gap:8px;margin-bottom:16px}
.stat-period button{
  padding:6px 16px;border-radius:20px;border:1px solid #ddd;
  background:transparent;font-size:13px;cursor:pointer;color:#666;
}
body.dark .stat-period button{border-color:#444;color:#aaa}
.stat-period button.active{background:#4f46e5;color:#fff;border-color:#4f46e5}
body.dark .stat-period button.active{background:#6366f1;border-color:#6366f1}
.chart-container{margin-bottom:16px}
.chart-container canvas{width:100%;border-radius:8px}

/* ===== 设置页 ===== */
.setting-item{
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 0;border-bottom:1px solid #f0f0f0;
}
body.dark .setting-item{border-color:#222}
.setting-item .label{font-size:14px}
.setting-item .value{font-size:13px;color:#888}
.setting-item .action{
  padding:6px 14px;border-radius:8px;border:1px solid #ddd;
  background:transparent;font-size:12px;cursor:pointer;color:#666;
}
body.dark .setting-item .action{border-color:#444;color:#aaa}

/* ===== 下拉刷新 ===== */
.pull-indicator{
  text-align:center;padding:8px;font-size:12px;color:#999;
  display:none;
}
.pull-indicator.show{display:block}

/* ===== 空状态 ===== */
.empty-state{text-align:center;padding:40px 0;color:#999}
.empty-state .empty-icon{font-size:48px;margin-bottom:8px}
</style>
</head>
<body>
<div class="app-root">
  <!-- 下拉刷新指示器 -->
  <div class="pull-indicator" id="pullIndicator">下拉刷新...</div>

  <!-- 页面容器 -->
  <div class="page-container" id="pageContainer">

    <!-- 首页 Dashboard -->
    <div class="page active" id="pageDashboard">
      <div class="overview" id="overview"></div>
      <div class="budget-bar" id="budgetBar" style="display:none">
        <div style="font-size:12px;color:#888;margin-bottom:4px">月度预算</div>
        <div class="bar-bg"><div class="bar-fill" id="budgetFill"></div></div>
        <div class="bar-label"><span id="budgetSpent"></span><span id="budgetTotal"></span></div>
      </div>
      <div class="card">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">最近记录</div>
        <div id="recentList"></div>
      </div>
    </div>

    <!-- 记录列表页 -->
    <div class="page" id="pageRecords">
      <div class="filter-bar" id="filterBar"></div>
      <div id="recordsList"></div>
      <div class="empty-state" id="recordsEmpty" style="display:none">
        <div class="empty-icon">📝</div>
        <div>暂无记录，点击 + 开始记账</div>
      </div>
    </div>

    <!-- 统计页 -->
    <div class="page" id="pageStats">
      <div class="stat-period">
        <button class="active" data-period="month">月度</button>
        <button data-period="week">周度</button>
      </div>
      <div class="overview" id="statsOverview"></div>
      <div class="card chart-container">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">分类占比</div>
        <canvas id="pieChart" height="200"></canvas>
      </div>
      <div class="card chart-container">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">每日趋势</div>
        <canvas id="barChart" height="160"></canvas>
      </div>
      <button id="exportBtn" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;background:transparent;font-size:13px;cursor:pointer;color:#666;margin-top:8px">
        导出本月数据
      </button>
    </div>

    <!-- 设置页 -->
    <div class="page" id="pageSettings">
      <div class="card">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">用户信息</div>
        <div class="setting-item"><span class="label">用户 ID</span><span class="value" id="settUserId">-</span></div>
        <div class="setting-item"><span class="label">用户名</span><span class="value" id="settUserName">-</span></div>
        <div class="setting-item"><span class="label">邮箱</span><span class="value" id="settUserEmail">-</span></div>
      </div>
      <div class="card">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">预算管理</div>
        <div class="setting-item">
          <span class="label">月度总预算</span>
          <span><span class="value" id="settBudget">未设置</span>
          <button class="action" id="setBudgetBtn">设置</button></span>
        </div>
      </div>
      <div class="card">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">汇率换算</div>
        <div class="input-row">
          <label>金额</label>
          <input type="number" id="convertAmount" value="100" min="0">
          <select id="convertCurrency"><option>USD</option><option>EUR</option><option>JPY</option><option>GBP</option><option>HKD</option></select>
          <button class="action" id="convertBtn">换算</button>
        </div>
        <div id="convertResult" style="font-size:13px;color:#888;margin-top:4px"></div>
      </div>
      <div class="card">
        <div class="setting-item">
          <span class="label">帮助文档</span>
          <button class="action" id="helpBtn">打开</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部导航 -->
  <nav class="bottom-nav">
    <div class="nav-item active" data-page="pageDashboard"><span class="nav-icon">🏠</span>首页</div>
    <div class="nav-item" data-page="pageRecords"><span class="nav-icon">📋</span>记录</div>
    <div class="nav-item" data-page="pageStats"><span class="nav-icon">📊</span>统计</div>
    <div class="nav-item" data-page="pageSettings"><span class="nav-icon">⚙️</span>设置</div>
  </nav>

  <!-- FAB 浮动按钮 -->
  <div class="fab" id="fabAdd">+</div>
</div>

<!-- 添加/编辑弹窗 -->
<div class="modal-overlay" id="addModal">
  <div class="modal">
    <div class="modal-header">
      <h3 id="modalTitle">记一笔</h3>
      <button class="modal-close" id="modalClose">×</button>
    </div>
    <div class="type-switch">
      <button id="typeExpense" class="active-expense">支出</button>
      <button id="typeIncome">收入</button>
    </div>
    <div class="amount-display" id="amountDisplay">0</div>
    <div class="category-grid" id="categoryGrid"></div>
    <div class="input-row">
      <label>日期</label>
      <input type="date" id="inputDate">
    </div>
    <div class="input-row">
      <label>备注</label>
      <input type="text" id="inputNote" placeholder="添加备注...">
    </div>
    <div class="numpad">
      <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
      <button data-key="del">⌫</button>
      <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
      <button class="key-confirm" data-key="ok" id="numpadOk">✓</button>
      <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
      <button data-key="0">0</button><button data-key="00">00</button><button data-key=".">.</button>
    </div>
  </div>
</div>

<script>
// ===== View SDK 全覆盖 =====
const app = new App(
  { name: 'expense-tracker', version: '1.0.0' },
  { tools: true, resources: true },
  {}
);

// 全局状态
let state = {
  records: [], categories: [], budgets: [],
  currentPage: 'pageDashboard',
  editingId: null,
  addType: 'expense',
  selectedCatId: null,
  amountStr: '0',
  statPeriod: 'month',
  userInfo: null,
};

// ===== 启动连接 =====
async function init() {
  try {
    const result = await app.connect();
    // 读取初始主题
    if (app.hostContext && app.hostContext.theme === 'dark') {
      document.body.classList.add('dark');
    }
    // 初始化应用数据
    const initResult = await app.callServerTool('init_app', {});
    if (initResult && initResult.structuredContent) {
      state.userInfo = initResult.structuredContent.user;
    }
    await loadData();
    renderDashboard();
    app.requestResize(undefined, 600);
  } catch (e) {
    document.getElementById('pageContainer').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><div>连接失败: ' + e.message + '</div></div>';
  }
}

// ===== 数据加载 =====
async function loadData() {
  try {
    const listResult = await app.callServerTool('list_transactions', {
      type: 'all', page: 1, pageSize: 500,
    });
    if (listResult && listResult.structuredContent) {
      state.records = listResult.structuredContent.records || [];
    }
    // 通过 readResource 读取额外资源（演示 readResource API）
    try { await app.readResource(resourceUri || 'ui://mango/main'); } catch (_) {}
  } catch (e) {
    console.error('loadData error:', e);
  }
}

// ===== 渲染：Dashboard =====
function renderDashboard() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthRecords = state.records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const income = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const balance = income - expense;
  const c2y = v => (v / 100).toFixed(2);

  document.getElementById('overview').innerHTML =
    '<div class="overview-item"><div class="label">收入</div><div class="value income">+' + c2y(income) + '</div></div>' +
    '<div class="overview-item"><div class="label">支出</div><div class="value expense">-' + c2y(expense) + '</div></div>' +
    '<div class="overview-item"><div class="label">余额</div><div class="value balance">' + c2y(balance) + '</div></div>';

  // 预算进度条
  const budgets = state.budgets || [];
  const totalBudget = budgets.find(b => b.category === 'total');
  const budgetBar = document.getElementById('budgetBar');
  if (totalBudget) {
    budgetBar.style.display = '';
    const pct = Math.min(100, Math.round(expense / totalBudget.amount * 100));
    const fill = document.getElementById('budgetFill');
    fill.style.width = pct + '%';
    fill.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
    document.getElementById('budgetSpent').textContent = '已用 ' + c2y(expense);
    document.getElementById('budgetTotal').textContent = '预算 ' + c2y(totalBudget.amount);
  } else {
    budgetBar.style.display = 'none';
  }

  // 最近5条
  const recent = state.records.slice().sort((a, b) =>
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  ).slice(0, 5);
  document.getElementById('recentList').innerHTML = recent.length
    ? recent.map(r => renderRecordItem(r)).join('')
    : '<div class="empty-state"><div class="empty-icon">📝</div><div>暂无记录</div></div>';
}

// ===== 渲染：单条记录 =====
function renderRecordItem(r) {
  const c2y = v => (v / 100).toFixed(2);
  const sign = r.type === 'income' ? '+' : '-';
  const cls = r.type;
  const icon = r.categoryIcon || (r.type === 'income' ? '💰' : '📦');
  return '<div class="record-item" data-id="' + r.id + '">' +
    '<div class="icon">' + icon + '</div>' +
    '<div class="info"><div class="name">' + (r.categoryName || r.categoryId) + '</div>' +
    '<div class="note">' + (r.note || '') + '</div></div>' +
    '<div class="amount ' + cls + '">' + sign + c2y(r.amount) + '</div>' +
    '<button class="delete-btn" data-id="' + r.id + '" title="删除">&#x1f5d1;</button></div>';
}

// ===== 渲染：记录列表页 =====
function renderRecords() {
  const sorted = state.records.slice().sort((a, b) =>
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
  const container = document.getElementById('recordsList');
  const empty = document.getElementById('recordsEmpty');
  if (!sorted.length) {
    container.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  let html = '';
  let lastDate = '';
  sorted.forEach(r => {
    if (r.date !== lastDate) {
      lastDate = r.date;
      html += '<div class="record-group-title">' + r.date + '</div>';
    }
    html += renderRecordItem(r);
  });
  container.innerHTML = html;
}

// ===== 渲染：统计页 =====
async function renderStats() {
  try {
    const res = await app.callServerTool('get_statistics', { period: state.statPeriod });
    const d = res && res.structuredContent;
    if (!d) return;
    const c2y = v => (v / 100).toFixed(2);
    document.getElementById('statsOverview').innerHTML =
      '<div class="overview-item"><div class="label">收入</div><div class="value income">+' + c2y(d.income) + '</div></div>' +
      '<div class="overview-item"><div class="label">支出</div><div class="value expense">-' + c2y(d.expense) + '</div></div>' +
      '<div class="overview-item"><div class="label">结余</div><div class="value balance">' + c2y(d.balance) + '</div></div>';
    drawPieChart(d.byCategory);
    drawBarChart(d.dailyTrend);
  } catch (e) { console.error('renderStats:', e); }
}

// ===== 饼图绘制 =====
function drawPieChart(byCategory) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth * 2;
  const h = canvas.height = 400;
  ctx.clearRect(0, 0, w, h);
  const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
  const isDark = document.body.classList.contains('dark');
  const entries = Object.entries(byCategory || {}).filter(([, v]) => v.expense > 0);
  if (!entries.length) {
    ctx.fillStyle = isDark ? '#666' : '#999';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', w / 2, h / 2);
    return;
  }
  const total = entries.reduce((s, [, v]) => s + v.expense, 0);
  const cx = w * 0.35, cy = h / 2, r = Math.min(cx, cy) - 20;
  let angle = -Math.PI / 2;
  entries.forEach(([name, v], i) => {
    const slice = (v.expense / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;
  });
  // 图例
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  const lx = w * 0.7, ly = 40;
  entries.forEach(([name, v], i) => {
    const y = ly + i * 36;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(lx, y, 20, 20);
    ctx.fillStyle = isDark ? '#e5e5e5' : '#333';
    ctx.fillText(name + ' ' + (v.expense / 100).toFixed(0), lx + 28, y + 16);
  });
}

// ===== 柱状图绘制 =====
function drawBarChart(dailyTrend) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth * 2;
  const h = canvas.height = 320;
  ctx.clearRect(0, 0, w, h);
  const isDark = document.body.classList.contains('dark');
  const days = Object.keys(dailyTrend || {}).sort();
  if (!days.length) {
    ctx.fillStyle = isDark ? '#666' : '#999';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', w / 2, h / 2);
    return;
  }
  const maxVal = Math.max(...days.map(d =>
    Math.max(dailyTrend[d].income || 0, dailyTrend[d].expense || 0)
  )) || 1;
  const pad = 60, barW = Math.min(30, (w - pad * 2) / days.length / 2.5);
  const chartH = h - 60;
  days.forEach((day, i) => {
    const x = pad + i * ((w - pad * 2) / days.length);
    const inc = dailyTrend[day].income || 0;
    const exp = dailyTrend[day].expense || 0;
    // 收入柱
    const ih = (inc / maxVal) * chartH;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x, chartH - ih + 20, barW, ih);
    // 支出柱
    const eh = (exp / maxVal) * chartH;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + barW + 2, chartH - eh + 20, barW, eh);
    // 日期标签
    ctx.fillStyle = isDark ? '#888' : '#999';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(day.slice(5), x + barW, h - 4);
  });
}

// ===== 渲染：设置页 =====
function renderSettings() {
  if (state.userInfo) {
    document.getElementById('settUserId').textContent = state.userInfo.id || '-';
    document.getElementById('settUserName').textContent = state.userInfo.name || '-';
    document.getElementById('settUserEmail').textContent = state.userInfo.email || '-';
  }
  const budgets = state.budgets || [];
  const total = budgets.find(b => b.category === 'total');
  document.getElementById('settBudget').textContent =
    total ? '¥' + (total.amount / 100).toFixed(2) : '未设置';
}

// ===== 页面导航 =====
function switchPage(pageId) {
  state.currentPage = pageId;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === pageId);
  });
  if (pageId === 'pageDashboard') renderDashboard();
  if (pageId === 'pageRecords') renderRecords();
  if (pageId === 'pageStats') renderStats();
  if (pageId === 'pageSettings') renderSettings();
  app.requestResize(undefined, document.body.scrollHeight);
}

// 底部导航点击
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchPage(item.dataset.page));
});

// ===== 弹窗控制 =====
const addModal = document.getElementById('addModal');
const defaultCats = [
  {id:'food',name:'餐饮',icon:'🍜',type:'expense'},
  {id:'transport',name:'交通',icon:'🚌',type:'expense'},
  {id:'shopping',name:'购物',icon:'🛒',type:'expense'},
  {id:'fun',name:'娱乐',icon:'🎮',type:'expense'},
  {id:'medical',name:'医疗',icon:'💊',type:'expense'},
  {id:'housing',name:'住房',icon:'🏠',type:'expense'},
  {id:'other_out',name:'其他',icon:'📦',type:'expense'},
  {id:'salary',name:'工资',icon:'💰',type:'income'},
  {id:'bonus',name:'奖金',icon:'🎁',type:'income'},
  {id:'invest',name:'投资',icon:'📈',type:'income'},
  {id:'other_in',name:'其他',icon:'💵',type:'income'},
];

function openAddModal(editRecord) {
  state.editingId = editRecord ? editRecord.id : null;
  state.addType = editRecord ? editRecord.type : 'expense';
  state.amountStr = editRecord ? (editRecord.amount / 100).toString() : '0';
  state.selectedCatId = editRecord ? editRecord.categoryId : null;
  document.getElementById('modalTitle').textContent =
    editRecord ? '编辑记录' : '记一笔';
  document.getElementById('inputDate').value =
    editRecord ? editRecord.date : new Date().toISOString().slice(0, 10);
  document.getElementById('inputNote').value =
    editRecord ? (editRecord.note || '') : '';
  updateTypeSwitch();
  renderCategoryGrid();
  updateAmountDisplay();
  addModal.classList.add('show');
}

function closeAddModal() {
  addModal.classList.remove('show');
  state.editingId = null;
}

// ===== 类型切换 =====
function updateTypeSwitch() {
  const expBtn = document.getElementById('typeExpense');
  const incBtn = document.getElementById('typeIncome');
  expBtn.className = state.addType === 'expense' ? 'active-expense' : '';
  incBtn.className = state.addType === 'income' ? 'active-income' : '';
}

document.getElementById('typeExpense').addEventListener('click', () => {
  state.addType = 'expense';
  state.selectedCatId = null;
  updateTypeSwitch();
  renderCategoryGrid();
});
document.getElementById('typeIncome').addEventListener('click', () => {
  state.addType = 'income';
  state.selectedCatId = null;
  updateTypeSwitch();
  renderCategoryGrid();
});

// ===== 分类网格 =====
function renderCategoryGrid() {
  const cats = defaultCats.filter(c => c.type === state.addType);
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = cats.map(c =>
    '<div class="cat-item' + (state.selectedCatId === c.id ? ' selected' : '') +
    '" data-cat="' + c.id + '">' +
    '<span class="cat-icon">' + c.icon + '</span>' + c.name + '</div>'
  ).join('');
  grid.querySelectorAll('.cat-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedCatId = el.dataset.cat;
      renderCategoryGrid();
    });
  });
}

// ===== 数字键盘 =====
function updateAmountDisplay() {
  document.getElementById('amountDisplay').textContent =
    state.amountStr === '0' ? '0' : state.amountStr;
}

document.querySelectorAll('.numpad button').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    if (key === 'ok') { submitRecord(); return; }
    if (key === 'del') {
      state.amountStr = state.amountStr.length > 1
        ? state.amountStr.slice(0, -1) : '0';
    } else if (key === '.') {
      if (!state.amountStr.includes('.')) state.amountStr += '.';
    } else if (key === '00') {
      if (state.amountStr !== '0') state.amountStr += '00';
    } else {
      if (state.amountStr === '0') state.amountStr = key;
      else state.amountStr += key;
    }
    // 限制小数点后两位
    const dot = state.amountStr.indexOf('.');
    if (dot !== -1 && state.amountStr.length - dot > 3) {
      state.amountStr = state.amountStr.slice(0, dot + 3);
    }
    updateAmountDisplay();
    // 视觉反馈
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = ''; }, 100);
  });
});

// ===== 提交记录 =====
async function submitRecord() {
  const amount = parseFloat(state.amountStr);
  if (!amount || amount <= 0) return;
  if (!state.selectedCatId) return;
  const date = document.getElementById('inputDate').value;
  const note = document.getElementById('inputNote').value;
  try {
    if (state.editingId) {
      await app.callServerTool('update_transaction', {
        id: state.editingId, amount, categoryId: state.selectedCatId,
        note, date,
      });
    } else {
      await app.callServerTool('add_transaction', {
        type: state.addType, amount, categoryId: state.selectedCatId,
        note, date,
      });
    }
    closeAddModal();
    await loadData();
    switchPage(state.currentPage);
  } catch (e) { console.error('submit error:', e); }
}

// ===== FAB 和弹窗事件 =====
document.getElementById('fabAdd').addEventListener('click', () => openAddModal());
document.getElementById('modalClose').addEventListener('click', closeAddModal);
addModal.addEventListener('click', (e) => {
  if (e.target === addModal) closeAddModal();
});

// ===== 删除和编辑（事件委托） =====
document.addEventListener('click', async (e) => {
  // 删除按钮
  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (!id) return;
    try {
      await app.callServerTool('delete_transaction', { id });
      await loadData();
      switchPage(state.currentPage);
    } catch (err) { console.error('delete error:', err); }
    return;
  }
  // 点击记录项 → 编辑
  const item = e.target.closest('.record-item');
  if (item && !e.target.classList.contains('delete-btn')) {
    const id = item.dataset.id;
    const r = state.records.find(rec => rec.id === id);
    if (r) openAddModal(r);
  }
});

// ===== 设置页：预算按钮 =====
document.getElementById('setBudgetBtn').addEventListener('click', async () => {
  const input = prompt('请输入月度总预算金额（元），输入 0 清除预算：');
  if (input === null) return;
  const amount = parseFloat(input);
  if (isNaN(amount)) return;
  try {
    await app.callServerTool('set_budget', { category: 'total', amount });
    state.budgets = amount > 0
      ? [{ category: 'total', amount: Math.round(amount * 100) }]
      : [];
    renderSettings();
    renderDashboard();
  } catch (e) { console.error('setBudget error:', e); }
});

// ===== 设置页：汇率换算 =====
document.getElementById('convertBtn').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('convertAmount').value);
  const to = document.getElementById('convertCurrency').value;
  if (!amount || amount <= 0) return;
  const el = document.getElementById('convertResult');
  el.textContent = '查询中...';
  try {
    const res = await app.callServerTool('convert_currency', { amount, to });
    const d = res && res.structuredContent;
    if (d) el.textContent = amount + ' CNY = ' + d.converted + ' ' + d.to + ' (汇率: ' + d.rate + ')';
  } catch (e) { el.textContent = '查询失败: ' + e.message; }
});

// ===== 统计页：导出按钮（演示 sendMessage） =====
document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const res = await app.callServerTool('export_data', {
      month: new Date().toISOString().slice(0, 7), format: 'csv',
    });
    const text = res && res.content && res.content[0] && res.content[0].text;
    if (text) {
      await app.sendMessage('user', '请帮我整理以下记账数据：\n' + text);
    }
  } catch (e) { console.error('export error:', e); }
});

// ===== 设置页：帮助按钮（演示 openLink） =====
document.getElementById('helpBtn').addEventListener('click', async () => {
  try {
    await app.openLink('https://docs.example.com/expense-tracker');
  } catch (e) { console.error('openLink error:', e); }
});

// ===== 统计周期切换 =====
document.querySelectorAll('.stat-period button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.statPeriod = btn.dataset.period;
    document.querySelectorAll('.stat-period button').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    renderStats();
  });
});

// ===== View SDK 事件回调（全覆盖） =====

// 监听 Agent 工具输入
app.ontoolinput = function(params) {
  console.log('ontoolinput:', JSON.stringify(params));
};

// 监听流式工具输入
app.ontoolinputpartial = function(params) {
  console.log('ontoolinputpartial:', JSON.stringify(params));
};

// 监听工具结果推送 — 自动刷新数据
app.ontoolresult = async function(result) {
  console.log('ontoolresult:', JSON.stringify(result));
  if (result && result.structuredContent && result.structuredContent.success) {
    await loadData();
    switchPage(state.currentPage);
  }
};

// 监听工具取消
app.ontoolcancelled = function(params) {
  console.log('ontoolcancelled:', params && params.reason);
};

// 监听 Host 上下文变化（暗色模式切换）
app.onhostcontextchanged = function(ctx) {
  if (ctx && ctx.theme) {
    document.body.classList.toggle('dark', ctx.theme === 'dark');
    // 重绘图表以适配新主题
    if (state.currentPage === 'pageStats') renderStats();
  }
};

// View 销毁前清理资源
app.onteardown = function() {
  console.log('teardown: 清理资源');
  return { status: 'ok' };
};

// ===== 下拉刷新 =====
let pullStartY = 0;
const container = document.getElementById('pageContainer');
container.addEventListener('touchstart', (e) => {
  if (container.scrollTop === 0) pullStartY = e.touches[0].clientY;
});
container.addEventListener('touchend', async (e) => {
  if (pullStartY && e.changedTouches[0].clientY - pullStartY > 80) {
    document.getElementById('pullIndicator').classList.add('show');
    await loadData();
    switchPage(state.currentPage);
    document.getElementById('pullIndicator').classList.remove('show');
  }
  pullStartY = 0;
});

// ===== 启动 =====
init();

</script>
</body>
</html>
```

### 个人记账本 skill

````markdown
---
name: transaction
description: "记录和管理个人收支，支持分类统计、预算提醒、汇率换算和数据导出"
keywords: [记账, 收入, 支出, 账单, 预算, 消费, 统计]
triggers: [记一笔, 添加支出, 添加收入, 查看账单, 本月支出, 设置预算, 汇率换算, 导出数据]
tags: [miniapp, 财务]
priority: 6
---

# 个人记账本

## When to Use
- 用户说"记一笔"、"花了xx元"、"添加支出"、"收入xx元"
- 用户说"查看账单"、"本月支出"、"收支统计"
- 用户说"设置预算"、"预算提醒"
- 用户说"汇率换算"、"换成美元"
- 用户说"导出数据"、"导出账单"
- 用户说"编辑记录"、"删除记录"

## Tools

### init_app
初始化记账本，首次使用时自动创建默认分类和设置。

### add_transaction
添加一笔收入或支出记录。
- `type` (enum): income 收入 / expense 支出
- `amount` (number): 金额（元）
- `categoryId` (string): 分类 ID
- `note` (string): 备注
- `date` (string): 日期 YYYY-MM-DD

### update_transaction
编辑一条收支记录。
- `id` (string): 记录 ID
- `amount` (number): 新金额
- `categoryId` (string): 新分类
- `note` (string): 新备注
- `date` (string): 新日期

### delete_transaction
删除一条收支记录。
- `id` (string): 记录 ID

### list_transactions
按条件筛选收支记录，支持分页。
- `type` (enum): all / income / expense
- `categoryId` (string): 分类筛选
- `startDate` (string): 起始日期
- `endDate` (string): 结束日期
- `page` (number): 页码
- `pageSize` (number): 每页条数

### get_statistics
获取月度或周度收支统计。
- `period` (enum): month / week
- `month` (string): 月份 YYYY-MM

### set_budget
设置或清除月度预算。
- `category` (string): 分类 ID 或 "total"
- `amount` (number): 预算金额，0 则清除

### convert_currency
查询实时汇率并换算金额。
- `amount` (number): 金额（元）
- `to` (enum): USD / EUR / JPY / GBP / HKD

### export_data
导出收支记录。
- `month` (string): 月份，留空导出全部
- `format` (enum): csv / json
````
