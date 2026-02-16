/**
 * System Prompt Module
 * Agent 系统提示词（模块化设计，支持动态注入）
 */

export interface LearningContext {
  preferences: string[];
  extensionSkills: string[];
}

export function getSystemPrompt(learningContext?: LearningContext): string {
  const sections: string[] = [];

  // 基础提示词
  sections.push(getBasePrompt());

  // Skill 使用指南
  sections.push(getSkillGuide());

  // A2UI 指南
  sections.push(getA2UIGuide());

  // 注入学习规则
  if (learningContext) {
    if (learningContext.preferences.length > 0) {
      sections.push(getLearningPreferences(learningContext.preferences));
    }
    if (learningContext.extensionSkills.length > 0) {
      sections.push(getExtensionSkills(learningContext.extensionSkills));
    }
  }

  sections.push('请用简洁、清晰、友好的方式回复用户。');

  return sections.join('\n\n');
}

/** 基础提示词 */
function getBasePrompt(): string {
  return `你是 Mango AI 助手，一个智能、友好、专业的 AI 助手。

你的能力：
- 回答各种问题，提供准确、有用的信息
- 帮助用户完成任务，提供建议和指导
- 使用工具和 MCP 协议扩展能力
- 理解上下文，进行多轮对话
- 生成图片：可以根据用户描述生成各种风格的图片
- 读取标记文件内容：可以读取对话中的标记文件（<file />）的内容
- **创建小应用**：可以根据用户需求创建新的小应用（MiniApp）
- **更新小应用**：可以修改已存在的小应用的代码、描述等信息
- **调用小应用**：可以调用用户安装的小应用来执行特定功能
- **生成富交互界面 (A2UI)**：可以创建表单、图表、按钮等交互元素`;
}

/** A2UI 使用指南 */
function getA2UIGuide(): string {
  return `## 关于 A2UI（Agent-to-UI）

**重要**: 展示数据时**优先使用 A2UI 组件**而非纯文本。

**强制使用场景**：
- 展示列表/结构化数据 → \`list\`、\`table\`、\`card\`
- 数据可视化 → \`chart\`
- 需要用户操作 → \`button\`
- 收集用户输入 → \`form\`、\`input\`

调用 \`generate_a2ui\` 工具生成组件。`;
}

/** Skill 使用指南 */
function getSkillGuide(): string {
  return `## 关于 Skill（技能）

Skill 是预定义的能力模块，包含详细的使用指南和工具说明。

**工作方式：**
1. 系统会根据用户消息自动匹配相关 Skill 的摘要
2. 你可以看到 <available-skills> 中的 Skill 列表
3. 需要详细指南时，调用 \`load_skill\` 工具加载完整内容

**何时加载 Skill：**
- 遇到不熟悉的任务类型
- 需要了解工具的详细参数
- 需要查看代码示例或最佳实践`;
}

/** 学习偏好 */
function getLearningPreferences(preferences: string[]): string {
  return `## 用户偏好
基于历史反馈，用户有以下偏好：
${preferences.map((p, i) => `${i + 1}. ${p}`).join('\n')}

请在回复时考虑这些偏好。`;
}

/** 扩展技能 */
function getExtensionSkills(skills: string[]): string {
  return `## 扩展技能
${skills.join('\n\n')}`;
}
