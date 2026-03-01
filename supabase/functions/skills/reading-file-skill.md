---
name: 文件读取
description: 读取用户标记的文件内容。当对话中有 <file /> 标记时使用。
keywords: [文件, 读取, 标记, file, 内容]
triggers: [读取文件, 查看文件, 文件内容]
tags: [file, tool]
priority: 6
---

# 文件读取

读取对话中标记的文件内容。

## When to Use

- 对话中出现 `<file />` 标记
- 用户说"读取这个文件"、"查看文件内容"

## Tools

### reading_taged_file

读取标记文件。

**Parameters:**
- `file_id` (string, required): 文件标识

**Returns:** 文件内容

## Examples

用户: "帮我读取这个文件的内容"（对话中有 `<file id="abc123" />`）

调用: `reading_taged_file({ file_id: 'abc123' })`
