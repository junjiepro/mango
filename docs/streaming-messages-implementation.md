# Agent 流式消息功能实现文档

## 概述

本文档描述了 Agent 流式消息功能的实现，该功能允许 Agent 的回复以流式方式实时显示，提升用户体验。

## 架构设计

### 核心原理

1. **流式发送**：Agent 通过 Supabase Realtime Channel 发送消息块
2. **完整保存**：流式结束后，完整消息保存到数据库
3. **双重订阅**：前端同时订阅 Channel（流式块）和 Database（完整消息）

### 数据流

```
用户发送消息
    ↓
API 路由保存用户消息
    ↓
触发 Edge Function
    ↓
Edge Function 创建占位消息（status: 'sending'）
    ↓
AI 模型流式生成回复
    ↓
通过 Realtime Channel 发送消息块 → 前端实时显示
    ↓
流式完成后保存完整消息到数据库
    ↓
前端通过 Database 订阅获取最终消息
```

## 实现细节

### 1. 后端实现（Edge Function）

**文件**: `supabase/functions/process-agent-message/index.ts`

#### 关键功能

- 使用 Vercel AI SDK 的 `streamText` 进行流式生成
- 通过 Supabase Realtime Channel 广播消息块
- 流式完成后更新数据库中的完整消息

#### Channel 命名规范

```typescript
const channelName = `conversation:${conversationId}:streaming`
```

#### 事件类型

1. **message_chunk**: 消息块事件
   ```typescript
   {
     messageId: string
     chunk: string        // 当前块内容
     fullContent: string  // 累积的完整内容
   }
   ```

2. **message_complete**: 消息完成事件
   ```typescript
   {
     messageId: string
     fullContent: string
     tokenCount: number
     processingTime: number
   }
   ```

### 2. 前端实现

#### 2.1 流式消息订阅 Hook

**文件**: `apps/web/src/hooks/useStreamingMessage.ts`

**功能**:
- 订阅特定对话的流式消息 Channel
- 管理流式消息状态（内容、是否流式中、是否完成）
- 自动清理已完成的流式消息

**使用方式**:
```typescript
const { streamingMessages, getStreamingMessage } = useStreamingMessage(conversationId)
```

#### 2.2 数据库消息订阅 Hook

**文件**: `apps/web/src/hooks/useRealtimeMessages.ts`

**功能**:
- 订阅数据库消息表的变化（INSERT, UPDATE, DELETE）
- 处理消息的插入、更新和删除事件

**使用方式**:
```typescript
useRealtimeMessages({
  conversationId,
  onInsert: handleMessageInsert,
  onUpdate: handleMessageUpdate,
  onDelete: handleMessageDelete,
})
```

#### 2.3 MessageList 组件更新

**文件**: `apps/web/src/components/conversation/MessageList.tsx`

**新增功能**:
- 整合流式消息和数据库消息
- 本地消息状态管理
- 自动合并流式内容和数据库消息

**Props 变化**:
```typescript
interface MessageListProps {
  conversationId: string | null  // 新增：用于订阅
  messages: Message[]
  // ... 其他 props
}
```

#### 2.4 MessageItem 组件更新

**文件**: `apps/web/src/components/conversation/MessageItem.tsx`

**新增功能**:
- 支持显示流式内容
- 显示流式状态指示器

**Props 变化**:
```typescript
interface MessageItemProps {
  message: MessageType
  streamingContent?: string  // 新增：流式内容
  isStreaming?: boolean      // 新增：是否正在流式
  // ... 其他 props
}
```

## 使用示例

### 在页面中使用

```typescript
import { MessageList } from '@/components/conversation/MessageList'

function ConversationPage() {
  const { currentConversation, messages } = useConversation()

  return (
    <MessageList
      conversationId={currentConversation.id}
      messages={messages}
      isLoading={isLoadingMessages}
      hasMore={hasMoreMessages}
      onLoadMore={loadMoreMessages}
    />
  )
}
```

## 测试指南

### 1. 本地开发测试

#### 启动服务

```bash
# 启动 Supabase 本地服务
cd supabase
supabase start

# 启动 Next.js 开发服务器
cd apps/web
npm run dev
```

#### 测试流程

1. 登录应用
2. 创建或打开一个对话
3. 发送一条消息
4. 观察 Agent 回复是否以流式方式显示
5. 检查消息完成后是否正确保存到数据库

### 2. 验证要点

#### 前端验证

- [ ] 消息块实时显示（逐字显示效果）
- [ ] 显示"生成中..."状态指示器
- [ ] 流式完成后状态指示器消失
- [ ] 完整消息正确保存并显示
- [ ] 刷新页面后消息仍然存在

#### 后端验证

- [ ] Edge Function 成功创建占位消息
- [ ] Channel 成功建立连接
- [ ] 消息块正确广播
- [ ] 完整消息正确更新到数据库
- [ ] Agent 元数据（tokens, 处理时间）正确保存

### 3. 调试技巧

#### 查看 Channel 连接状态

在浏览器控制台中：
```javascript
// 查看 Supabase Realtime 连接状态
console.log(supabase.getChannels())
```

#### 查看流式消息日志

在组件中添加日志：
```typescript
useEffect(() => {
  console.log('Streaming messages:', streamingMessages)
}, [streamingMessages])
```

#### 查看 Edge Function 日志

```bash
# 查看 Supabase Edge Function 日志
supabase functions logs process-agent-message
```

## 性能优化

### 1. Channel 管理

- 使用统一的 Channel 名称避免重复订阅
- 组件卸载时自动清理 Channel
- 流式完成后及时移除 Channel

### 2. 状态管理

- 使用 Map 数据结构管理流式消息（O(1) 查找）
- 流式完成 3 秒后自动清理状态
- 避免不必要的重新渲染

### 3. 消息合并

- 本地状态管理避免频繁数据库查询
- 智能合并流式内容和数据库消息
- 按序列号排序确保消息顺序正确

## 故障排查

### 问题：流式消息不显示

**可能原因**:
1. Channel 名称不匹配
2. Realtime 未启用
3. 网络连接问题

**解决方案**:
1. 检查前后端 Channel 名称是否一致
2. 确认 `supabase/migrations/20250124000016_enable_realtime.sql` 已执行
3. 检查浏览器网络面板的 WebSocket 连接

### 问题：消息重复显示

**可能原因**:
1. 同时显示流式内容和数据库消息
2. 消息去重逻辑失效

**解决方案**:
1. 确保 MessageItem 优先使用 streamingContent
2. 检查消息插入时的去重逻辑

### 问题：流式中断

**可能原因**:
1. AI 模型 API 错误
2. Channel 连接断开
3. Edge Function 超时

**解决方案**:
1. 检查 AI 模型 API 配置和密钥
2. 增加错误处理和重试机制
3. 优化 Edge Function 性能

## 未来改进

1. **断点续传**: 支持流式中断后继续
2. **多模态流式**: 支持图片、文件等多模态内容的流式传输
3. **流式控制**: 支持暂停、继续、取消流式
4. **性能监控**: 添加流式性能指标监控
5. **离线支持**: 支持离线时缓存流式消息

## 相关文件

### 后端
- `supabase/functions/process-agent-message/index.ts` - Edge Function 主文件
- `supabase/migrations/20250124000016_enable_realtime.sql` - Realtime 配置

### 前端
- `apps/web/src/hooks/useStreamingMessage.ts` - 流式消息订阅 Hook
- `apps/web/src/hooks/useRealtimeMessages.ts` - 数据库消息订阅 Hook
- `apps/web/src/components/conversation/MessageList.tsx` - 消息列表组件
- `apps/web/src/components/conversation/MessageItem.tsx` - 消息项组件
- `apps/web/src/app/conversations/[id]/page.tsx` - 对话详情页面

## 总结

Agent 流式消息功能通过 Supabase Realtime Channel 和数据库的双重订阅机制，实现了实时流式显示和可靠的消息持久化。该实现遵循了以下原则：

1. **KISS**: 使用简单直接的 Channel 广播机制
2. **DRY**: 复用 Supabase Realtime 基础设施
3. **SRP**: 每个 Hook 和组件职责单一明确
4. **可靠性**: 流式失败时自动降级到完整消息
5. **用户体验**: 实时反馈提升交互体验
