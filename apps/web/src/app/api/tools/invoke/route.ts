/**
 * API Route: Tool Invocation
 * POST /api/tools/invoke
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMCPService } from '@/services/MCPService';
import { z } from 'zod';

// Request schema
const InvokeToolRequestSchema = z.object({
  toolName: z.string().min(1),
  arguments: z.record(z.any()),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = InvokeToolRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { toolName, arguments: args, conversationId, messageId } = validation.data;

    // Get MCP service
    const mcpService = getMCPService({
      serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp',
      clientName: 'mango-web',
      clientVersion: '0.1.0',
      headers: {
        Authorization: `Bearer ${process.env.MCP_SERVER_API_KEY || ''}`,
      },
    });

    // Ensure connected
    if (!mcpService.isConnected()) {
      await mcpService.connect();
    }

    // Create task record
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        conversation_id: conversationId ?? '',
        message_id: messageId ?? null,
        title: `Tool: ${toolName}`,
        description: `Invoking tool ${toolName}`,
        task_type: 'tool_call',
        status: 'running',
        agent_config: {
          tool_name: toolName,
          arguments: args,
        },
      })
      .select()
      .single();

    if (taskError) {
      console.error('Failed to create task:', taskError);
      return NextResponse.json({ error: 'Failed to create task record' }, { status: 500 });
    }

    // Invoke tool
    const result = await mcpService.invokeTool(toolName, args);

    // Update task with result
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        result: result.content as unknown as import('@/types/database.types').Json,
        error_message: result.error,
        metrics: {
          duration_ms: result.duration,
          tool_call_count: 1,
        } as unknown as import('@/types/database.types').Json,
        completed_at: new Date().toISOString(),
        tool_calls: [
          {
            tool_name: toolName,
            input: args,
            output: result.content,
            duration_ms: result.duration,
            success: result.success,
          },
        ] as unknown as import('@/types/database.types').Json,
      })
      .eq('id', task.id);

    if (updateError) {
      console.error('Failed to update task:', updateError);
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      action: 'tool.invoke',
      actor_id: user.id,
      actor_type: 'user',
      resource_type: 'tool',
      resource_id: task.id,
      details: {
        tool_name: toolName,
        success: result.success,
        duration_ms: result.duration,
      },
    });

    // Return result
    return NextResponse.json({
      success: result.success,
      taskId: task.id,
      content: result.content,
      error: result.error,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Tool invocation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tools/invoke
 * List available tools
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const enabled = searchParams.get('enabled') === 'true' ? true : undefined;

    // Get MCP service
    const mcpService = getMCPService({
      serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp',
      clientName: 'mango-web',
      clientVersion: '0.1.0',
      headers: {
        Authorization: `Bearer ${process.env.MCP_SERVER_API_KEY || ''}`,
      },
    });

    // Ensure connected
    if (!mcpService.isConnected()) {
      await mcpService.connect();
    }

    // List tools
    const tools = mcpService.listTools({ category, enabled });

    return NextResponse.json({
      tools,
      count: tools.length,
    });
  } catch (error) {
    console.error('Failed to list tools:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
