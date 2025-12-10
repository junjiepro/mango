/**
 * Supabase Edge Function: Process Agent Message
 * Handles AI Agent response to user messages using Vercel AI SDK
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { createOpenAICompatible } from 'https://esm.sh/@ai-sdk/openai-compatible';
import { gateway } from 'https://esm.sh/@ai-sdk/gateway';
import { generateText, createProviderRegistry } from 'https://esm.sh/ai';

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

    // Process agent response
    const process = async () => {
      try {
        // TODO: 集成实际的 AI 模型 API (如 OpenAI, Anthropic Claude, etc.)
        // 这里使用简单的回复作为示例
        const agentResponse = await generateAgentResponse(userMessage.content, conversationHistory);

        // Update agent message with response
        await supabase
          .from('messages')
          .update({
            content: agentResponse.content,
            status: 'sent',
            metadata: {
              model: agentResponse.model,
              tokens_used: agentResponse.tokensUsed,
              processing_time_ms: agentResponse.processingTime,
            },
          })
          .eq('id', agentMessage.id);
      } catch (error) {
        // Update message status to failed
        await supabase
          .from('messages')
          .update({
            content: '抱歉，我遇到了一些问题，无法回复您的消息。',
            status: 'failed',
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          .eq('id', agentMessage.id);

        throw error;
      }
    };

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
 * Generate agent response using Vercel AI SDK
 */
async function generateAgentResponse(
  userMessage: string,
  conversationHistory: any[]
): Promise<{
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
}> {
  const startTime = Date.now();

  try {
    // 构建消息历史
    const messages = conversationHistory
      .filter((msg: any) => msg.sender_type === 'user' || msg.sender_type === 'agent')
      .map((msg: any) => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

    // 系统提示词
    const systemPrompt = `你是 Mango AI 助手，一个智能、友好、专业的 AI 助手。

你的能力：
- 回答各种问题，提供准确、有用的信息
- 帮助用户完成任务，提供建议和指导
- 使用工具和 MCP 协议扩展能力
- 理解上下文，进行多轮对话

请用简洁、清晰、友好的方式回复用户。`;

    // 使用 Vercel AI SDK 生成回复
    const result = await generateText({
      model: registry.languageModel('pollinations:openai'),
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const processingTime = Date.now() - startTime;

    return {
      content: result.text,
      model: 'mango',
      tokensUsed: result.usage.totalTokens,
      processingTime,
    };
  } catch (error) {
    console.error('AI generation error:', error);

    // 返回友好的错误消息
    return {
      content: `抱歉，我在处理您的消息时遇到了问题。错误信息：${
        error instanceof Error ? error.message : '未知错误'
      }`,
      model: 'error',
      tokensUsed: 0,
      processingTime: Date.now() - startTime,
    };
  }
}
