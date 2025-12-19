# MiniApp 开发指南

## 概述

MiniApp 是一个轻量级的应用平台，允许开发者创建和分享小型应用程序。MiniApp 支持两种开发方式：

1. **HTML 模式**：提供完整的 HTML 文档，适合创建复杂的 UI 界面
2. **JavaScript 模式**：编写纯 JavaScript 代码，在默认模板中运行

## HTML 模式开发

### 基本结构

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My MiniApp</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello MiniApp!</h1>
    <button id="myButton">点击我</button>
    <div id="output"></div>
  </div>

  <script>
    // 使用 MiniApp API
    document.getElementById('myButton').addEventListener('click', async () => {
      try {
        await window.MiniAppAPI.notification.send('通知', '按钮被点击了！');
        document.getElementById('output').textContent = '通知已发送';
      } catch (error) {
        console.error('Error:', error);
      }
    });
  </script>
</body>
</html>
```

### MiniApp API

MiniApp 提供了一组 API，通过 `window.MiniAppAPI` 对象访问：

#### 1. 存储 API

```javascript
// 保存数据
await window.MiniAppAPI.storage.set('key', { name: 'value' });

// 读取数据
const data = await window.MiniAppAPI.storage.get('key');

// 删除数据
await window.MiniAppAPI.storage.remove('key');
```

#### 2. 通知 API

```javascript
// 发送通知
await window.MiniAppAPI.notification.send(
  '通知标题',
  '通知内容',
  {
    icon: 'https://example.com/icon.png',
    badge: 'https://example.com/badge.png'
  }
);
```

#### 3. 用户信息 API

```javascript
// 获取用户信息
const userInfo = await window.MiniAppAPI.user.getInfo();
console.log(userInfo.id, userInfo.email);
```

## JavaScript 模式开发

在 JavaScript 模式下，代码会在一个默认的 HTML 模板中运行，该模板提供了一个 `#app` 容器。

```javascript
// 获取容器
const app = document.getElementById('app');

// 创建 UI
app.innerHTML = `
  <div style="padding: 20px;">
    <h1>计数器应用</h1>
    <p>当前计数: <span id="count">0</span></p>
    <button id="increment">增加</button>
    <button id="decrement">减少</button>
    <button id="save">保存</button>
  </div>
`;

// 初始化计数器
let count = 0;

// 从存储加载数据
MiniAppAPI.storage.get('count').then(savedCount => {
  if (savedCount !== null) {
    count = savedCount;
    updateDisplay();
  }
});

// 更新显示
function updateDisplay() {
  document.getElementById('count').textContent = count;
}

// 添加事件监听
document.getElementById('increment').addEventListener('click', () => {
  count++;
  updateDisplay();
});

document.getElementById('decrement').addEventListener('click', () => {
  count--;
  updateDisplay();
});

document.getElementById('save').addEventListener('click', async () => {
  await MiniAppAPI.storage.set('count', count);
  await MiniAppAPI.notification.send('保存成功', `计数器值 ${count} 已保存`);
});
```

## 完整示例

### 示例 1：待办事项应用

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>待办事项</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { margin-bottom: 20px; color: #333; }
    .input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    button {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #0056b3; }
    .todo-list { list-style: none; }
    .todo-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
      gap: 10px;
    }
    .todo-item.completed { opacity: 0.6; }
    .todo-item.completed span { text-decoration: line-through; }
    .todo-item span { flex: 1; }
    .delete-btn {
      background: #dc3545;
      padding: 5px 10px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 待办事项</h1>
    <div class="input-group">
      <input type="text" id="todoInput" placeholder="添加新任务...">
      <button onclick="addTodo()">添加</button>
    </div>
    <ul id="todoList" class="todo-list"></ul>
  </div>

  <script>
    let todos = [];

    // 加载数据
    async function loadTodos() {
      const saved = await window.MiniAppAPI.storage.get('todos');
      if (saved) {
        todos = saved;
        renderTodos();
      }
    }

    // 保存数据
    async function saveTodos() {
      await window.MiniAppAPI.storage.set('todos', todos);
    }

    // 渲染列表
    function renderTodos() {
      const list = document.getElementById('todoList');
      list.innerHTML = todos.map((todo, index) => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
          <input type="checkbox"
                 ${todo.completed ? 'checked' : ''}
                 onchange="toggleTodo(${index})">
          <span>${todo.text}</span>
          <button class="delete-btn" onclick="deleteTodo(${index})">删除</button>
        </li>
      `).join('');
    }

    // 添加任务
    async function addTodo() {
      const input = document.getElementById('todoInput');
      const text = input.value.trim();

      if (!text) return;

      todos.push({ text, completed: false });
      input.value = '';

      await saveTodos();
      renderTodos();

      await window.MiniAppAPI.notification.send('任务已添加', text);
    }

    // 切换完成状态
    async function toggleTodo(index) {
      todos[index].completed = !todos[index].completed;
      await saveTodos();
      renderTodos();
    }

    // 删除任务
    async function deleteTodo(index) {
      todos.splice(index, 1);
      await saveTodos();
      renderTodos();
    }

    // 初始化
    loadTodos();

    // 支持回车添加
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
  </script>
</body>
</html>
```

### 示例 2：天气查询应用

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>天气查询</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 20px;
    }
    .search-box {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    input {
      flex: 1;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }
    button {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #5568d3; }
    .weather-info {
      text-align: center;
      padding: 20px;
    }
    .temperature {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      margin: 20px 0;
    }
    .description {
      font-size: 18px;
      color: #666;
      margin-bottom: 10px;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 20px;
    }
    .detail-item {
      padding: 10px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .loading { text-align: center; color: #666; }
    .error { color: #dc3545; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌤️ 天气查询</h1>
    <div class="search-box">
      <input type="text" id="cityInput" placeholder="输入城市名称...">
      <button onclick="searchWeather()">查询</button>
    </div>
    <div id="weatherResult"></div>
  </div>

  <script>
    async function searchWeather() {
      const city = document.getElementById('cityInput').value.trim();
      const result = document.getElementById('weatherResult');

      if (!city) {
        result.innerHTML = '<p class="error">请输入城市名称</p>';
        return;
      }

      result.innerHTML = '<p class="loading">查询中...</p>';

      try {
        // 这里使用模拟数据，实际应用中应该调用真实的天气API
        const weather = {
          city: city,
          temperature: Math.floor(Math.random() * 20) + 10,
          description: ['晴天', '多云', '小雨', '阴天'][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 40) + 40,
          windSpeed: Math.floor(Math.random() * 10) + 5
        };

        result.innerHTML = `
          <div class="weather-info">
            <h2>${weather.city}</h2>
            <div class="temperature">${weather.temperature}°C</div>
            <div class="description">${weather.description}</div>
            <div class="details">
              <div class="detail-item">
                <div>💧 湿度</div>
                <div><strong>${weather.humidity}%</strong></div>
              </div>
              <div class="detail-item">
                <div>💨 风速</div>
                <div><strong>${weather.windSpeed} km/h</strong></div>
              </div>
            </div>
          </div>
        `;

        // 保存最近查询的城市
        await window.MiniAppAPI.storage.set('lastCity', city);

      } catch (error) {
        result.innerHTML = '<p class="error">查询失败，请稍后重试</p>';
      }
    }

    // 加载上次查询的城市
    window.MiniAppAPI.storage.get('lastCity').then(city => {
      if (city) {
        document.getElementById('cityInput').value = city;
      }
    });

    // 支持回车查询
    document.getElementById('cityInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchWeather();
    });
  </script>
</body>
</html>
```

## 安全注意事项

1. **沙箱环境**：所有 MiniApp 都在 iframe 沙箱中运行，限制了某些浏览器 API 的访问
2. **数据隔离**：每个 MiniApp 的数据是隔离的，无法访问其他应用的数据
3. **权限控制**：某些 API（如通知）需要用户授权
4. **内容安全**：避免在 HTML 中使用不受信任的外部资源

## 最佳实践

1. **响应式设计**：确保应用在不同屏幕尺寸下都能正常显示
2. **错误处理**：使用 try-catch 处理 API 调用可能出现的错误
3. **数据持久化**：重要数据应及时保存到存储中
4. **用户体验**：提供清晰的加载状态和错误提示
5. **性能优化**：避免过度的 DOM 操作和频繁的 API 调用

## 调试技巧

1. 使用浏览器开发者工具查看 iframe 中的控制台输出
2. 在代码中添加 `console.log` 语句进行调试
3. 使用预览功能测试 HTML 内容
4. 检查网络请求确保 API 调用正常

## 发布流程

1. 在创建页面编写和测试 MiniApp
2. 填写完整的应用信息（名称、描述、图标等）
3. 选择是否公开应用
4. 保存后可以在"我的应用"中查看和管理
5. 通过分享功能生成分享链接

## 常见问题

### Q: HTML 模式和 JavaScript 模式有什么区别？

A: HTML 模式提供完整的 HTML 文档控制，适合复杂 UI；JavaScript 模式在默认模板中运行，更简洁。

### Q: 如何在 HTML 中使用外部库？

A: 可以通过 CDN 引入外部库，但要注意沙箱环境的限制。

### Q: 数据存储有大小限制吗？

A: 建议单个键值对不超过 1MB，总存储不超过 10MB。

### Q: 可以访问用户的其他数据吗？

A: 不可以，MiniApp 只能访问通过 API 提供的有限用户信息。

## 更多资源

- [MiniApp API 参考文档](./miniapp-api-reference.md)
- [示例代码仓库](https://github.com/your-org/miniapp-examples)
- [社区论坛](https://community.example.com/miniapps)
