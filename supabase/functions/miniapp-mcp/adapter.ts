/**
 * MiniApp MCP Adapter
 * 将 MiniApp 代码转换为 MCP Server 工具和资源
 */

import { MCPServer, ToolDefinition, ToolResult, ResourceDefinition } from './mcp-server.ts';
import type { MiniApp, MiniAppSandboxContext, UIResourceContent } from './types.ts';

// 统一的 UI Resource URI
const UNIFIED_UI_RESOURCE_URI = 'ui://mango/main';

/** ext-apps 标准 UI 资源 MIME 类型 */
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * 创建 MiniApp 的 MCP Server
 */
export async function createMiniAppMCPServer(
  miniApp: MiniApp,
  context: MiniAppSandboxContext
): Promise<MCPServer> {
  const server = new MCPServer(
    `mango-miniapp-${miniApp.id}`,
    miniApp.manifest?.version || '1.0.0'
  );

  // 执行 MiniApp 代码，注册工具和资源
  await executeMiniAppCode(server, miniApp, context);

  return server;
}

/**
 * Zod-like schema builder for sandbox.
 * 每个类型方法返回的对象统一支持 .describe() 和 .optional() 链式调用。
 */
interface ZodSchemaData {
  type: string;
  _zod: true;
  description?: string;
  optional?: boolean;
  enum?: string[];
  items?: unknown;
  properties?: Record<string, unknown>;
  _shape?: Record<string, unknown>;
}

interface ZodSchema extends ZodSchemaData {
  describe: (d: string) => ZodSchema;
  optional: () => ZodSchema;
  [key: string]: unknown;
}

function makeSchema(base: Record<string, unknown>): ZodSchema {
  const data = { ...base, _zod: true as const };
  return {
    ...data,
    describe(d: string) {
      return makeSchema({ ...data, description: d });
    },
    optional() {
      return makeSchema({ ...data, optional: true });
    },
  } as ZodSchema;
}

const z = {
  string: () => makeSchema({ type: 'string' }),
  number: () => makeSchema({ type: 'number' }),
  boolean: () => makeSchema({ type: 'boolean' }),
  array: (item: unknown) => makeSchema({ type: 'array', items: item }),
  object: (shape: Record<string, unknown>) => makeSchema({
    type: 'object', properties: shape, _shape: shape,
  }),
  enum: (values: string[]) => makeSchema({ type: 'string', enum: values }),
};

/**
 * 将 Zod-like schema 转换为 JSON Schema
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} };
  }

  const s = schema as Record<string, unknown>;
  if (s._zod && s._shape) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(s._shape as Record<string, unknown>)) {
      const v = value as Record<string, unknown>;
      const prop: Record<string, unknown> = { type: v.type || 'string' };
      if (v.description) prop.description = v.description;
      if (v.enum) prop.enum = v.enum;
      if (v.items) prop.items = v.items;
      properties[key] = prop;
      if (!v.optional) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  return { type: 'object', properties: {} };
}

/**
 * 创建 UI Resource
 */
function createUIResource(options: {
  uri?: string;
  content: UIResourceContent;
  encoding?: 'json' | 'html';
}): { uri: string; content: string; mimeType: string } {
  const uri = options.uri || UNIFIED_UI_RESOURCE_URI;
  const encoding = options.encoding || 'json';

  return {
    uri,
    content: encoding === 'json'
      ? JSON.stringify(options.content)
      : String(options.content),
    mimeType: encoding === 'json' ? 'application/json' : 'text/html',
  };
}

/**
 * 执行 MiniApp 代码
 */
async function executeMiniAppCode(
  server: MCPServer,
  miniApp: MiniApp,
  context: MiniAppSandboxContext
): Promise<void> {
  // 收集注册的工具和资源
  const registeredTools: Array<{
    def: ToolDefinition;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
  }> = [];
  let registeredUIResource: { uri: string; content: string; mimeType: string } | null = null;
  const registeredResources: Array<{
    name: string;
    uri: string;
    mimeType: string;
    description?: string;
    handler: () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string; _meta?: Record<string, unknown> }> }>;
  }> = [];

  // === ext-apps 风格 API: registerAppTool ===
  const registerAppTool = (
    _server: unknown,
    name: string,
    options: {
      title?: string;
      description: string;
      inputSchema?: unknown;
      _meta?: { ui?: { resourceUri?: string } };
      annotations?: Record<string, unknown>;
    },
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) => {
    const inputSchema = options.inputSchema
      ? zodToJsonSchema(options.inputSchema)
      : { type: 'object', properties: {} };
    const def: ToolDefinition = {
      name,
      title: options.title,
      description: options.description,
      inputSchema: inputSchema as ToolDefinition['inputSchema'],
    };
    if (options._meta?.ui?.resourceUri) {
      def._meta = { ui: { resourceUri: options._meta.ui.resourceUri } };
    }
    registeredTools.push({ def, handler });
  };

  // === ext-apps 风格 API: registerAppResource ===
  const registerAppResource = (
    _server: unknown,
    name: string,
    uri: string,
    options: { mimeType?: string; description?: string },
    handler: () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string; _meta?: Record<string, unknown> }> }>,
  ) => {
    registeredResources.push({
      name,
      uri,
      mimeType: options.mimeType || 'application/json',
      description: options.description,
      handler,
    });
  };

  // 创建沙箱 mcpServer 代理对象（旧 API，保留兼容 + deprecation 警告）
  const mcpServerProxy = {
    tool: (options: {
      name: string;
      description: string;
      parameters: unknown;
      execute: (args: Record<string, unknown>) => Promise<unknown>;
      ui?: { resourceUri?: string };
    }) => {
      console.warn(`[MiniApp:${miniApp.name}] mcpServer.tool() is deprecated. Use registerAppTool() instead.`);
      const inputSchema = zodToJsonSchema(options.parameters);
      const def: ToolDefinition = {
        name: options.name,
        description: options.description,
        inputSchema: inputSchema as ToolDefinition['inputSchema'],
      };
      if (options.ui?.resourceUri) {
        def._meta = { ui: { resourceUri: options.ui.resourceUri } };
      }
      registeredTools.push({ def, handler: options.execute });
    },
    resource: (resource: { uri: string; content: string; mimeType: string }) => {
      console.warn(`[MiniApp:${miniApp.name}] mcpServer.resource() is deprecated. Use registerAppResource() instead.`);
      registeredUIResource = resource;
    },
  };

  // 创建沙箱对象
  const sandbox = {
    mcpServer: mcpServerProxy,
    registerAppTool,
    registerAppResource,
    RESOURCE_MIME_TYPE,
    createUIResource,
    z,
    user: Object.freeze(context.user),
    storage: context.storage,
    notification: context.notification,
    http: context.http,
    console: {
      log: (...args: unknown[]) => console.log(`[MiniApp:${miniApp.name}]`, ...args),
      error: (...args: unknown[]) => console.error(`[MiniApp:${miniApp.name}]`, ...args),
    },
  };

  // html 字段已是 JSONB（Record<string, string>），无需 JSON.parse
  const uiResources: Record<string, string> = (miniApp.html as Record<string, string>) || {};

  // 执行 MiniApp 代码（包裹在 async IIFE 中以支持顶层 await）
  // UI 资源通过函数参数传入，不经过字符串拼接，彻底避免转义问题
  try {
    const resourceHelpers = `function getUIResource(name) { return __ui_resources__[name] || ''; }\n`;
    const wrappedCode = `return (async () => {\n${resourceHelpers}${miniApp.code}\n})();`;
    const fn = new Function(
      'mcpServer', 'registerAppTool', 'registerAppResource', 'RESOURCE_MIME_TYPE',
      'createUIResource', 'z',
      'user', 'storage', 'notification', 'http', 'console',
      '__ui_resources__',
      wrappedCode
    );
    await fn(
      sandbox.mcpServer,
      sandbox.registerAppTool,
      sandbox.registerAppResource,
      sandbox.RESOURCE_MIME_TYPE,
      sandbox.createUIResource,
      sandbox.z,
      sandbox.user,
      sandbox.storage,
      sandbox.notification,
      sandbox.http,
      sandbox.console,
      uiResources
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (error instanceof SyntaxError) {
      console.error(`[MiniApp:${miniApp.name}] 代码语法错误: ${msg}`);
      throw new Error(`MiniApp 代码语法错误: ${msg}。提示: 在 .forEach() 等回调中使用 await 时，回调函数需要声明为 async。`);
    }
    console.error(`[MiniApp:${miniApp.name}] 执行错误:`, error);
    throw new Error(`Failed to execute MiniApp: ${msg}`);
  }

  // 注册收集到的工具（新旧 API 共用同一个 registeredTools 数组）
  for (const tool of registeredTools) {
    server.registerTool(tool.def, async (args) => {
      try {
        const result = await tool.handler(args);
        // 兼容 ext-apps handler 返回值格式
        if (result && typeof result === 'object' &&
            ('content' in (result as Record<string, unknown>) ||
             'structuredContent' in (result as Record<string, unknown>))) {
          // handler 已返回 ToolResult 格式（含 content 或 structuredContent），直接透传
          const r = result as Record<string, unknown>;
          if (!r.content) {
            r.content = [{ type: 'text', text: JSON.stringify(r.structuredContent) }];
          }
          return r as ToolResult;
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }],
          isError: true,
        };
      }
    });
  }

  // 注册通过 registerAppResource 注册的资源
  for (const res of registeredResources) {
    server.registerResource(
      {
        uri: res.uri,
        name: res.name,
        description: res.description,
        mimeType: res.mimeType,
      },
      async () => {
        const result = await res.handler();
        return result.contents;
      }
    );
  }

  // 注册通过旧 API mcpServer.resource() 注册的 UI Resource
  if (registeredUIResource) {
    const uiRes = registeredUIResource;
    server.registerResource(
      {
        uri: uiRes.uri,
        name: `${miniApp.name} UI`,
        description: `${miniApp.name} 的用户界面`,
        mimeType: uiRes.mimeType,
      },
      async () => [{
        uri: uiRes.uri,
        mimeType: uiRes.mimeType,
        text: uiRes.content,
      }]
    );
  }
}
