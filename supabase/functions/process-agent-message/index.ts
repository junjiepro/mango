/**
 * Supabase Edge Function: Process Agent Message
 * Handles AI Agent response to user messages using Vercel AI SDK
 * Supports streaming responses via Realtime Channel
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';
import {
  tool,
  stepCountIs,
  ModelMessage,
  Experimental_Agent as Agent,
} from 'https://esm.sh/ai@5.0.110';
import { z } from 'https://esm.sh/zod@3.23.8';

// Import refactored modules
import type { AgentMessagePayload } from './types.ts';
import { corsHeaders as CORS_HEADERS } from './config.ts';
import { createAgentMessage } from './lib/message.ts';
import { getConversationHistory, getNextSequenceNumber } from './lib/history.ts';
import { getSystemPrompt } from './agent/system-prompt.ts';
import { createA2UITool } from './tools/a2ui.ts';
import { loadLearningContext } from './lib/learning.ts';
import { SkillLoader } from './lib/skill-loader.ts';
import { buildSkillContext, generateSkillContextPrompt } from './lib/skill-context.ts';
import { createLoadSkillTool } from './tools/load-skill.ts';
import {
  TimeoutApproachingError,
  createTimeoutMonitor,
  MAX_CONTINUATION_RUNS,
} from './lib/timeout-monitor.ts';
import { initializeMCPTools } from './lib/mcp-tools.ts';
import { toFileContext, AttachmentWithPath } from './lib/file-context.ts';
import {
  createInvokeMiniAppTool,
  createCreateMiniAppTool,
  createUpdateMiniAppTool,
  createGetMiniAppTool,
  createGetMiniAppVersionsTool,
  createRollbackMiniAppTool,
} from './tools/miniapp.ts';
import { combinedLanguageModel } from './lib/registry.ts';

const corsHeaders = CORS_HEADERS;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey =
      Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { conversationId, messageId, userId, deviceId, locale, continuation } =
      (await req.json()) as AgentMessagePayload;

    if (!conversationId || !messageId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 检查是否超过最大续传次数
    const currentRunCount = continuation?.runCount || 1;
    if (currentRunCount > MAX_CONTINUATION_RUNS) {
      console.warn('Max continuation runs exceeded:', currentRunCount);
      return new Response(
        JSON.stringify({ error: 'Max continuation runs exceeded', runCount: currentRunCount }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Get conversation history using refactored module
    const conversationHistory = await getConversationHistory(supabase, conversationId);

    // 续传模式：复用已有的 agent message；新请求：创建新消息
    let agentMessageId: string;
    if (continuation?.agentMessageId) {
      agentMessageId = continuation.agentMessageId;
      console.log('Continuing agent message:', { agentMessageId, runCount: currentRunCount });
    } else {
      const sequenceNumber = await getNextSequenceNumber(supabase, conversationId);
      const agentMessage = await createAgentMessage(
        supabase,
        conversationId,
        messageId,
        sequenceNumber
      );
      agentMessageId = agentMessage.id;
    }

    // Process agent response with streaming
    const process = async () => {
      try {
        // Stream agent response
        await streamAgentResponse(
          supabase,
          conversationId,
          agentMessageId,
          conversationHistory,
          userId,
          deviceId,
          {
            runCount: currentRunCount,
            partialContent: continuation?.partialContent,
            totalTokens: continuation?.totalTokens,
          },
          locale
        );
      } catch (error) {
        console.error('Agent response error:', error);
        // Update message status to failed
        await supabase
          .from('messages')
          .update({
            content:
              locale === 'en'
                ? 'Sorry, I encountered some issues and was unable to reply to your message.'
                : '抱歉，我遇到了一些问题，无法回复您的消息。',
            status: 'failed',
            agent_metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          .eq('id', agentMessageId);
      }
    };

    // Start processing asynchronously
    process();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: agentMessageId,
        runCount: currentRunCount,
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
 * Stream agent response using Vercel AI SDK and Supabase Realtime
 */
async function streamAgentResponse(
  supabase: any,
  conversationId: string,
  messageId: string,
  conversationHistory: any[],
  userId: string,
  deviceId?: string | null,
  continuationState?: {
    runCount: number;
    partialContent?: string;
    totalTokens?: number;
    a2uiComponents?: any[];
    generatedFiles?: AttachmentWithPath[];
  },
  locale?: string
): Promise<void> {
  const startTime = Date.now();
  const runCount = continuationState?.runCount || 1;
  let fullContent = continuationState?.partialContent || '';
  let tokenCount = continuationState?.totalTokens || 0;
  const a2uiComponents: any[] = continuationState?.a2uiComponents || [];
  // 流式处理内容块（支持文本和多模态内容）
  const generatedFiles: AttachmentWithPath[] = continuationState?.generatedFiles || [];
  const toolCallHistory: Array<{ tool: string; status: 'success' | 'error' }> = [];
  let lastToolCall: string | undefined;

  // 创建超时监控器（50秒安全限制，预留10秒缓冲）
  const timeoutMonitor = createTimeoutMonitor({
    maxExecutionTime: 60000,
    safetyBuffer: 10000,
    warningThreshold: 15000,
  });

  const abortController = new AbortController();

  // 创建 Realtime Channel 用于流式传输
  // 使用与前端一致的 channel 名称
  const channelName = `conversation:${conversationId}:streaming`;
  const channel = supabase.channel(channelName);

  try {
    // 构建消息历史，支持多模态内容
    const attachmentPathMap: Record<string, AttachmentWithPath> = {};
    const attachmentNameMap: Record<string, AttachmentWithPath> = {};
    const messages: ModelMessage[] = await Promise.all(
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

    // 继续处理之前的消息
    if (fullContent) {
      messages.push({ role: 'assistant', content: fullContent });
    }

    // 加载用户学习上下文
    const learningContext = await loadLearningContext(supabase, userId);

    // 初始化 SkillLoader
    const skillLoader = new SkillLoader(supabase);
    await skillLoader.ensureInitialized();

    // 获取用户最新消息用于 Skill 匹配
    const latestUserMessage =
      conversationHistory.filter((msg: any) => msg.sender_type === 'user').pop()?.content || '';

    // 加载 Skill 上下文（两阶段加载：元数据先行）
    const skillContext = await buildSkillContext(skillLoader, latestUserMessage);
    console.log(
      `Loaded ${skillContext.totalCount} skills, ${skillContext.matchedSkills.length} matched`
    );

    // 系统提示词（使用模块化提示词）
    let systemPrompt = getSystemPrompt(learningContext, locale);

    // 订阅 channel（确保已连接）
    await new Promise((resolve) => {
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        }
      });
    });

    // 监听中止请求
    channel.on('broadcast', { event: 'abort_request' }, () => {
      console.log('Received abort request for message:', messageId);
      abortController.abort();
    });

    // 初始化 MCP 工具（包括用户设备的工具）
    console.log('Initializing MCP tools...');
    let mcpTools = {};
    try {
      mcpTools = await initializeMCPTools(
        supabase,
        channel,
        messageId,
        userId,
        deviceId,
        abortController.signal
      );
      console.log(`✅ Loaded ${Object.keys(mcpTools).length} MCP tools`);
    } catch (error) {
      console.error('❌ MCP tools initialization failed:', error);
      console.log('Continuing without device MCP tools');
    }

    // 注入 Skill 上下文到系统提示词（两阶段加载模式）
    if (skillContext.totalCount > 0) {
      systemPrompt += '\n\n' + generateSkillContextPrompt(skillContext);
    }

    // 检查用户消息是否包含 MiniApp 调用请求
    const userMessage = conversationHistory.filter((msg: any) => msg.sender_type === 'user').pop();
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
      const mcpTools = manifest.tools || [];
      const lang = locale === 'en' ? 'en' : 'zh';

      if (lang === 'en') {
        systemPrompt += `

**Important**: The user selected the MiniApp "${miniAppInfo.miniApp.display_name}" in this message.

**MiniApp Info**:
- Name: ${miniAppInfo.miniApp.display_name}
- Description: ${miniAppInfo.miniApp.description}
- MiniApp ID: ${miniAppInfo.miniApp.id}
${mcpTools.length > 0 ? `- Available tools: ${mcpTools.map((t: any) => t.name).join(', ')}` : ''}

**Invocation Guide**:
Use the \`invoke_miniapp\` tool to call this MiniApp via MCP protocol:
- miniAppId: "${miniAppInfo.miniApp.id}"
- toolName: the tool name to call
- args: tool arguments

**Response Format**:
- After calling the MiniApp to get data, use the \`generate_a2ui\` tool to visually present results
- Use \`list\` component for list data, \`card\` component for single items
- Include a brief text description of the operation result`;
      } else {
        systemPrompt += `

**重要提示**: 用户在这条消息中选择了小应用 "${miniAppInfo.miniApp.display_name}"。

**小应用信息**:
- 名称: ${miniAppInfo.miniApp.display_name}
- 描述: ${miniAppInfo.miniApp.description}
- 小应用ID: ${miniAppInfo.miniApp.id}
${mcpTools.length > 0 ? `- 可用工具: ${mcpTools.map((t: any) => t.name).join(', ')}` : ''}

**调用指南**:
使用 \`invoke_miniapp\` 工具通过 MCP 协议调用此小应用：
- miniAppId: "${miniAppInfo.miniApp.id}"
- toolName: 要调用的工具名称
- args: 工具参数

**响应格式**:
- 调用小应用获取数据后，使用 \`generate_a2ui\` 工具可视化展示结果
- 列表数据使用 \`list\` 组件，单个项目使用 \`card\` 组件
- 同时用简短文字说明操作结果`;
      }
    }

    // MiniApp 工具上下文
    const miniAppCtx = { supabase, userId, channel, messageId };

    // 合并内置工具和 MCP 工具
    const allTools = {
      ...mcpTools,
      generate_a2ui: createA2UITool(),
      load_skill: createLoadSkillTool(skillLoader),
      invoke_miniapp: createInvokeMiniAppTool(miniAppCtx),
      create_miniapp: createCreateMiniAppTool(miniAppCtx),
      update_miniapp: createUpdateMiniAppTool(miniAppCtx),
      get_miniapp: createGetMiniAppTool(miniAppCtx),
      get_miniapp_versions: createGetMiniAppVersionsTool(miniAppCtx),
      rollback_miniapp: createRollbackMiniAppTool(miniAppCtx),
      generating_image: tool({
        description:
          '根据提示词生成图片或视频。图片模型: flux(默认), zimage, turbo, gptimage, kontext, seedream, nanobanana。视频模型: veo(文生视频), seedance(文/图生视频)。',
        inputSchema: z.object({
          prompt: z.string().describe('图片/视频生成提示词'),
          model: z
            .string()
            .optional()
            .describe(
              '模型: flux/zimage/turbo/gptimage/kontext/seedream/nanobanana (图片), veo/seedance (视频)'
            ),
          width: z.number().optional().describe('图片宽度，默认 1024'),
          height: z.number().optional().describe('图片高度，默认 1024'),
          seed: z.number().optional().describe('随机种子，-1 为随机'),
          enhance: z.boolean().optional().describe('AI 优化提示词'),
          negative_prompt: z.string().optional().describe('负面提示词，避免生成的内容'),
          safe: z.boolean().optional().describe('启用安全过滤'),
          quality: z.string().optional().describe('图片质量 (gptimage): low/medium/high/hd'),
          transparent: z.boolean().optional().describe('透明背景 (gptimage)'),
          image: z.string().optional().describe('参考图片 URL，多个用逗号分隔'),
          duration: z.number().optional().describe('视频时长秒数 (veo: 4/6/8, seedance: 2-10)'),
          aspectRatio: z.string().optional().describe('视频宽高比: 16:9 或 9:16'),
          audio: z.boolean().optional().describe('生成音频 (veo)'),
        }),
        execute: async (params) => {
          const {
            prompt,
            model = 'flux',
            width = 1024,
            height = 1024,
            seed,
            enhance,
            negative_prompt,
            safe,
            quality,
            transparent,
            image,
            duration,
            aspectRatio,
            audio,
          } = params;

          // 判断是否为视频模型
          const videoModels = ['veo', 'seedance', 'seedance-pro'];
          const isVideo = videoModels.includes(model);

          try {
            console.log(`开始生成${isVideo ? '视频' : '图片'}:`, { prompt, model });

            // 构建 URL 参数
            const urlParams = new URLSearchParams();
            urlParams.set('model', model);

            if (!isVideo) {
              urlParams.set('width', String(width));
              urlParams.set('height', String(height));
            }
            if (seed !== undefined) urlParams.set('seed', String(seed));
            if (enhance) urlParams.set('enhance', 'true');
            if (negative_prompt) urlParams.set('negative_prompt', negative_prompt);
            if (safe) urlParams.set('safe', 'true');
            if (quality) urlParams.set('quality', quality);
            if (transparent) urlParams.set('transparent', 'true');
            if (image) urlParams.set('image', image);
            if (duration) urlParams.set('duration', String(duration));
            if (aspectRatio) urlParams.set('aspectRatio', aspectRatio);
            if (audio) urlParams.set('audio', 'true');

            // 构建生成 URL
            const apiKey = Deno.env.get('POLLINATIONS_API_KEY');
            const genUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${urlParams.toString()}`;

            // 获取数据
            const response = await fetch(genUrl, {
              headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
            });

            if (!response.ok) {
              throw new Error(`生成失败: ${response.statusText}`);
            }

            // 获取二进制数据
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            // 生成文件名
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const ext = isVideo ? 'mp4' : 'png';
            const contentType = isVideo ? 'video/mp4' : 'image/png';
            const filename = `generated-${timestamp}-${randomStr}.${ext}`;
            const filePath = `generated-images/${conversationId}/${filename}`;

            console.log('上传到 Supabase Storage:', filePath);

            // 上传到 Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, bytes, {
                contentType,
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error('上传失败:', uploadError);
              throw new Error(`上传失败: ${uploadError.message}`);
            }

            // 添加到生成文件列表
            const generatedFile: AttachmentWithPath = {
              type: contentType,
              url: '',
              path: filePath,
              name: filename,
              size: bytes.length,
            };
            generatedFiles.push(generatedFile);

            const shortPrompt = prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '');
            return `✅ ${isVideo ? '视频' : '图片'}已生成：${shortPrompt}\n文件: ${filename}`;
          } catch (error) {
            console.error('生成工具执行失败:', error);
            throw error;
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
            throw new Error('找不到该标记文件');
          }

          try {
            console.log('开始读取标记文件:', { path });
            const result = await toFileContext(supabase, attachment);
            return result;
          } catch (error) {
            console.error('读取标记文件工具执行失败:', error);
            throw error; // 让 onStepFinish 统一处理错误
          }
        },
      }),
    };

    console.log('Tools count', Object.keys(allTools).length);

    const mangoAgent = new Agent({
      model: combinedLanguageModel,
      tools: allTools,
      stopWhen: stepCountIs(20),
      prepareStep: () => {
        return {};
      },
      onStepFinish: async ({ toolCalls, toolResults }) => {
        // 统一处理工具调用开始事件
        if (toolCalls) {
          for (const call of toolCalls) {
            console.log('Tool call started:', {
              toolName: call.toolName,
              toolCallId: call.toolCallId,
              args: call.args,
            });

            // 检测是否为 MCP 工具 (设备工具或全局工具)
            const isMcpTool =
              call.toolName.includes('_') &&
              (call.toolName.startsWith('global_') || !call.toolName.startsWith('invoke_'));

            await channel.send({
              type: 'broadcast',
              event: 'tool_call_start',
              payload: {
                messageId,
                tool: call.toolName,
                toolCallId: call.toolCallId,
                args: call.args,
                isMcpTool,
                // 如果是设备 MCP 工具,提取设备名称
                deviceName:
                  isMcpTool && !call.toolName.startsWith('global_')
                    ? call.toolName.split('_')[0]
                    : undefined,
              },
            });
          }
        }

        // 统一处理工具调用结果事件
        if (toolResults) {
          for (const result of toolResults) {
            console.log('Tool call result:', {
              toolName: result.toolName,
              toolCallId: result.toolCallId,
              success: !result.error,
            });

            // 检测是否为 MCP 工具
            const isMcpTool =
              result.toolName.includes('_') &&
              (result.toolName.startsWith('global_') || !result.toolName.startsWith('invoke_'));

            // 解析结果
            let parsedResult: any = result.output;
            let status: 'success' | 'error' = 'success';
            let errorMessage: string | undefined;

            // 检查是否有错误
            if (result.error) {
              status = 'error';
              errorMessage = result.error.message || String(result.error);
            }

            // 对于特定工具,提取结构化结果
            if (status === 'success') {
              try {
                // 如果结果是字符串,尝试解析 JSON
                if (typeof parsedResult === 'string') {
                  // 检查是否是成功/失败消息格式
                  if (parsedResult.startsWith('✅') || parsedResult.startsWith('❌')) {
                    // 保持原样
                  } else {
                    try {
                      parsedResult = JSON.parse(parsedResult);
                    } catch (e) {
                      // 不是 JSON,保持字符串
                    }
                  }
                }

                // 收集 A2UI 组件
                if (result.toolName === 'generate_a2ui' && parsedResult?.component) {
                  a2uiComponents.push(parsedResult.component);
                }
              } catch (error) {
                console.error('Failed to parse tool result:', error);
              }
            }

            await channel.send({
              type: 'broadcast',
              event: 'tool_call_result',
              payload: {
                messageId,
                tool: result.toolName,
                toolCallId: result.toolCallId,
                status,
                result: parsedResult,
                error: errorMessage,
                isMcpTool,
                // 如果是设备 MCP 工具,提取设备名称
                deviceName:
                  isMcpTool && !result.toolName.startsWith('global_')
                    ? result.toolName.split('_')[0]
                    : undefined,
              },
            });

            // 记录工具调用历史
            lastToolCall = result.toolName;
            toolCallHistory.push({
              tool: result.toolName,
              status: result.error ? 'error' : 'success',
            });
          }
        }

        // 记录步骤完成并检查超时
        timeoutMonitor.recordStep();
        const timeoutStatus = timeoutMonitor.getStatus();

        // 如果接近超时，立即抛出错误以触发续传
        // 不再等到 isTimedOut，因为那时 CPU 限制可能已经终止进程
        if (timeoutStatus.isApproaching) {
          console.warn('Approaching timeout limit, triggering continuation:', {
            remainingTime: timeoutStatus.remainingTime,
            elapsedTime: timeoutStatus.elapsedTime,
            stepCount: timeoutMonitor.getStepCount(),
            runCount,
          });

          // 立即抛出错误以触发续传机制
          throw new TimeoutApproachingError(
            'Edge Function timeout approaching',
            timeoutStatus.remainingTime,
            timeoutStatus.elapsedTime
          );
        }
      },
    });

    // 使用 Vercel AI SDK 流式生成回复
    console.log('Starting Agent stream...', { messageId, conversationId });

    const result = mangoAgent.stream({
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    console.log('Agent stream created, starting text stream iteration...');
    // 处理文本流
    try {
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

      // 检查流完成后是否有错误
      // AI SDK 可能在流结束后才暴露错误
      const streamResult = await result;
      if ((streamResult as any).error) {
        throw (streamResult as any).error;
      }
    } catch (streamError) {
      console.error('Text stream iteration error:', streamError);
      throw streamError; // 重新抛出以便外层 catch 处理
    }

    // 等待流式完成并获取使用统计和生成的文件
    // 这些操作也可能抛出错误，需要在外层 catch 中处理
    const finalResult = result;
    let usage;
    let response;
    try {
      usage = await finalResult.usage;
      tokenCount = usage?.totalTokens || 0;
      response = await finalResult.response;
    } catch (finalizeError) {
      console.error('Error finalizing agent response:', finalizeError);
      // 如果已有部分内容，保存它；否则抛出错误
      if (fullContent.length > 0) {
        console.log('Saving partial content due to finalize error');
        // 继续执行，使用已有的 fullContent
      } else {
        throw finalizeError;
      }
    }

    // 检查是否有生成的文件（如图片）
    // 注意：某些模型（如 Google Gemini）可以生成图片
    if (response?.messages) {
      for (const message of response.messages) {
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

    // 如果有 A2UI 组件，添加到 metadata
    if (a2uiComponents.length > 0) {
      updateData.metadata = {
        a2ui: a2uiComponents,
      };
      console.log('Saving A2UI components to metadata:', a2uiComponents.length);
    }

    // 如果有生成的文件，添加到附件中
    if (generatedFiles.length > 0) {
      updateData.attachments = generatedFiles;
    }

    // 更新数据库中的完整消息
    // 检查是否有有效内容，如果没有内容则视为错误
    if (fullContent.length === 0 && a2uiComponents.length === 0 && generatedFiles.length === 0) {
      console.warn('No content generated, treating as error');
      throw new Error('Agent 未生成任何内容');
    }

    await supabase.from('messages').update(updateData).eq('id', messageId);

    console.log('Agent response completed', {
      messageId,
      contentLength: fullContent.length,
      tokens: tokenCount,
      processingTime,
    });
  } catch (error) {
    console.error('AI streaming error:', error);

    // 检查是否为用户主动中止
    if (error instanceof Error && (error.name === 'AbortError' || abortController.signal.aborted)) {
      console.log('Agent execution aborted by user');
      await supabase
        .from('messages')
        .update({
          content: fullContent || '已中止',
          status: 'aborted',
          agent_metadata: { aborted: true, abortedAt: new Date().toISOString() },
        })
        .eq('id', messageId);

      await channel.send({
        type: 'broadcast',
        event: 'message_aborted',
        payload: { messageId, partialContent: fullContent },
      });
      return;
    }

    // 检查是否为超时错误
    const isTimeoutError = error instanceof TimeoutApproachingError;

    if (isTimeoutError) {
      // 超时优雅降级处理
      const timeoutError = error as TimeoutApproachingError;
      console.warn('Timeout graceful degradation:', {
        remainingTime: timeoutError.remainingTime,
        elapsedTime: timeoutError.elapsedTime,
        partialContentLength: fullContent.length,
      });

      // 检查是否可以继续（未达到最大运行次数）
      const canContinue = runCount < MAX_CONTINUATION_RUNS;

      if (canContinue) {
        // 自动触发续传
        console.log('Auto-continuing agent execution:', {
          runCount,
          nextRunCount: runCount + 1,
          partialContentLength: fullContent.length,
        });

        // 触发下一次执行
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const continuationPayload = {
          conversationId,
          messageId: conversationHistory.find((m: any) => m.sender_type === 'user')?.id,
          userId,
          deviceId,
          locale,
          continuation: {
            agentMessageId: messageId,
            runCount: runCount + 1,
            partialContent: fullContent,
            totalTokens: tokenCount,
            a2uiComponents: a2uiComponents.length ? a2uiComponents : undefined,
            generatedFiles: generatedFiles.length ? generatedFiles : undefined,
          },
        };

        // 异步调用自己继续执行
        const supabaseKey =
          Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        fetch(`${supabaseUrl}/functions/v1/process-agent-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(continuationPayload),
        }).catch((err) => {
          console.error('Failed to trigger continuation:', err);
        });

        // 不更新消息状态，让续传继续处理
        return;
      }

      // 达到最大运行次数，保存当前内容并完成
      console.warn('Max continuation runs reached:', { runCount });
      const finalContent =
        fullContent ||
        (locale === 'en'
          ? 'Sorry, your request took too long to process and has reached the maximum number of retries.'
          : '抱歉，处理您的请求需要较长时间，已达到最大处理次数。');

      await supabase
        .from('messages')
        .update({
          content: finalContent,
          status: 'sent',
          agent_metadata: {
            model: 'mango',
            tokens: tokenCount,
            processing_time_ms: timeoutError.elapsedTime,
            runCount,
            maxRunsReached: true,
          },
        })
        .eq('id', messageId);

      return;
    }
    const errorContent =
      locale === 'en'
        ? `Sorry, I encountered an issue while processing your message. Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        : `抱歉，我在处理您的消息时遇到了问题。错误信息：${
            error instanceof Error ? error.message : '未知错误'
          }`;

    // 通过 Realtime Channel 通知前端错误
    try {
      await channel.send({
        type: 'broadcast',
        event: 'message_error',
        payload: {
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: errorContent,
        },
      });
    } catch (channelError) {
      console.error('Failed to send error notification:', channelError);
    }

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
  } finally {
    abortController.abort();
  }
}
