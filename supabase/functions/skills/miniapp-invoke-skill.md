---
name: 调用小应用
description: 调用已安装的小应用执行功能。
keywords: [调用, 使用, 执行, 小应用, miniapp]
triggers: [调用小应用, 使用应用, 执行功能]
tags: [miniapp, 调用]
priority: 8
---

# 调用小应用

调用用户已安装的小应用。

## When to Use

- 用户说"调用xxx"、"使用xxx小应用"
- 用户想执行小应用提供的功能
- 用户在消息中选择了某个小应用

## Tools

### invoke_miniapp

调用已安装的小应用。

**Parameters:**
- `miniAppId` (string, required): 小应用 ID
- `toolName` (string, required): 工具名称
- `args` (object, optional): 工具参数

## Examples

用户: "添加一个待办：完成报告"
```
invoke_miniapp('todo-app-id', 'add_todo', { title: '完成报告' })
```

用户: "查看我的待办列表"
```
invoke_miniapp('todo-app-id', 'list_todos', { filter: 'pending' })
```

## 响应处理

调用小应用后，使用 `generate_a2ui` 工具可视化展示结果：
- 列表数据使用 `list` 组件
- 单个项目使用 `card` 组件
- 同时用简短文字说明操作结果
