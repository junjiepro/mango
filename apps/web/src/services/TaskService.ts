/**
 * Task Service
 * T044: Create Task service
 */

import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorType } from '@mango/shared/utils'
import type { Database } from '@/types/database.types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

/**
 * TaskService 类
 * 处理任务的 CRUD 操作和状态管理
 */
export class TaskService {
  private supabase = createClient()

  /**
   * 创建任务
   */
  async createTask(data: {
    conversationId: string
    messageId?: string
    title: string
    description?: string
    taskType: string
    agentConfig?: Record<string, any>
  }): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const taskData: TaskInsert = {
      conversation_id: data.conversationId,
      message_id: data.messageId,
      user_id: user.id,
      title: data.title,
      description: data.description,
      task_type: data.taskType,
      status: 'pending',
      progress: 0,
      agent_config: data.agentConfig || {
        model: 'claude-3-5-sonnet',
        tools: [],
        max_iterations: 10,
      },
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to create task: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500,
        true,
        { originalError: error }
      )
    }

    return task
  }

  /**
   * 获取任务列表
   */
  async getTasks(options?: {
    conversationId?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ tasks: Task[]; total: number }> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const limit = options?.limit || 20
    const offset = options?.offset || 0

    let query = this.supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    if (options?.conversationId) {
      query = query.eq('conversation_id', options.conversationId)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data: tasks, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new AppError(
        `Failed to fetch tasks: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return {
      tasks: tasks || [],
      total: count || 0,
    }
  }

  /**
   * 获取单个任务
   */
  async getTask(taskId: string): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError(
          'Task not found',
          ErrorType.RESOURCE_NOT_FOUND,
          404
        )
      }
      throw new AppError(
        `Failed to fetch task: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled',
    progress?: number
  ): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const updates: TaskUpdate = {
      status,
      progress: progress !== undefined ? progress : undefined,
    }

    // 设置时间戳
    if (status === 'running' && !updates.started_at) {
      updates.started_at = new Date().toISOString()
    }
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
      if (status === 'completed') {
        updates.progress = 100
      }
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update task status: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId: string, progress: number): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update({ progress })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update task progress: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 更新任务结果
   */
  async updateTaskResult(
    taskId: string,
    result: Record<string, any>,
    toolCalls?: any[]
  ): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const updates: TaskUpdate = {
      result,
      tool_calls: toolCalls,
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to update task result: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 标记任务失败
   */
  async failTask(taskId: string, errorMessage: string): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to mark task as failed: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to cancel task: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return task
  }

  /**
   * 添加工具调用记录
   */
  async addToolCall(
    taskId: string,
    toolCall: {
      tool_name: string
      input: any
      output: any
      duration_ms: number
    }
  ): Promise<Task> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    // 获取当前任务
    const task = await this.getTask(taskId)

    // 添加新的工具调用
    const toolCalls = Array.isArray(task.tool_calls) ? task.tool_calls : []
    toolCalls.push(toolCall)

    const { data: updatedTask, error } = await this.supabase
      .from('tasks')
      .update({ tool_calls: toolCalls })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to add tool call: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return updatedTask
  }

  /**
   * 获取运行中的任务
   */
  async getRunningTasks(): Promise<Task[]> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401)
    }

    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'queued', 'running'])
      .order('created_at', { ascending: false })

    if (error) {
      throw new AppError(
        `Failed to fetch running tasks: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return tasks || []
  }
}

/**
 * 导出单例实例
 */
export const taskService = new TaskService()
