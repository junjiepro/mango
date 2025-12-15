/**
 * Test Data Factory
 * 生成测试数据的工厂函数
 */

import type { Database } from '@/types/database.types'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

export function createMockConversation(
  overrides?: Partial<Conversation>
): Conversation {
  const now = new Date().toISOString()
  return {
    id: 'conv-123',
    user_id: 'user-123',
    title: 'Test Conversation',
    description: 'A test conversation',
    context: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      max_tokens: 4096,
      system_prompt: null,
    },
    status: 'active',
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function createMockMessage(overrides?: Partial<Message>): Message {
  const now = new Date().toISOString()
  return {
    id: 'msg-123',
    conversation_id: 'conv-123',
    sender_type: 'user',
    sender_id: 'user-123',
    content: 'Test message content',
    content_type: 'text/plain',
    sequence_number: 1,
    reply_to_message_id: null,
    agent_metadata: null,
    status: 'sent',
    edited_at: null,
    deleted_at: null,
    created_at: now,
    ...overrides,
  }
}

export function createMockTask(overrides?: Partial<Task>): Task {
  const now = new Date().toISOString()
  return {
    id: 'task-123',
    conversation_id: 'conv-123',
    message_id: 'msg-123',
    user_id: 'user-123',
    title: 'Test Task',
    description: 'A test task',
    task_type: 'general',
    status: 'pending',
    progress: 0,
    agent_config: {
      model: 'claude-3-5-sonnet',
      tools: [],
      max_iterations: 10,
    },
    result: null,
    error_message: null,
    tool_calls: null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function createMockConversationList(count = 3): Conversation[] {
  return Array.from({ length: count }, (_, i) =>
    createMockConversation({
      id: `conv-${i + 1}`,
      title: `Conversation ${i + 1}`,
    })
  )
}

export function createMockMessageList(count = 5): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `msg-${i + 1}`,
      sequence_number: i + 1,
      content: `Message ${i + 1}`,
    })
  )
}

export function createMockTaskList(count = 3): Task[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTask({
      id: `task-${i + 1}`,
      title: `Task ${i + 1}`,
    })
  )
}
