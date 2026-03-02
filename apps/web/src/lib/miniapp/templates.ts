/**
 * MiniApp 代码模板
 * code = 纯服务端 MCP 代码，通过 getUIResource('main') 引用 HTML 资源
 * html = Record<string, string> 格式的 UI 资源集合，由 adapter 自动注入
 * 提供 Vanilla JS / React / Vue 三种 UI 框架模板
 */

export interface MiniAppTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  html: Record<string, string>;
  skillContent: string;
}

// ========== HTML 资源 ==========

const VANILLA_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 16px;
      background: #faf9f6;
      color: #1a1a1a;
    }
    body.dark { background: #1a1a1a; color: #e5e5e5; }
    #app { min-height: 100px; }
    pre { white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div id="app"><p>MiniApp 已就绪</p></div>
</body>
</html>`;

const REACT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/preact@10/dist/preact.umd.js"></script>
  <script src="https://unpkg.com/preact@10/hooks/dist/hooks.umd.js"></script>
  <script src="https://unpkg.com/htm@3/dist/htm.umd.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; background: #faf9f6; color: #1a1a1a; }
    .dark { background: #1a1a1a; color: #e5e5e5; }
    h2 { margin-bottom: 12px; }
    pre { white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;

const VUE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; background: #faf9f6; color: #1a1a1a; }
    .dark { background: #1a1a1a; color: #e5e5e5; }
    h2 { margin-bottom: 12px; }
    pre { white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;

// ========== Code 模板（使用 getUIResource('main') 引用 HTML 资源） ==========

const VANILLA_CODE = `// Vanilla JS MiniApp — 纯服务端 MCP 代码
// HTML 资源通过 getUIResource('main') 获取

const resourceUri = 'ui://mango/main';

// 注册 HTML UI 资源
registerAppResource(mcpServer, 'Main UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '应用主界面',
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: getUIResource('main'),
  }],
}));

// 注册示例工具
registerAppTool(mcpServer, 'hello', {
  title: '问候',
  description: '发送问候',
  inputSchema: z.object({ name: z.string() }),
  _meta: { ui: { resourceUri } },
}, async ({ name }) => ({
  structuredContent: { message: \`你好, \${name}!\` },
}));
`;

const REACT_CODE = `// React MiniApp (Preact + htm) — 纯服务端 MCP 代码
// HTML 资源通过 getUIResource('main') 获取

const resourceUri = 'ui://mango/main';

registerAppResource(mcpServer, 'Main UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '应用主界面 (React/Preact)',
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: getUIResource('main'),
  }],
}));

registerAppTool(mcpServer, 'hello', {
  title: '问候',
  description: '发送问候',
  inputSchema: z.object({ name: z.string() }),
  _meta: { ui: { resourceUri } },
}, async ({ name }) => ({
  structuredContent: { message: \`你好, \${name}!\` },
}));
`;

const VUE_CODE = `// Vue 3 MiniApp — 纯服务端 MCP 代码
// HTML 资源通过 getUIResource('main') 获取

const resourceUri = 'ui://mango/main';

registerAppResource(mcpServer, 'Main UI', resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  description: '应用主界面 (Vue 3)',
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: getUIResource('main'),
  }],
}));

registerAppTool(mcpServer, 'hello', {
  title: '问候',
  description: '发送问候',
  inputSchema: z.object({ name: z.string() }),
  _meta: { ui: { resourceUri } },
}, async ({ name }) => ({
  structuredContent: { message: \`你好, \${name}!\` },
}));
`;

const SKILL_TEMPLATE = `# {name} Skill

## 功能描述
描述你的小应用功能...

## 可用工具
- 工具名称: 工具描述
`;

export const MINIAPP_TEMPLATES: MiniAppTemplate[] = [
  {
    id: 'vanilla',
    name: 'Vanilla JS',
    description: '纯 JavaScript，无框架依赖',
    language: 'javascript',
    code: VANILLA_CODE,
    html: { main: VANILLA_HTML },
    skillContent: SKILL_TEMPLATE,
  },
  {
    id: 'react',
    name: 'React (Preact)',
    description: '使用 Preact + htm，轻量 React 方案',
    language: 'javascript',
    code: REACT_CODE,
    html: { main: REACT_HTML },
    skillContent: SKILL_TEMPLATE,
  },
  {
    id: 'vue',
    name: 'Vue 3',
    description: '使用 Vue 3 CDN 版本',
    language: 'javascript',
    code: VUE_CODE,
    html: { main: VUE_HTML },
    skillContent: SKILL_TEMPLATE,
  },
];
