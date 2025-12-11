/**
 * Supabase Edge Function: Process Agent Message
 * Handles AI Agent response to user messages using Vercel AI SDK
 * Supports streaming responses via Realtime Channel
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { createOpenAICompatible } from 'https://esm.sh/@ai-sdk/openai-compatible';
import { gateway } from 'https://esm.sh/@ai-sdk/gateway';
import { streamText, createProviderRegistry, tool } from 'https://esm.sh/ai';
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
        await streamAgentResponse(supabase, conversationId, agentMessage.id, conversationHistory);
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
 * Stream agent response using Vercel AI SDK and Supabase Realtime
 * Supports multimodal input (text, images, files) and output
 */
async function streamAgentResponse(
  supabase: any,
  conversationId: string,
  messageId: string,
  conversationHistory: any[]
): Promise<void> {
  const startTime = Date.now();
  let fullContent = '';
  let tokenCount = 0;

  try {
    // 构建消息历史，支持多模态内容
    const messages = conversationHistory
      .filter((msg: any) => msg.sender_type === 'user' || msg.sender_type === 'agent')
      .map((msg: any) => {
        const role = msg.sender_type === 'user' ? 'user' : 'assistant';

        // 检查是否有附件（多模态内容）
        const hasAttachments =
          msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0;

        if (hasAttachments) {
          // 构建多模态内容数组
          const content: any[] = [{ type: 'text', text: msg.content }];

          // 添加附件（图片、文件等）
          for (const attachment of msg.attachments) {
            if (attachment.type?.startsWith('image/')) {
              // 图片附件
              content.push({
                type: 'image',
                image: attachment.url || attachment.publicUrl,
              });
            } else if (attachment.url || attachment.publicUrl) {
              // 其他文件类型（如果模型支持）
              content.push({
                type: 'file',
                data: attachment.url || attachment.publicUrl,
                mimeType: attachment.type || 'application/octet-stream',
              });
            }
          }

          return { role, content };
        } else {
          // 纯文本消息
          return { role, content: msg.content };
        }
      });

    // 系统提示词
    const systemPrompt = `你是 Mango AI 助手，一个智能、友好、专业的 AI 助手。

你的能力：
- 回答各种问题，提供准确、有用的信息
- 帮助用户完成任务，提供建议和指导
- 使用工具和 MCP 协议扩展能力
- 理解上下文，进行多轮对话
- 生成图片：可以根据用户描述生成各种风格的图片

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
    const generatedFiles: any[] = [];

    // 使用 Vercel AI SDK 流式生成回复
    const result = streamText({
      model: registry.languageModel('openai:gpt-5'),
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      toolChoice: 'required',
      tools: {
        image_generate: tool({
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
                  tool: 'image_generate',
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

              // 获取公开访问 URL
              const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath);

              const publicUrl = urlData.publicUrl;

              console.log('图片生成成功:', publicUrl);

              // 添加到生成文件列表
              const generatedFile = {
                type: 'image/png',
                url: publicUrl,
                filename,
                size: imageBytes.length,
              };
              generatedFiles.push(generatedFile);

              // 通过 Realtime Channel 发送图片生成成功事件
              await channel.send({
                type: 'broadcast',
                event: 'tool_call_result',
                payload: {
                  messageId,
                  tool: 'image_generate',
                  status: 'success',
                  result: {
                    url: publicUrl,
                    prompt,
                    width: finalWidth,
                    height: finalHeight,
                    model: finalModel,
                    filename,
                  },
                },
              });

              return `✅ 图片已生成：${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}\n图片URL: ${publicUrl}`;
            } catch (error) {
              console.error('图片生成工具执行失败:', error);

              // 发送错误事件
              await channel.send({
                type: 'broadcast',
                event: 'tool_call_result',
                payload: {
                  messageId,
                  tool: 'image_generate',
                  status: 'error',
                  error: error instanceof Error ? error.message : '未知错误',
                },
              });

              return `❌ 图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
          },
        }),
      },
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
                filename: part.filename || `generated-${Date.now()}.png`,
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
