/**
 * Supabase Edge Function: Process Task
 * Handles background task execution
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskPayload {
  taskId: string;
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
    const supabaseKey =
      Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { taskId, userId } = (await req.json()) as TaskPayload;

    if (!taskId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing taskId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update task status to running
    await supabase
      .from('tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        metrics: {
          ...task.metrics,
          start_time: new Date().toISOString(),
        },
      })
      .eq('id', taskId);

    // Broadcast task status update
    await supabase.channel(`task:${taskId}`).send({
      type: 'broadcast',
      event: 'task_update',
      payload: {
        taskId,
        status: 'running',
        progress: 0,
      },
    });

    // Execute task based on type
    let result: any;
    let error: string | null = null;

    try {
      switch (task.task_type) {
        case 'tool_call':
          result = await executeToolCall(task, supabase);
          break;
        case 'analysis':
          result = await executeAnalysis(task, supabase);
          break;
        case 'generation':
          result = await executeGeneration(task, supabase);
          break;
        case 'search':
          result = await executeSearch(task, supabase);
          break;
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Task execution error:', err);
    }

    // Update task with result
    const endTime = new Date().toISOString();
    const startTime = task.metrics?.start_time || task.started_at;
    const duration = startTime ? new Date(endTime).getTime() - new Date(startTime).getTime() : 0;

    await supabase
      .from('tasks')
      .update({
        status: error ? 'failed' : 'completed',
        progress: 100,
        result: result || null,
        error_message: error,
        completed_at: endTime,
        metrics: {
          ...task.metrics,
          end_time: endTime,
          duration_ms: duration,
        },
      })
      .eq('id', taskId);

    // Broadcast completion
    await supabase.channel(`task:${taskId}`).send({
      type: 'broadcast',
      event: 'task_update',
      payload: {
        taskId,
        status: error ? 'failed' : 'completed',
        progress: 100,
        result,
        error,
      },
    });

    return new Response(
      JSON.stringify({
        success: !error,
        taskId,
        result,
        error,
        duration,
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
 * Execute tool call task
 */
async function executeToolCall(task: any, supabase: any): Promise<any> {
  const { tool_name, arguments: args } = task.agent_config || {};

  if (!tool_name) {
    throw new Error('Tool name not specified');
  }

  // Call MCP service
  const mcpServerUrl = Deno.env.get('MCP_SERVER_URL') || 'http://localhost:3001/mcp';
  const mcpApiKey = Deno.env.get('MCP_SERVER_API_KEY') || '';

  const response = await fetch(`${mcpServerUrl}/tools/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mcpApiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: tool_name,
        arguments: args || {},
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP server error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

/**
 * Execute analysis task
 */
async function executeAnalysis(task: any, supabase: any): Promise<any> {
  // Placeholder for analysis logic
  // This would integrate with AI models for analysis tasks
  return {
    type: 'analysis',
    summary: 'Analysis completed',
    details: {},
  };
}

/**
 * Execute generation task
 */
async function executeGeneration(task: any, supabase: any): Promise<any> {
  // Placeholder for generation logic
  // This would integrate with AI models for content generation
  return {
    type: 'generation',
    content: 'Generated content',
  };
}

/**
 * Execute search task
 */
async function executeSearch(task: any, supabase: any): Promise<any> {
  // Placeholder for search logic
  // This would integrate with search services
  return {
    type: 'search',
    results: [],
  };
}
