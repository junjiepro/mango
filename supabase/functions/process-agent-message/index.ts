/**
 * Supabase Edge Function: Process Agent Message
 * Handles AI Agent response to user messages using Vercel AI SDK
 * Supports streaming responses via Realtime Channel
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { createOpenAICompatible } from 'https://esm.sh/@ai-sdk/openai-compatible';
import { gateway } from 'https://esm.sh/@ai-sdk/gateway';
import { streamText, createProviderRegistry, tool, stepCountIs } from 'https://esm.sh/ai';
import { experimental_createMCPClient as createMCPClient } from 'https://esm.sh/@ai-sdk/mcp';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const registry = createProviderRegistry({
  pollinations: createOpenAICompatible({
    apiKey: Deno.env.get('POLLINATIONS_API_KEY'),
    baseURL: 'https://text.pollinations.ai/openai',
    name: 'pollinations',
  }),

  openrouter: createOpenAICompatible({
    apiKey: Deno.env.get('OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    name: 'openrouter',
  }),

  openai: createOpenAICompatible({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    baseURL: Deno.env.get('OPENAI_API_BASE') || 'https://api.openai.com/v1',
    name: 'openai',
  }),

  gateway,
});

interface AgentMessagePayload {
  conversationId: string;
  messageId: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { conversationId, messageId, userId } = (await req.json()) as AgentMessagePayload;

    if (!conversationId || !messageId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user message
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !userMessage) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation history (last 10 messages for context)
    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: false })
      .limit(10);

    const conversationHistory = (history || []).reverse();

    // Get next sequence number
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('sequence_number')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    const sequenceNumber = (lastMessage?.sequence_number || 0) + 1;

    // Create agent message placeholder
    const { data: agentMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        content: '思考中...',
        content_type: 'text/markdown',
        sequence_number: sequenceNumber,
        status: 'sending',
        reply_to_message_id: messageId,
      })
      .select()
      .single();

    if (createError || !agentMessage) {
      console.error('Failed to create agent message', createError);
      throw new Error('Failed to create agent message');
    }

    // Process agent response with streaming
    const process = async () => {
      try {
        // Stream agent response
        await streamAgentResponse(
          supabase,
          conversationId,
          agentMessage.id,
          conversationHistory,
          userId
        );
      } catch (error) {
        console.error('Agent response error:', error);
        // Update message status to failed
        await supabase
          .from('messages')
          .update({
            content: '抱歉，我遇到了一些问题，无法回复您的消息。',
            status: 'failed',
            agent_metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          .eq('id', agentMessage.id);
      }
    };

    // Start processing asynchronously
    process();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: agentMessage.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Initialize MCP client and load tools using Vercel AI SDK
 */
async function initializeMCPTools(
  supabase: any,
  channel: any,
  messageId: string
): Promise<Record<string, any>> {
  const mcpServerUrl = Deno.env.get('MCP_SERVER_URL');
  const mcpApiKey = Deno.env.get('MCP_SERVER_API_KEY') || '';

  // 如果没有配置 MCP 服务器，返回空工具集
  if (!mcpServerUrl) {
    console.log('MCP_SERVER_URL not configured, skipping MCP tools initialization');
    return {};
  }

  try {
    console.log(`Connecting to MCP server: ${mcpServerUrl}`);

    // 创建 MCP 客户端
    const mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: mcpServerUrl,
        headers: mcpApiKey ? { Authorization: `Bearer ${mcpApiKey}` } : undefined,
      },
    });

    // 获取所有可用工具
    const mcpTools = await mcpClient.listTools();
    console.log(
      `Loaded ${mcpTools.length} MCP tools:`,
      mcpTools.map((t: any) => t.name)
    );

    // 转换 MCP 工具为 Vercel AI SDK 工具格式
    const tools: Record<string, any> = {};

    for (const mcpTool of mcpTools) {
      const toolName = mcpTool.name;

      tools[toolName] = tool({
        description: mcpTool.description || `MCP tool: ${toolName}`,
        parameters: mcpTool.inputSchema || z.object({}),
        execute: async (args: any) => {
          try {
            console.log(`Executing MCP tool: ${toolName}`, args);

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: toolName,
                args,
              },
            });

            // 调用 MCP 工具
            const result = await mcpClient.callTool(toolName, args);

            // 提取结果文本
            let resultText = '';
            if (result.content && Array.isArray(result.content)) {
              resultText = result.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n');
            } else if (typeof result === 'string') {
              resultText = result;
            } else {
              resultText = JSON.stringify(result);
            }

            console.log(`MCP tool ${toolName} result:`, resultText.substring(0, 200));

            // 发送工具调用成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: toolName,
                status: 'success',
                result: resultText,
              },
            });

            return resultText;
          } catch (error) {
            console.error(`MCP tool ${toolName} execution error:`, error);

            // 发送工具调用失败事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: toolName,
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            return `❌ 工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      });
    }

    return tools;
  } catch (error) {
    console.error('Failed to initialize MCP tools:', error);
    return {};
  }
}

interface AttachmentWithPath {
  url: string;
  path: string;
  name?: string;
  type?: string;
  size?: number;
  [key: string]: any;
}

async function toFileContext(
  supabase: any,
  attachment: AttachmentWithPath,
  bucket: string = 'attachments',
  expiresIn: number = 86400
) {
  let result;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(attachment.path, expiresIn);

  if (error || !data) {
    throw new Error('Failed to get attachment URL', { cause: error || 'Empty data' });
  }

  // 更新 URL - Supabase 返回的是 { signedUrl: string }
  const newUrl = data.signedUrl || data;
  const finalUrl = typeof newUrl === 'string' ? newUrl : attachment.url;

  if (attachment.type?.startsWith('image/')) {
    // 图片附件
    result = {
      type: 'image',
      image: finalUrl,
    };
  } else {
    // 其他文件类型（如果模型支持）
    const response = await fetch(finalUrl);
    if (!response.ok) {
      throw new Error(`获取文件失败: ${response.statusText}`);
    }

    // 获取文件二进制数据
    const fileBuffer = await response.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    result = {
      type: 'file',
      data: fileBytes,
      mimeType: attachment.type || 'application/octet-stream',
    };
  }

  return result;
}

/**
 * Stream agent response using Vercel AI SDK and Supabase Realtime
 * Supports multimodal input (text, images, files) and output
 * Supports MCP tools integration
 */
async function streamAgentResponse(
  supabase: any,
  conversationId: string,
  messageId: string,
  conversationHistory: any[],
  userId: string
): Promise<void> {
  const startTime = Date.now();
  let fullContent = '';
  let tokenCount = 0;

  try {
    // 构建消息历史，支持多模态内容
    const attachmentPathMap: Record<string, AttachmentWithPath> = {};
    const attachmentNameMap: Record<string, AttachmentWithPath> = {};
    const messages = await Promise.all(
      conversationHistory
        .filter((msg: any) => msg.sender_type === 'user' || msg.sender_type === 'agent')
        .map(async (msg: any, index: number, arr: any[]) => {
          const role = msg.sender_type === 'user' ? 'user' : 'assistant';
          const isLastMessage = index === arr.length - 1;

          // 检查是否有附件（多模态内容）
          const hasAttachments =
            msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0;

          if (hasAttachments) {
            // 构建多模态内容数组
            const content: any[] = [{ type: 'text', text: msg.content }];

            // 添加附件（图片、文件等）
            if (isLastMessage) {
              for (const attachment of msg.attachments) {
                content.push(await toFileContext(supabase, attachment));
              }
            } else {
              for (const attachment of msg.attachments) {
                attachmentPathMap[attachment.path] = attachment;
                attachmentNameMap[attachment.name] = attachment;
                content.push({
                  type: 'text',
                  text: `<file name="${attachment.name}" path="${attachment.path}" type="${attachment.type || 'application/octet-stream'}" />`,
                });
              }
            }

            return { role, content };
          } else {
            // 纯文本消息
            return { role, content: msg.content };
          }
        })
    );

    // 系统提示词
    let systemPrompt = `你是 Mango AI 助手，一个智能、友好、专业的 AI 助手。

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

## 关于小应用（MiniApp）

小应用是可复用的功能模块，可以帮助用户管理数据、执行任务等。你可以：

### 1. 创建小应用
当用户需要一个新的功能模块时，使用 \`create_miniapp\` 工具创建。

**创建小应用的最佳实践**：
- **名称规范**：使用小写字母、数字、连字符，如 "todo-manager", "note-keeper"
- **清晰描述**：准确说明小应用的功能和用途
- **代码结构**：
  \`\`\`javascript
  // 可用的上下文变量：
  // - action: 操作类型 ('create' | 'read' | 'update' | 'delete')
  // - params: 参数对象
  // - storage: 存储API { get(key), set(key, value) }
  // - console: 日志API { log(...), error(...) }
  
  // 根据 action 执行不同操作
  switch (action) {
    case 'create':
      // 创建新数据
      const newItem = { id: Date.now().toString(), ...params };
      const items = await storage.get('items') || [];
      items.push(newItem);
      await storage.set('items', items);
      return newItem;
    
    case 'read':
      // 读取数据
      return await storage.get('items') || [];
    
    case 'update':
      // 更新数据
      const allItems = await storage.get('items') || [];
      const index = allItems.findIndex(i => i.id === params.id);
      if (index !== -1) {
        allItems[index] = { ...allItems[index], ...params.updates };
        await storage.set('items', allItems);
        return allItems[index];
      }
      throw new Error('项目不存在');
    
    case 'delete':
      // 删除数据
      const currentItems = await storage.get('items') || [];
      const filtered = currentItems.filter(i => i.id !== params.id);
      await storage.set('items', filtered);
      return { success: true, deletedId: params.id };
    
    default:
      throw new Error('不支持的操作: ' + action);
  }
  \`\`\`

**常见小应用类型**：
- 待办事项管理器：管理任务列表
- 笔记本：记录和搜索笔记
- 倒计时提醒：设置重要日期提醒
- 简单计算器：执行计算并保存历史
- 数据收集器：收集和整理信息

### 2. 更新小应用
当需要修改已存在的小应用时，使用 \`update_miniapp\` 工具。

**可更新的内容**：
- 显示名称和描述
- 代码逻辑
- 图标和标签
- 状态（激活/暂停/归档）
- 公开和分享设置

### 3. 调用小应用
使用 \`invoke_miniapp\` 工具执行小应用的功能。

**调用参数**：
- \`miniAppId\`: 小应用ID
- \`installationId\`: 安装ID
- \`action\`: 操作类型（create/read/update/delete）
- \`params\`: 操作参数（根据具体小应用而定）

## 工作流程示例

**场景1：用户想要一个待办事项管理器**
1. 使用 \`create_miniapp\` 创建待办事项小应用
2. 小应用会自动安装并返回 ID
3. 使用 \`invoke_miniapp\` 调用小应用添加待办事项

**场景2：用户想修改现有小应用**
1. 询问用户要修改哪个小应用（如果不确定）
2. 使用 \`update_miniapp\` 更新代码或配置
3. 确认更新成功

**场景3：用户想使用已安装的小应用**
1. 从对话上下文或用户消息中获取小应用信息
2. 使用 \`invoke_miniapp\` 执行相应操作
3. 返回执行结果

请用简洁、清晰、友好的方式回复用户。`;

    // 创建 Realtime Channel 用于流式传输
    // 使用与前端一致的 channel 名称
    const channelName = `conversation:${conversationId}:streaming`;
    const channel = supabase.channel(channelName);

    // 订阅 channel（确保已连接）
    await new Promise((resolve) => {
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        }
      });
    });

    // 流式处理内容块（支持文本和多模态内容）
    const generatedFiles: AttachmentWithPath[] = [];

    // 初始化 MCP 工具
    console.log('Initializing MCP tools...');
    const mcpTools = await initializeMCPTools(supabase, channel, messageId);
    console.log(`Loaded ${Object.keys(mcpTools).length} MCP tools`);

    // 检查用户消息是否包含 MiniApp 调用请求
    const userMessage = conversationHistory[conversationHistory.length - 1];
    const miniAppMetadata = userMessage?.metadata?.miniApp;
    let miniAppInfo = null;

    if (miniAppMetadata) {
      // 获取 MiniApp 详情
      const { data: miniApp } = await supabase
        .from('mini_apps')
        .select('*')
        .eq('id', miniAppMetadata.miniAppId)
        .single();

      const { data: installation } = await supabase
        .from('mini_app_installations')
        .select('*')
        .eq('id', miniAppMetadata.installationId)
        .single();

      if (miniApp && installation) {
        miniAppInfo = { miniApp, installation };
        console.log('User requested MiniApp:', miniApp.display_name);
      }
    }

    // 如果用户选择了 MiniApp,添加特定指令
    if (miniAppInfo) {
      const manifest = miniAppInfo.miniApp.manifest || {};
      const capabilities = manifest.apis || [];

      systemPrompt += `

  **重要提示**: 用户在这条消息中选择了小应用 "${miniAppInfo.miniApp.display_name}"。

  **小应用信息**:
  - 名称: ${miniAppInfo.miniApp.display_name}
  - 描述: ${miniAppInfo.miniApp.description}
  - 小应用ID: ${miniAppInfo.miniApp.id}
  - 安装ID: ${miniAppInfo.installation.id}
  ${capabilities.length > 0 ? `- 支持的功能: ${capabilities.join(', ')}` : ''}

  **调用指南**:
  你必须使用 invoke_miniapp 工具来调用这个小应用。根据用户的意图选择合适的操作:

  1. **创建操作 (action: "create")**
    - 用户想要添加、创建、新建内容时使用
    - 示例: "添加一个待办", "创建一个笔记", "新建提醒"
    - 参数: 提取用户提供的所有相关信息 (标题、内容、日期等)

  2. **读取操作 (action: "read")**
    - 用户想要查看、列出、搜索内容时使用
    - 示例: "显示所有待办", "查看我的笔记", "搜索包含XX的内容"
    - 参数: 如果有搜索条件或ID,传递 query 或 id 参数

  3. **更新操作 (action: "update")**
    - 用户想要修改、更新、标记内容时使用
    - 示例: "标记XX为完成", "修改笔记内容", "更新提醒时间"
    - 参数: 必须包含 id (要更新的项目ID) 和 updates (更新的字段)

  4. **删除操作 (action: "delete")**
    - 用户想要删除、移除内容时使用
    - 示例: "删除这个待办", "移除笔记", "清空所有数据"
    - 参数: 包含 id (要删除的项目ID)

  **参数提取规则**:
  - 仔细分析用户消息,提取所有相关信息
  - 使用清晰的参数名称 (如 title, content, date, tags 等)
  - 如果用户提到具体的项目,尝试从上下文中获取其 ID
  - 如果信息不完整,可以先调用 read 操作获取现有数据

  **响应格式**:
  - 调用小应用后,用友好的语言向用户解释操作结果
  - 如果操作成功,确认用户的请求已完成
  - 如果失败,解释原因并建议解决方案`;
    }

    // 合并内置工具和 MCP 工具
    const allTools = {
      ...mcpTools,
      invoke_miniapp: tool({
        description:
          '调用小应用执行特定功能。小应用是用户创建的可复用功能模块,可以处理数据、执行任务等。',
        inputSchema: z.object({
          miniAppId: z.string().describe('小应用ID'),
          installationId: z.string().describe('小应用安装ID'),
          action: z.string().describe('要执行的操作,如 "create", "read", "update", "delete"'),
          params: z.record(z.any()).describe('操作参数'),
        }),
        execute: async ({ miniAppId, installationId, action, params }) => {
          const startTime = Date.now();

          try {
            console.log('调用小应用:', { miniAppId, installationId, action, params });

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: 'invoke_miniapp',
                args: { miniAppId, installationId, action, params },
              },
            });

            // 获取 MiniApp 详情
            const { data: miniApp, error: miniAppError } = await supabase
              .from('mini_apps')
              .select('*')
              .eq('id', miniAppId)
              .single();

            if (miniAppError || !miniApp) {
              throw new Error('小应用不存在');
            }

            // 验证安装
            const { data: installation, error: installError } = await supabase
              .from('mini_app_installations')
              .select('*')
              .eq('id', installationId)
              .eq('mini_app_id', miniAppId)
              .single();

            if (installError || !installation || installation.status !== 'active') {
              throw new Error('小应用未安装或已禁用');
            }

            // 验证权限
            const requiredPermissions = miniApp.manifest?.required_permissions || [];
            const grantedPermissions = installation.granted_permissions || [];

            for (const permission of requiredPermissions) {
              if (!grantedPermissions.includes(permission)) {
                throw new Error(`缺少必需权限: ${permission}`);
              }
            }

            // 获取运行时配置
            const runtimeConfig = miniApp.runtime_config || {
              max_execution_time_ms: 5000,
              max_memory_mb: 10,
            };

            // 创建安全的存储 API (带权限检查)
            const createSecureStorage = () => {
              const storageOps: Record<string, number> = {};
              const MAX_OPS_PER_SECOND = 10;

              return {
                get: async (key: string) => {
                  // 速率限制
                  const now = Date.now();
                  storageOps[key] = (storageOps[key] || 0) + 1;
                  if (storageOps[key] > MAX_OPS_PER_SECOND) {
                    throw new Error('存储操作频率过高');
                  }

                  const { data } = await supabase
                    .from('mini_app_data')
                    .select('value')
                    .eq('installation_id', installationId)
                    .eq('key', key)
                    .single();
                  return data?.value;
                },
                set: async (key: string, value: any) => {
                  // 速率限制
                  storageOps[key] = (storageOps[key] || 0) + 1;
                  if (storageOps[key] > MAX_OPS_PER_SECOND) {
                    throw new Error('存储操作频率过高');
                  }

                  // 大小限制 (1MB)
                  const valueStr = JSON.stringify(value);
                  if (valueStr.length > 1024 * 1024) {
                    throw new Error('存储值过大 (最大 1MB)');
                  }

                  await supabase.from('mini_app_data').upsert({
                    installation_id: installationId,
                    key,
                    value,
                    value_type: typeof value,
                  });
                },
              };
            };

            // 创建安全的沙箱上下文
            const sandboxContext = {
              action,
              params,
              storage: createSecureStorage(),
              console: {
                log: (...args: any[]) => console.log('[MiniApp]', miniApp.display_name, ...args),
                error: (...args: any[]) =>
                  console.error('[MiniApp]', miniApp.display_name, ...args),
              },
            };

            // 执行 MiniApp 代码 (带超时控制)
            const executeWithTimeout = async (code: string, context: any, timeout: number) => {
              return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                  reject(new Error(`执行超时 (最大 ${timeout}ms)`));
                }, timeout);

                try {
                  // 创建安全的执行环境
                  // 禁止访问危险的全局对象
                  const safeGlobals = {
                    console: context.console,
                    Date,
                    Math,
                    JSON,
                    Object,
                    Array,
                    String,
                    Number,
                    Boolean,
                  };

                  const executeCode = new Function(
                    'context',
                    'globals',
                    `
                    'use strict';
                    const { action, params, storage, console } = context;
                    const { Date, Math, JSON, Object, Array, String, Number, Boolean } = globals;

                    // 禁止访问危险对象
                    const process = undefined;
                    const require = undefined;
                    const module = undefined;
                    const exports = undefined;
                    const global = undefined;
                    const globalThis = undefined;

                    return (async () => {
                      ${code}
                    })();
                    `
                  );

                  const resultPromise = executeCode(context, safeGlobals);

                  Promise.resolve(resultPromise)
                    .then((result) => {
                      clearTimeout(timer);
                      resolve(result);
                    })
                    .catch((error) => {
                      clearTimeout(timer);
                      reject(error);
                    });
                } catch (error) {
                  clearTimeout(timer);
                  reject(error);
                }
              });
            };

            const result = await executeWithTimeout(
              miniApp.code,
              sandboxContext,
              runtimeConfig.max_execution_time_ms
            );

            const executionTime = Date.now() - startTime;

            // 记录执行日志
            await supabase.from('audit_logs').insert({
              actor_id: installation.user_id,
              action: 'miniapp_invocation',
              resource_type: 'mini_app',
              resource_id: miniAppId,
              details: {
                installation_id: installationId,
                action,
                execution_time_ms: executionTime,
                success: true,
              },
            });

            // 增加调用次数
            await supabase.rpc('increment_miniapp_invocations', { miniapp_id: miniAppId });

            // 发送成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'invoke_miniapp',
                status: 'success',
                result: {
                  miniAppName: miniApp.display_name,
                  action,
                  result,
                  executionTime,
                },
              },
            });

            console.log(`小应用执行成功: ${miniApp.display_name} (${executionTime}ms)`);

            return `✅ 小应用 "${miniApp.display_name}" 执行成功\n操作: ${action}\n执行时间: ${executionTime}ms\n结果: ${JSON.stringify(result, null, 2)}`;
          } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('小应用调用失败:', error);

            // 记录错误日志
            try {
              const { data: installation } = await supabase
                .from('mini_app_installations')
                .select('user_id')
                .eq('id', installationId)
                .single();

              if (installation) {
                await supabase.from('audit_logs').insert({
                  actor_id: installation.user_id,
                  action: 'miniapp_invocation',
                  resource_type: 'mini_app',
                  resource_id: miniAppId,
                  details: {
                    installation_id: installationId,
                    action,
                    execution_time_ms: executionTime,
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误',
                  },
                });
              }
            } catch (logError) {
              console.error('记录审计日志失败:', logError);
            }

            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'invoke_miniapp',
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
                executionTime,
              },
            });

            return `❌ 小应用调用失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      }),
      create_miniapp: tool({
        description:
          '创建一个新的小应用。小应用是可复用的功能模块,可以帮助用户管理数据、执行任务等。创建后会自动为当前用户安装。',
        inputSchema: z.object({
          name: z
            .string()
            .describe('小应用唯一标识名称(只能包含字母、数字、下划线、连字符),如 "todo-manager"'),
          display_name: z.string().describe('小应用显示名称,如 "待办事项管理器"'),
          description: z.string().describe('小应用功能描述,清晰说明小应用的用途'),
          code: z
            .string()
            .describe(
              '小应用的JavaScript代码。代码中可以使用: action(操作类型), params(参数对象), storage.get(key), storage.set(key, value), console.log()。必须根据action执行相应操作并返回结果。'
            ),
          icon_url: z.string().optional().describe('小应用图标URL(可选)'),
          tags: z.array(z.string()).optional().describe('标签数组,如 ["效率工具", "任务管理"]'),
          required_permissions: z
            .array(z.string())
            .optional()
            .describe('需要的权限列表,如 ["storage", "notifications"]'),
        }),
        execute: async ({
          name,
          display_name,
          description,
          code,
          icon_url,
          tags,
          required_permissions,
        }) => {
          const startTime = Date.now();

          try {
            console.log('创建小应用:', { name, display_name });

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: 'create_miniapp',
                args: { name, display_name, description },
              },
            });

            // 验证名称格式
            if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
              throw new Error('小应用名称格式无效,只能包含字母、数字、下划线和连字符');
            }

            // 检查名称是否已存在
            const { data: existingApp } = await supabase
              .from('mini_apps')
              .select('id')
              .eq('name', name)
              .eq('creator_id', userId)
              .single();

            if (existingApp) {
              throw new Error(`小应用名称 "${name}" 已存在,请使用其他名称`);
            }

            // 构建 manifest
            const manifest = {
              version: '1.0.0',
              required_permissions: required_permissions || ['storage'],
              apis: ['storage', 'console'],
              triggers: [],
            };

            // 创建小应用
            const { data: miniApp, error: createError } = await supabase
              .from('mini_apps')
              .insert({
                creator_id: userId,
                name,
                display_name,
                description,
                code,
                icon_url: icon_url || null,
                manifest,
                runtime_config: {
                  sandbox_level: 'strict',
                  max_memory_mb: 10,
                  max_execution_time_ms: 5000,
                  allowed_domains: [],
                },
                status: 'active',
                is_public: false,
                is_shareable: true,
                tags: tags || [],
              })
              .select()
              .single();

            if (createError || !miniApp) {
              throw new Error(`创建小应用失败: ${createError?.message || '未知错误'}`);
            }

            // 自动为当前用户安装
            const { data: installation, error: installError } = await supabase
              .from('mini_app_installations')
              .insert({
                user_id: userId,
                mini_app_id: miniApp.id,
                installed_version: manifest.version,
                granted_permissions: manifest.required_permissions,
                status: 'active',
              })
              .select()
              .single();

            if (installError || !installation) {
              console.error('自动安装失败:', installError);
              // 不抛出错误,因为小应用已创建成功
            }

            const executionTime = Date.now() - startTime;

            // 记录审计日志
            await supabase.from('audit_logs').insert({
              actor_id: userId,
              action: 'miniapp_creation',
              resource_type: 'mini_app',
              resource_id: miniApp.id,
              details: {
                name,
                display_name,
                execution_time_ms: executionTime,
                auto_installed: !!installation,
              },
            });

            // 发送成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'create_miniapp',
                status: 'success',
                result: {
                  miniAppId: miniApp.id,
                  installationId: installation?.id,
                  name: miniApp.name,
                  display_name: miniApp.display_name,
                },
              },
            });

            console.log(`小应用创建成功: ${miniApp.display_name} (${executionTime}ms)`);

            return `✅ 小应用 "${miniApp.display_name}" 创建成功!

**小应用信息**:
- ID: ${miniApp.id}
- 名称: ${miniApp.name}
- 显示名称: ${miniApp.display_name}
- 描述: ${miniApp.description}
- 状态: ${miniApp.status}
${installation ? `- 安装ID: ${installation.id}\n- 已自动安装并激活` : ''}

你现在可以使用 invoke_miniapp 工具来调用这个小应用了。`;
          } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('创建小应用失败:', error);

            // 记录错误日志
            await supabase.from('audit_logs').insert({
              actor_id: userId,
              action: 'miniapp_creation',
              resource_type: 'mini_app',
              resource_id: null,
              details: {
                name,
                display_name,
                execution_time_ms: executionTime,
                success: false,
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'create_miniapp',
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            return `❌ 创建小应用失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      }),
      update_miniapp: tool({
        description:
          '更新已存在的小应用。可以更新代码、描述、配置等信息。只能更新自己创建的小应用。',
        inputSchema: z.object({
          miniAppId: z.string().describe('要更新的小应用ID'),
          updates: z
            .object({
              display_name: z.string().optional().describe('新的显示名称'),
              description: z.string().optional().describe('新的功能描述'),
              code: z.string().optional().describe('新的JavaScript代码'),
              icon_url: z.string().optional().describe('新的图标URL'),
              tags: z.array(z.string()).optional().describe('新的标签数组'),
              status: z
                .enum(['draft', 'active', 'suspended', 'archived'])
                .optional()
                .describe('新的状态'),
              is_public: z.boolean().optional().describe('是否公开'),
              is_shareable: z.boolean().optional().describe('是否可分享'),
            })
            .describe('要更新的字段'),
        }),
        execute: async ({ miniAppId, updates }) => {
          const startTime = Date.now();

          try {
            console.log('更新小应用:', { miniAppId, updates });

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: 'update_miniapp',
                args: { miniAppId, updates },
              },
            });

            // 验证小应用存在且属于当前用户
            const { data: existingApp, error: fetchError } = await supabase
              .from('mini_apps')
              .select('*')
              .eq('id', miniAppId)
              .eq('creator_id', userId)
              .single();

            if (fetchError || !existingApp) {
              throw new Error('小应用不存在或无权限更新');
            }

            // 如果没有任何更新字段
            if (Object.keys(updates).length === 0) {
              throw new Error('没有提供要更新的字段');
            }

            // 执行更新
            const { data: updatedApp, error: updateError } = await supabase
              .from('mini_apps')
              .update({
                ...updates,
                updated_at: new Date().toISOString(),
              })
              .eq('id', miniAppId)
              .eq('creator_id', userId)
              .select()
              .single();

            if (updateError || !updatedApp) {
              throw new Error(`更新小应用失败: ${updateError?.message || '未知错误'}`);
            }

            const executionTime = Date.now() - startTime;

            // 记录审计日志
            await supabase.from('audit_logs').insert({
              actor_id: userId,
              action: 'miniapp_update',
              resource_type: 'mini_app',
              resource_id: miniAppId,
              details: {
                updated_fields: Object.keys(updates),
                execution_time_ms: executionTime,
              },
            });

            // 发送成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'update_miniapp',
                status: 'success',
                result: {
                  miniAppId: updatedApp.id,
                  name: updatedApp.name,
                  display_name: updatedApp.display_name,
                  updated_fields: Object.keys(updates),
                },
              },
            });

            console.log(`小应用更新成功: ${updatedApp.display_name} (${executionTime}ms)`);

            const updatedFieldsList = Object.keys(updates)
              .map((key) => `- ${key}: ${updates[key as keyof typeof updates]}`)
              .join('\n');

            return `✅ 小应用 "${updatedApp.display_name}" 更新成功!

**更新的字段**:
${updatedFieldsList}

**当前信息**:
- ID: ${updatedApp.id}
- 名称: ${updatedApp.name}
- 显示名称: ${updatedApp.display_name}
- 状态: ${updatedApp.status}
- 更新时间: ${new Date(updatedApp.updated_at).toLocaleString('zh-CN')}`;
          } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('更新小应用失败:', error);

            // 记录错误日志
            await supabase.from('audit_logs').insert({
              actor_id: userId,
              action: 'miniapp_update',
              resource_type: 'mini_app',
              resource_id: miniAppId,
              details: {
                execution_time_ms: executionTime,
                success: false,
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'update_miniapp',
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            return `❌ 更新小应用失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      }),
      generating_image: tool({
        description: '根据提示词生成图片。支持多种模型和尺寸。',
        inputSchema: z.object({
          prompt: z.string().describe('图片生成提示词，描述要生成的图片内容'),
          width: z.number().describe('图片宽度，默认 1024'),
          height: z.number().describe('图片高度，默认 1024'),
          model: z
            .string()
            .describe('图片生成模型：flux (高质量), turbo (快速), gptimage (GPT风格)'),
        }),
        execute: async ({ prompt, width, height, model }) => {
          // 设置默认值
          const finalWidth = width || 1024;
          const finalHeight = height || 1024;
          const finalModel = model || 'flux';

          try {
            console.log('开始生成图片:', {
              prompt,
              width: finalWidth,
              height: finalHeight,
              model: finalModel,
            });

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: 'generating_image',
                args: { prompt, width: finalWidth, height: finalHeight, model: finalModel },
              },
            });

            // 构建图片生成 URL
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${finalWidth}&height=${finalHeight}&model=${finalModel}&nologo=true`;

            // 获取图片数据
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`图片生成失败: ${response.statusText}`);
            }

            // 获取图片二进制数据
            const imageBuffer = await response.arrayBuffer();
            const imageBytes = new Uint8Array(imageBuffer);

            // 生成唯一文件名
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const filename = `generated-${timestamp}-${randomStr}.png`;
            const filePath = `generated-images/${conversationId}/${filename}`;

            console.log('上传图片到 Supabase Storage:', filePath);

            // 上传到 Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, imageBytes, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error('图片上传失败:', uploadError);
              throw new Error(`图片上传失败: ${uploadError.message}`);
            }

            // 添加到生成文件列表
            const generatedFile: AttachmentWithPath = {
              type: 'image/png',
              url: '',
              path: filePath,
              name: filename,
              size: imageBytes.length,
            };
            generatedFiles.push(generatedFile);

            // 通过 Realtime Channel 发送图片生成成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'generating_image',
                status: 'success',
                result: {
                  prompt,
                  width: finalWidth,
                  height: finalHeight,
                  model: finalModel,
                  name: filename,
                  path: filePath,
                  type: 'image/png',
                },
              },
            });

            return `✅ 图片已生成：${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}\n`;
          } catch (error) {
            console.error('图片生成工具执行失败:', error);

            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'generating_image',
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            return `❌ 图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      }),
      reading_taged_file: tool({
        description: '读取对话中的标记文件（<file />）的内容',
        inputSchema: z.object({
          path: z.string().describe('目标标记文件中的path/name, <file path="path" name="name" />'),
        }),
        execute: async ({ path }) => {
          // 设置默认值
          const attachment = attachmentPathMap[path] || attachmentNameMap[path];

          if (!attachment) {
            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'reading_taged_file',
                status: 'error',
                error: '找不到该标记文件',
              },
            });

            return `❌ 找不到该标记文件`;
          }

          try {
            console.log('开始读取标记文件:', {
              path,
            });

            // 发送工具调用开始事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: 'reading_taged_file',
                args: { path },
              },
            });

            const result = await toFileContext(supabase, attachment);

            // 通过 Realtime Channel 发送图片生成成功事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'reading_taged_file',
                status: 'success',
                result,
              },
            });

            return result;
          } catch (error) {
            console.error('读取标记文件工具执行失败:', error);

            // 发送错误事件
            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: 'reading_taged_file',
                status: 'error',
                error: error instanceof Error ? error.message : '未知错误',
              },
            });

            return `❌ 图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      }),
    };

    // 使用 Vercel AI SDK 流式生成回复
    const result = streamText({
      model: registry.languageModel('pollinations:gemini'),
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      toolChoice: 'auto',
      tools: allTools,
      stopWhen: stepCountIs(5),
    });

    // 处理文本流
    for await (const textPart of result.textStream) {
      fullContent += textPart;

      // 通过 Realtime Channel 发送流式文本块
      await channel.send({
        type: 'broadcast',
        event: 'message_chunk',
        payload: {
          messageId,
          chunk: textPart,
          fullContent,
          type: 'text',
        },
      });
    }

    // 等待流式完成并获取使用统计和生成的文件
    const finalResult = await result;
    tokenCount = finalResult.usage?.totalTokens || 0;

    // 检查是否有生成的文件（如图片）
    // 注意：某些模型（如 Google Gemini）可以生成图片
    if (finalResult.response?.messages) {
      for (const message of finalResult.response.messages) {
        if (message.content && Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'file' || (part.type === 'image' && part.image)) {
              generatedFiles.push({
                type: part.type,
                url: part.url || part.image,
                mediaType: part.mimeType || part.mediaType || 'image/png',
                name: part.filename || `generated-${Date.now()}.png`,
                path: part.filename || `generated-${Date.now()}.png`,
              });

              // 发送文件生成事件
              await channel.send({
                type: 'broadcast',
                event: 'message_file',
                payload: {
                  messageId,
                  file: generatedFiles[generatedFiles.length - 1],
                },
              });
            }
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;

    // 发送完成信号
    await channel.send({
      type: 'broadcast',
      event: 'message_complete',
      payload: {
        messageId,
        fullContent,
        tokenCount,
        processingTime,
        files: generatedFiles,
      },
    });

    // 取消订阅并清理 channel
    await supabase.removeChannel(channel);

    // 准备更新数据
    const updateData: any = {
      content: fullContent,
      status: 'sent',
      agent_metadata: {
        model: 'mango',
        tokens: tokenCount,
        thinking_time_ms: processingTime,
      },
    };

    // 如果有生成的文件，添加到附件中
    if (generatedFiles.length > 0) {
      updateData.attachments = generatedFiles;
    }

    // 更新数据库中的完整消息
    await supabase.from('messages').update(updateData).eq('id', messageId);

    console.log('Agent response completed', {
      messageId,
      contentLength: fullContent.length,
      tokens: tokenCount,
      processingTime,
    });
  } catch (error) {
    console.error('AI streaming error:', error);

    // 发送错误消息
    const errorContent = `抱歉，我在处理您的消息时遇到了问题。错误信息：${
      error instanceof Error ? error.message : '未知错误'
    }`;

    // 更新数据库
    await supabase
      .from('messages')
      .update({
        content: errorContent,
        status: 'failed',
        agent_metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: Date.now() - startTime,
        },
      })
      .eq('id', messageId);

    throw error;
  }
}
