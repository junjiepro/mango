# MiniApp 示例代码

本文档提供了几个 MiniApp 示例,帮助开发者理解如何创建和使用小应用。

## 目录

1. [待办事项管理器](#待办事项管理器)
2. [笔记本](#笔记本)
3. [倒计时提醒](#倒计时提醒)
4. [简单计算器](#简单计算器)

---

## 待办事项管理器

一个简单的待办事项管理小应用,支持创建、查看、更新和删除待办事项。

### 功能特性

- ✅ 创建待办事项
- ✅ 查看所有待办事项
- ✅ 标记完成/未完成
- ✅ 删除待办事项
- ✅ 数据持久化

### 代码实现

```javascript
// 待办事项管理器 MiniApp
// 支持 CRUD 操作

// 获取所有待办事项
async function getTodos() {
  const todos = await storage.get('todos') || [];
  return todos;
}

// 创建待办事项
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

// 更新待办事项
async function updateTodo(id, updates) {
  const todos = await getTodos();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('待办事项不存在');
  }
  todos[index] = { ...todos[index], ...updates };
  await storage.set('todos', todos);
  return todos[index];
}

// 删除待办事项
async function deleteTodo(id) {
  const todos = await getTodos();
  const filtered = todos.filter(t => t.id !== id);
  await storage.set('todos', filtered);
  return { success: true, deletedId: id };
}

// 主处理逻辑
switch (action) {
  case 'create':
    return createTodo(params.title, params.description);

  case 'read':
    if (params.id) {
      const todos = await getTodos();
      return todos.find(t => t.id === params.id);
    }
    return getTodos();

  case 'update':
    return updateTodo(params.id, params.updates);

  case 'delete':
    return deleteTodo(params.id);

  default:
    throw new Error('不支持的操作: ' + action);
}
```

### 使用示例

在对话中选择"待办事项管理器"小应用,然后:

- **创建**: "添加一个待办事项:完成项目报告"
- **查看**: "显示我的所有待办事项"
- **更新**: "标记'完成项目报告'为已完成"
- **删除**: "删除'完成项目报告'这个待办"

---

## 笔记本

一个简单的笔记管理小应用,支持创建、搜索和管理笔记。

### 功能特性

- 📝 创建笔记
- 🔍 搜索笔记
- 🏷️ 标签管理
- 📅 按日期排序

### 代码实现

```javascript
// 笔记本 MiniApp

async function getNotes() {
  return await storage.get('notes') || [];
}

async function createNote(title, content, tags = []) {
  const notes = await getNotes();
  const newNote = {
    id: Date.now().toString(),
    title,
    content,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.push(newNote);
  await storage.set('notes', notes);
  return newNote;
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

async function updateNote(id, updates) {
  const notes = await getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) {
    throw new Error('笔记不存在');
  }
  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await storage.set('notes', notes);
  return notes[index];
}

async function deleteNote(id) {
  const notes = await getNotes();
  const filtered = notes.filter(n => n.id !== id);
  await storage.set('notes', filtered);
  return { success: true, deletedId: id };
}

// 主处理逻辑
switch (action) {
  case 'create':
    return createNote(params.title, params.content, params.tags);

  case 'read':
    if (params.query) {
      return searchNotes(params.query);
    }
    if (params.id) {
      const notes = await getNotes();
      return notes.find(n => n.id === params.id);
    }
    return getNotes();

  case 'update':
    return updateNote(params.id, params.updates);

  case 'delete':
    return deleteNote(params.id);

  default:
    throw new Error('不支持的操作: ' + action);
}
```

### 使用示例

- **创建**: "创建一个笔记,标题是'会议记录',内容是'今天讨论了项目进度',标签是'工作,会议'"
- **搜索**: "搜索包含'项目'的笔记"
- **更新**: "更新笔记'会议记录',添加内容'下次会议时间:周五下午3点'"

---

## 倒计时提醒

一个倒计时提醒小应用,可以设置重要日期的倒计时。

### 功能特性

- ⏰ 设置倒计时
- 📊 查看所有倒计时
- 🔔 计算剩余天数

### 代码实现

```javascript
// 倒计时提醒 MiniApp

async function getCountdowns() {
  return await storage.get('countdowns') || [];
}

async function createCountdown(title, targetDate, description) {
  const countdowns = await getCountdowns();
  const newCountdown = {
    id: Date.now().toString(),
    title,
    targetDate,
    description,
    createdAt: new Date().toISOString(),
  };
  countdowns.push(newCountdown);
  await storage.set('countdowns', countdowns);
  return newCountdown;
}

function calculateDaysRemaining(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function getCountdownsWithDays() {
  const countdowns = await getCountdowns();
  return countdowns.map(countdown => ({
    ...countdown,
    daysRemaining: calculateDaysRemaining(countdown.targetDate),
    isPast: new Date(countdown.targetDate) < new Date(),
  })).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

async function deleteCountdown(id) {
  const countdowns = await getCountdowns();
  const filtered = countdowns.filter(c => c.id !== id);
  await storage.set('countdowns', filtered);
  return { success: true, deletedId: id };
}

// 主处理逻辑
switch (action) {
  case 'create':
    return createCountdown(params.title, params.targetDate, params.description);

  case 'read':
    if (params.id) {
      const countdowns = await getCountdowns();
      const countdown = countdowns.find(c => c.id === params.id);
      if (countdown) {
        return {
          ...countdown,
          daysRemaining: calculateDaysRemaining(countdown.targetDate),
        };
      }
      return null;
    }
    return getCountdownsWithDays();

  case 'delete':
    return deleteCountdown(params.id);

  default:
    throw new Error('不支持的操作: ' + action);
}
```

### 使用示例

- **创建**: "创建一个倒计时,标题是'项目截止日期',日期是2025-12-31"
- **查看**: "显示所有倒计时"
- **删除**: "删除'项目截止日期'倒计时"

---

## 简单计算器

一个支持基本数学运算和历史记录的计算器小应用。

### 功能特性

- ➕ 基本运算 (加减乘除)
- 📜 计算历史
- 🧮 高级函数 (平方、开方等)

### 代码实现

```javascript
// 简单计算器 MiniApp

async function getHistory() {
  return await storage.get('history') || [];
}

async function addToHistory(expression, result) {
  const history = await getHistory();
  history.push({
    id: Date.now().toString(),
    expression,
    result,
    timestamp: new Date().toISOString(),
  });
  // 只保留最近 50 条记录
  if (history.length > 50) {
    history.shift();
  }
  await storage.set('history', history);
}

function calculate(expression) {
  try {
    // 安全的数学表达式求值
    // 注意: 生产环境应使用更安全的求值方法
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = eval(sanitized);
    return result;
  } catch (error) {
    throw new Error('无效的数学表达式');
  }
}

function advancedCalculate(operation, value) {
  switch (operation) {
    case 'square':
      return value * value;
    case 'sqrt':
      return Math.sqrt(value);
    case 'power':
      return Math.pow(value, params.exponent || 2);
    case 'percentage':
      return value / 100;
    default:
      throw new Error('不支持的运算: ' + operation);
  }
}

async function clearHistory() {
  await storage.set('history', []);
  return { success: true, message: '历史记录已清空' };
}

// 主处理逻辑
switch (action) {
  case 'create': // 执行计算
    let result;
    if (params.operation) {
      // 高级运算
      result = advancedCalculate(params.operation, params.value);
      await addToHistory(`${params.operation}(${params.value})`, result);
    } else {
      // 基本运算
      result = calculate(params.expression);
      await addToHistory(params.expression, result);
    }
    return { expression: params.expression, result };

  case 'read': // 查看历史
    return getHistory();

  case 'delete': // 清空历史
    return clearHistory();

  default:
    throw new Error('不支持的操作: ' + action);
}
```

### 使用示例

- **基本计算**: "计算 123 + 456"
- **高级计算**: "计算 16 的平方根"
- **查看历史**: "显示计算历史"
- **清空历史**: "清空计算历史"

---

## MiniApp 开发指南

### 可用 API

MiniApp 代码中可以使用以下 API:

#### 1. Storage API

```javascript
// 获取数据
const value = await storage.get('key');

// 保存数据
await storage.set('key', value);
```

#### 2. Console API

```javascript
// 输出日志 (仅在开发环境可见)
console.log('调试信息', data);
```

#### 3. Context 变量

```javascript
// 当前操作类型
action // 'create' | 'read' | 'update' | 'delete'

// 操作参数
params // { key: value, ... }
```

### 最佳实践

1. **数据验证**: 始终验证输入参数
2. **错误处理**: 使用 try-catch 捕获错误
3. **数据结构**: 使用一致的数据结构
4. **性能优化**: 避免存储大量数据
5. **安全性**: 不要执行不受信任的代码

### 限制

- 最大执行时间: 5 秒
- 最大内存: 10MB
- 不支持网络请求 (未来版本可能支持)
- 不支持文件系统访问

---

## 调试技巧

1. **使用 console.log**: 在代码中添加日志输出
2. **测试小数据集**: 先用少量数据测试
3. **检查返回值**: 确保返回正确的数据格式
4. **错误信息**: 提供清晰的错误提示

---

## 更多资源

- [MiniApp 开发文档](../README.md#miniapp-功能)
- [API 参考](./api-reference.md)
- [常见问题](./faq.md)
