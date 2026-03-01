---
name: "{{display_name}}"
description: "{{description}}"
keywords: []
triggers: []
tags: [miniapp]
priority: 5
---

# {{display_name}}

{{description}}

## Architecture

- Version: v2-mcp
- MiniApp ID: {{id}}

## When to Use

- [描述何时调用此小应用]

## Tools

### {{tool_name}}

{{tool_description}}

**Parameters:**
- `param1` (type, required): 描述

**Returns:** 返回值描述

## Examples

用户: "[示例请求]"

调用: `invoke_miniapp('{{id}}', '{{tool_name}}', { param1: 'value' })`

## Storage

- `storage.get(key)` - 获取值
- `storage.set(key, value)` - 设置值
