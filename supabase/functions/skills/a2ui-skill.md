---
name: A2UI 组件生成
description: 生成富交互界面组件。当用户需要展示列表、表单、图表时使用。
keywords: [a2ui, 组件, 表单, 图表, 列表, 卡片, 按钮, 交互]
triggers: [生成表单, 创建图表, 展示列表, 显示数据]
tags: [ui, 交互]
priority: 8
---

# A2UI 组件生成

生成富交互界面组件。

## When to Use

- 用户需要展示列表数据时
- 用户需要填写表单时
- 用户需要查看图表统计时
- 用户需要交互式操作按钮时

## Tools

### generate_a2ui

生成 A2UI 组件。

**Parameters:**
- `components` (array, required): 组件定义数组

**Returns:** 渲染的 UI 组件

## Component Types

### 展示组件

| 类型 | 用途 |
|------|------|
| `list` | 列表展示 |
| `card` | 卡片详情 |
| `table` | 表格数据 |
| `chart` | 数据图表 |

### 交互组件

| 类型 | 用途 |
|------|------|
| `button` | 操作按钮 |
| `form` | 表单容器 |
| `input` | 输入框 |
| `select` | 下拉选择 |

## Examples

用户: "展示我的待办事项列表"

调用:
```json
generate_a2ui({
  "components": [{
    "type": "list",
    "props": {
      "title": "待办事项",
      "items": [
        { "id": "1", "text": "完成报告" },
        { "id": "2", "text": "开会" }
      ]
    }
  }]
})
```

## Best Practices

1. **优先使用 A2UI**: 展示数据时优先使用组件而非纯文本
2. **合理选择组件**: 根据数据类型选择最合适的组件
3. **保持简洁**: 避免过度嵌套
