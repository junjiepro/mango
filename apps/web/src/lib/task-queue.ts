/**
 * Task Queue Management
 * Handles task submission and queue management using PostgreSQL
 */

import { createClient } from '@/lib/supabase/server';

export interface CreateTaskOptions {
  userId: string;
  conversationId?: string;
  messageId?: string;
  title: string;
  description?: string;
  taskType: 'analysis' | 'generation' | 'search' | 'tool_call';
  agentConfig?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TaskQueueResult {
  taskId: string;
  status: 'pending' | 'queued';
}

/**
 * Create a new task and add it to the queue
 */
export async function createTask(options: CreateTaskOptions): Promise<TaskQueueResult> {
  const supabase = createClient();

  // Create task record
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: options.userId,
      conversation_id: options.conversationId,
      message_id: options.messageId,
      title: options.title,
      description: options.description,
      task_type: options.taskType,
      status: 'pending',
      progress: 0,
      agent_config: options.agentConfig || {},
      metadata: options.metadata || {},
    })
    .select()
    .single();

  if (taskError) {
    throw new Error(`Failed to create task: ${taskError.message}`);
  }

  // Trigger background processing
  try {
    await triggerTaskProcessing(task.id, options.userId);

    // Update status to queued
    await supabase
      .from('tasks')
      .update({ status: 'queued' })
      .eq('id', task.id);

    return {
      taskId: task.id,
      status: 'queued',
    };
  } catch (error) {
    console.error('Failed to trigger task processing:', error);

    // Task remains in pending state, can be picked up by scheduler
    return {
      taskId: task.id,
      status: 'pending',
    };
  }
}

/**
 * Trigger task processing via Edge Function
 */
async function triggerTaskProcessing(taskId: string, userId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/process-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      taskId,
      userId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge function error: ${error}`);
  }
}

/**
 * Get task status
 */
export async function getTaskStatus(taskId: string) {
  const supabase = createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, status, progress, result, error_message, completed_at')
    .eq('id', taskId)
    .single();

  if (error) {
    throw new Error(`Failed to get task status: ${error.message}`);
  }

  return task;
}

/**
 * Cancel a task
 */
export async function cancelTask(taskId: string, userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', taskId)
    .eq('user_id', userId)
    .in('status', ['pending', 'queued', 'running']);

  if (error) {
    throw new Error(`Failed to cancel task: ${error.message}`);
  }
}

/**
 * Get user's tasks
 */
export async function getUserTasks(
  userId: string,
  options?: {
    conversationId?: string;
    status?: string[];
    limit?: number;
    offset?: number;
  }
) {
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.conversationId) {
    query = query.eq('conversation_id', options.conversationId);
  }

  if (options?.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: tasks, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get tasks: ${error.message}`);
  }

  return {
    tasks: tasks || [],
    count: count || 0,
  };
}

/**
 * Retry a failed task
 */
export async function retryTask(taskId: string, userId: string): Promise<TaskQueueResult> {
  const supabase = createClient();

  // Get original task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !task) {
    throw new Error('Task not found');
  }

  if (task.status !== 'failed') {
    throw new Error('Only failed tasks can be retried');
  }

  // Reset task status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'pending',
      progress: 0,
      result: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', taskId);

  if (updateError) {
    throw new Error(`Failed to reset task: ${updateError.message}`);
  }

  // Trigger processing
  try {
    await triggerTaskProcessing(taskId, userId);

    await supabase
      .from('tasks')
      .update({ status: 'queued' })
      .eq('id', taskId);

    return {
      taskId,
      status: 'queued',
    };
  } catch (error) {
    console.error('Failed to trigger task processing:', error);

    return {
      taskId,
      status: 'pending',
    };
  }
}

/**
 * Clean up old completed tasks
 */
export async function cleanupOldTasks(
  userId: string,
  olderThanDays: number = 30
): Promise<number> {
  const supabase = createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .in('status', ['completed', 'failed', 'cancelled'])
    .lt('completed_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    throw new Error(`Failed to cleanup tasks: ${error.message}`);
  }

  return data?.length || 0;
}
