# Skill 文件系统架构

**更新日期**: 2026-01-06
**基于**: Claude Agent Skill 规格

## 1. Edge Function Skills 文件结构

### 1.1 目录结构

```
supabase/functions/skills/
├── a2ui-skill.md              # A2UI 界面生成 Skill
├── image-gen-skill.md         # 图片生成 Skill
├── miniapp-skill.md           # MiniApp 管理 Skill
└── _metadata.json             # Skill 元数据索引
```

### 1.2 Skill 元数据索引

```json
// supabase/functions/skills/_metadata.json
{
  "skills": [
    {
      "id": "edge:a2ui",
      "name": "A2UI 界面生成",
      "description": "生成富交互用户界面组件",
      "category": "edge",
      "priority": 9,
      "tags": ["ui", "interaction", "form", "chart"],
      "triggerConditions": {
        "keywords": ["表单", "图表", "界面", "输入", "选择", "按钮"],
        "userIntent": ["create_ui", "collect_input", "visualize_data"]
      },
      "file": "a2ui-skill.md"
    }
  ]
}
```

---

## 2. Skill Markdown 格式（Claude Agent Skill 规格）

### 2.1 A2UI Skill 示例

```markdown
# A2UI 界面生成

生成富交互用户界面组件，支持表单、图表、列表等多种组件类型。

## When to Use

- 用户需要填写表单或输入数据
- 需要展示数据可视化图表
- 需要创建交互式界面组件
- 需要收集用户反馈或选择

## Tools

### generate_form

生成表单界面组件。

**Parameters:**
- `fields` (array, required): 表单字段定义数组
  - `type` (string): 字段类型（input/select/textarea/checkbox）
  - `label` (string): 字段标签
  - `required` (boolean): 是否必填
- `title` (string, optional): 表单标题
- `submitLabel` (string, optional): 提交按钮文本

**Example:**
\`\`\`json
{
  "fields": [
    {
      "type": "input",
      "label": "用户名",
      "required": true
    },
    {
      "type": "select",
      "label": "角色",
      "options": ["管理员", "用户"]
    }
  ],
  "title": "用户注册",
  "submitLabel": "提交"
}
\`\`\`

### generate_chart

生成数据可视化图表。

**Parameters:**
- `chartType` (string, required): 图表类型（line/bar/pie/scatter）
- `data` (array, required): 图表数据
- `xAxis` (object, optional): X 轴配置
- `yAxis` (object, optional): Y 轴配置

**Example:**
\`\`\`json
{
  "chartType": "line",
  "data": [
    { "month": "1月", "sales": 4000 },
    { "month": "2月", "sales": 3000 }
  ],
  "xAxis": { "dataKey": "month" },
  "yAxis": { "label": "销售额" }
}
\`\`\`

## Examples

### Example 1: 创建用户反馈表单

\`\`\`
User: "我需要收集用户对新功能的反馈"
Agent: [调用 generate_form 工具]
{
  "fields": [
    {
      "type": "select",
      "label": "满意度",
      "options": ["非常满意", "满意", "一般", "不满意"]
    },
    {
      "type": "textarea",
      "label": "详细反馈"
    }
  ],
  "title": "功能反馈"
}
Result: 生成交互式反馈表单
\`\`\`

### Example 2: 展示销售数据

\`\`\`
User: "帮我可视化这个月的销售数据"
Agent: [调用 generate_chart 工具]
Result: 生成折线图展示销售趋势
\`\`\`
```

---

## 3. 设备 Skills 文件结构

### 3.1 目录结构

```
~/.mango/skills/
├── file-operations-skill.md   # 文件操作 Skill
├── git-operations-skill.md    # Git 操作 Skill
└── _metadata.json             # Skill 元数据索引
```

### 3.2 设备 Skill 示例

```markdown
# 文件操作

访问和操作本地文件系统。

## When to Use

- 需要读取本地文件内容
- 需要写入或修改文件
- 需要列出目录内容
- 需要搜索文件

## Tools

### read_file

读取本地文件内容。

**Parameters:**
- `path` (string, required): 文件路径

**Example:**
\`\`\`json
{
  "path": "/Users/username/Documents/report.txt"
}
\`\`\`

### write_file

写入内容到本地文件。

**Parameters:**
- `path` (string, required): 文件路径
- `content` (string, required): 文件内容

**Example:**
\`\`\`json
{
  "path": "/Users/username/Documents/note.txt",
  "content": "Hello World"
}
\`\`\`
```

---

**更新完成日期**: 2026-01-06

