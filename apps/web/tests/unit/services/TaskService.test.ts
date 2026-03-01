/**
 * TaskService Unit Tests
 * 测试任务服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from '@/services/TaskService'
import { AppError, ErrorType } from '@mango/shared/utils'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
  mockNotFoundError,
  mockSuccessResponse,
} from '../../helpers/supabase-mock'
import { createMockTask, createMockTaskList } from '../../helpers/test-data'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

describe('TaskService', () => {
  let service: TaskService
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(mockSupabase)
    service = new TaskService()
    vi.clearAllMocks()
  })

  describe('createTask', () => {
    it('应该成功创建任务', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockTask)
      )

      const result = await service.createTask({
        conversationId: 'conv-123',
        title: 'Test Task',
        taskType: 'general',
      })

      expect(result).toEqual(mockTask)
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          task_type: 'general',
          status: 'pending',
          progress: 0,
        })
      )
    })

    it('应该使用默认 agent_config', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockTask)
      )

      await service.createTask({
        conversationId: 'conv-123',
        title: 'Test',
        taskType: 'general',
      })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_config: expect.objectContaining({
            model: 'claude-3-5-sonnet',
            tools: [],
            max_iterations: 10,
          }),
        })
      )
    })

    it('应该支持自定义 agent_config', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockTask)
      )

      await service.createTask({
        conversationId: 'conv-123',
        title: 'Test',
        taskType: 'general',
        agentConfig: {
          model: 'claude-opus-4',
          tools: ['web-search'],
          max_iterations: 20,
        },
      })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_config: {
            model: 'claude-opus-4',
            tools: ['web-search'],
            max_iterations: 20,
          },
        })
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.createTask({
          conversationId: 'conv-123',
          title: 'Test',
          taskType: 'general',
        })
      ).rejects.toThrow(AppError)

      await expect(
        service.createTask({
          conversationId: 'conv-123',
          title: 'Test',
          taskType: 'general',
        })
      ).rejects.toMatchObject({
        type: ErrorType.AUTH_UNAUTHORIZED,
        statusCode: 401,
      })
    })

    it('应该在数据库错误时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockDatabaseError('Insert failed')
      )

      await expect(
        service.createTask({
          conversationId: 'conv-123',
          title: 'Test',
          taskType: 'general',
        })
      ).rejects.toThrow(AppError)
    })
  })

  describe('getTasks', () => {
    it('应该成功获取任务列表', async () => {
      const mockTasks = createMockTaskList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: mockTasks,
        count: 3,
        error: null,
      })

      const result = await service.getTasks()

      expect(result.tasks).toEqual(mockTasks)
      expect(result.total).toBe(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
    })

    it('应该支持按对话 ID 筛选', async () => {
      const mockTasks = createMockTaskList(2)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: mockTasks,
        count: 2,
        error: null,
      })

      await service.getTasks({ conversationId: 'conv-123' })

      expect(mockSupabase.from().eq).toHaveBeenCalledWith(
        'conversation_id',
        'conv-123'
      )
    })

    it('应该支持按状态筛选', async () => {
      const mockTasks = createMockTaskList(1)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: mockTasks,
        count: 1,
        error: null,
      })

      await service.getTasks({ status: 'running' })

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'running')
    })

    it('应该支持分页参数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      })

      await service.getTasks({ limit: 10, offset: 20 })

      expect(mockSupabase.from().range).toHaveBeenCalledWith(20, 29)
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(service.getTasks()).rejects.toThrow(AppError)
    })
  })

  describe('getTask', () => {
    it('应该成功获取单个任务', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValue(
        mockSuccessResponse(mockTask)
      )

      const result = await service.getTask('task-123')

      expect(result).toEqual(mockTask)
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'task-123')
    })

    it('应该在任务不存在时抛出 404 错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValue(
        mockNotFoundError()
      )

      await expect(service.getTask('non-existent')).rejects.toThrow(AppError)

      await expect(service.getTask('non-existent')).rejects.toMatchObject({
        type: ErrorType.RESOURCE_NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('updateTaskStatus', () => {
    it('应该成功更新任务状态', async () => {
      const updatedTask = createMockTask({ status: 'running', progress: 50 })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedTask))

      const result = await service.updateTaskStatus('task-123', 'running', 50)

      expect(result.status).toBe('running')
      expect(result.progress).toBe(50)
    })

    it('应该在状态变为 running 时设置 started_at', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockTask))

      await service.updateTaskStatus('task-123', 'running')

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          started_at: expect.any(String),
        })
      )
    })

    it('应该在状态变为 completed 时设置 completed_at 和 progress 100', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockTask))

      await service.updateTaskStatus('task-123', 'completed')

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
          completed_at: expect.any(String),
        })
      )
    })

    it('应该在状态变为 failed 时设置 completed_at', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockTask))

      await service.updateTaskStatus('task-123', 'failed')

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          completed_at: expect.any(String),
        })
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.updateTaskStatus('task-123', 'running')
      ).rejects.toThrow(AppError)
    })
  })

  describe('updateTaskProgress', () => {
    it('应该成功更新任务进度', async () => {
      const updatedTask = createMockTask({ progress: 75 })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedTask))

      const result = await service.updateTaskProgress('task-123', 75)

      expect(result.progress).toBe(75)
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ progress: 75 })
    })
  })

  describe('updateTaskResult', () => {
    it('应该成功更新任务结果', async () => {
      const result = { output: 'Task completed successfully' }
      const toolCalls = [{ tool: 'web-search', input: 'query' }]
      const updatedTask = createMockTask({
        status: 'completed',
        progress: 100,
        result,
        tool_calls: toolCalls,
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedTask))

      const taskResult = await service.updateTaskResult(
        'task-123',
        result,
        toolCalls
      )

      expect(taskResult.result).toEqual(result)
      expect(taskResult.tool_calls).toEqual(toolCalls)
      expect(taskResult.status).toBe('completed')
      expect(taskResult.progress).toBe(100)
    })

    it('应该自动设置 completed_at', async () => {
      const mockTask = createMockTask()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockTask))

      await service.updateTaskResult('task-123', { output: 'done' })

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed_at: expect.any(String),
        })
      )
    })
  })

  describe('failTask', () => {
    it('应该标记任务为失败', async () => {
      const failedTask = createMockTask({
        status: 'failed',
        error_message: 'Task execution failed',
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(failedTask))

      const result = await service.failTask('task-123', 'Task execution failed')

      expect(result.status).toBe('failed')
      expect(result.error_message).toBe('Task execution failed')
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Task execution failed',
          completed_at: expect.any(String),
        })
      )
    })
  })

  describe('cancelTask', () => {
    it('应该取消任务', async () => {
      const cancelledTask = createMockTask({ status: 'cancelled' })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(cancelledTask))

      const result = await service.cancelTask('task-123')

      expect(result.status).toBe('cancelled')
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          completed_at: expect.any(String),
        })
      )
    })
  })

  describe('addToolCall', () => {
    it('应该添加工具调用记录', async () => {
      const existingTask = createMockTask({ tool_calls: [] })
      const toolCall = {
        tool_name: 'web-search',
        input: { query: 'test' },
        output: { results: [] },
        duration_ms: 1500,
      }
      const updatedTask = createMockTask({
        tool_calls: [toolCall],
      })

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce(
        mockSuccessResponse(existingTask)
      )
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedTask))

      const result = await service.addToolCall('task-123', toolCall)

      expect(result.tool_calls).toHaveLength(1)
      expect(result.tool_calls[0]).toEqual(toolCall)
    })

    it('应该追加到现有工具调用列表', async () => {
      const existingToolCall = {
        tool_name: 'calculator',
        input: { expression: '1+1' },
        output: { result: 2 },
        duration_ms: 100,
      }
      const existingTask = createMockTask({ tool_calls: [existingToolCall] })
      const newToolCall = {
        tool_name: 'web-search',
        input: { query: 'test' },
        output: { results: [] },
        duration_ms: 1500,
      }
      const updatedTask = createMockTask({
        tool_calls: [existingToolCall, newToolCall],
      })

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce(
        mockSuccessResponse(existingTask)
      )
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedTask))

      const result = await service.addToolCall('task-123', newToolCall)

      expect(result.tool_calls).toHaveLength(2)
      expect(result.tool_calls[1]).toEqual(newToolCall)
    })
  })

  describe('getRunningTasks', () => {
    it('应该获取所有运行中的任务', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1', status: 'pending' }),
        createMockTask({ id: 'task-2', status: 'queued' }),
        createMockTask({ id: 'task-3', status: 'running' }),
      ]
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .order.mockResolvedValue(mockSuccessResponse(mockTasks))

      const result = await service.getRunningTasks()

      expect(result).toEqual(mockTasks)
      expect(mockSupabase.from().in).toHaveBeenCalledWith('status', [
        'pending',
        'queued',
        'running',
      ])
    })

    it('应该按创建时间倒序排列', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .order.mockResolvedValue(mockSuccessResponse([]))

      await service.getRunningTasks()

      expect(mockSupabase.from().order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      })
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(service.getRunningTasks()).rejects.toThrow(AppError)
    })
  })
})
