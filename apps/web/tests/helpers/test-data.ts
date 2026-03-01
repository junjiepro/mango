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

// ============ US4 Learning & Feedback Test Data ============

export interface FeedbackRecord {
  id: string
  user_id: string
  conversation_id?: string
  message_id?: string
  task_id?: string
  feedback_type: 'satisfaction' | 'accuracy' | 'usefulness' | 'safety'
  rating: 'positive' | 'negative' | 'neutral'
  comment?: string
  context?: Record<string, unknown>
  created_at: string
}

export interface LearningRecord {
  id: string
  user_id: string
  record_type: 'preference' | 'correction' | 'pattern' | 'skill'
  content: Record<string, unknown>
  confidence: number
  is_active: boolean
  applied_count: number
  created_at: string
  updated_at: string
}

export interface SkillSearchResult {
  id: string
  name: string
  description: string
  similarity: number
}

export function createMockFeedback(
  overrides?: Partial<FeedbackRecord>
): FeedbackRecord {
  const now = new Date().toISOString()
  return {
    id: 'feedback-123',
    user_id: 'user-123',
    conversation_id: 'conv-123',
    message_id: 'msg-123',
    feedback_type: 'satisfaction',
    rating: 'positive',
    comment: 'Great response!',
    context: {},
    created_at: now,
    ...overrides,
  }
}

export function createMockFeedbackList(count = 3): FeedbackRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFeedback({
      id: `feedback-${i + 1}`,
      rating: i % 2 === 0 ? 'positive' : 'negative',
      comment: `Feedback ${i + 1}`,
    })
  )
}

export function createMockLearningRecord(
  overrides?: Partial<LearningRecord>
): LearningRecord {
  const now = new Date().toISOString()
  return {
    id: 'learning-123',
    user_id: 'user-123',
    record_type: 'preference',
    content: { format: 'table', language: 'zh-CN' },
    confidence: 0.5,
    is_active: true,
    applied_count: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function createMockLearningRecordList(count = 3): LearningRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createMockLearningRecord({
      id: `learning-${i + 1}`,
      confidence: 0.5 + i * 0.1,
      record_type: i % 2 === 0 ? 'preference' : 'skill',
    })
  )
}

export function createMockSkillSearchResult(
  overrides?: Partial<SkillSearchResult>
): SkillSearchResult {
  return {
    id: 'skill-123',
    name: 'todo-manager',
    description: '待办事项管理工具',
    similarity: 0.85,
    ...overrides,
  }
}

export function createMockSkillSearchResults(count = 5): SkillSearchResult[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSkillSearchResult({
      id: `skill-${i + 1}`,
      name: `skill-${i + 1}`,
      description: `Skill description ${i + 1}`,
      similarity: 0.9 - i * 0.1,
    })
  )
}
