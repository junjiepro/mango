# 多模态流式消息功能实现文档

## 概述

本文档描述了支持多模态（文本、图片、文件等）的 Agent 流式消息功能实现。该功能基于 Vercel AI SDK，允许 Agent 处理多模态输入并以流式方式实时显示多模态输出。

## 核心特性

### 1. 多模态输入支持

- ✅ **文本消息**：标准文本输入
- ✅ **图片附件**：支持图片 URL 和本地图片
- ✅ **文件附件**：支持各种文件类型（如果模型支持）
- ✅ **混合内容**：文本 + 多个附件的组合

### 2. 多模态输出支持

- ✅ **流式文本**：逐字显示文本内容
- ✅ **生成图片**：某些模型（如 Google Gemini）可以生成图片
- ✅ **生成文件**：支持模型生成的其他文件类型
- ✅ **实时显示**：流式生成的文件实时显示

### 3. 流式传输机制

- ✅ **文本流**：通过 `message_chunk` 事件传输
- ✅ **文件流**：通过 `message_file` 事件传输
- ✅ **完成信号**：通过 `message_complete` 事件传输
- ✅ **数据持久化**：流式完成后保存到数据库

## 架构设计

### 数据流

```
用户发送消息（文本 + 附件）
    ↓
API 路由保存用户消息和附件
    ↓
触发 Edge Function
    ↓
Edge Function 构建多模态消息历史
    ↓
AI 模型处理多模态输入
    ↓
流式生成回复（文本 + 可能的文件）
    ↓
通过 Realtime Channel 发送：
  - message_chunk: 文本块
  - message_file: 生成的文件
    ↓
前端实时显示流式内容
    ↓
流式完成后保存完整消息到数据库
    ↓
前端通过 Database 订阅获取最终消息
```

## 实现细节

### 1. 后端实现（Edge Function）

#### 多模态输入处理

**文件**: `supabase/functions/process-agent-message/index.ts`

```typescript
// 构建消息历史，支持多模态内容
const messages = conversationHistory
  .filter((msg: any) => msg.sender_type === 'user' || msg.sender_type === 'agent')
  .map((msg: any) => {
    const role = msg.sender_type === 'user' ? 'user' : 'assistant';

    // 检查是否有附件（多模态内容）
    const hasAttachments = msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0;

    if (hasAttachments) {
      // 构建多模态内容数组
      const content: any[] = [
        { type: 'text', text: msg.content }
      ];

      // 添加附件（图片、文件等）
      for (const attachment of msg.attachments) {
        if (attachment.type?.startsWith('image/')) {
          // 图片附件
          content.push({
            type: 'image',
            image: attachment.url || attachment.publicUrl,
          });
        } else if (attachment.url || attachment.publicUrl) {
          // 其他文件类型
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
```

#### 多模态输出处理

```typescript
// 流式处理内容块（支持文本和多模态内容）
const generatedFiles: any[] = [];

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
```

### 2. 前端实现

#### 2.1 流式消息订阅 Hook（支持多模态）

**文件**: `apps/web/src/hooks/useStreamingMessage.ts`

**新增接口**:

```typescript
interface StreamingMessage {
  messageId: string
  content: string
  isStreaming: boolean
  isComplete: boolean
  files?: StreamingFile[]  // 新增：流式生成的文件
}

interface StreamingFile {
  type: string
  url: string
  mediaType: string
  filename: string
}

interface MessageFilePayload {
  messageId: string
  file: StreamingFile
}
```

**新增功能**:

```typescript
// 订阅文件生成事件（多模态）
channel.on('broadcast', { event: 'message_file' }, (payload) => {
  const data = payload.payload as MessageFilePayload
  logger.debug('Received generated file', {
    messageId: data.messageId,
    fileType: data.file.type,
    mediaType: data.file.mediaType,
  })

  addFileToStreamingMessage(data.messageId, data.file)
})
```

#### 2.2 MessageItem 组件（支持多模态显示）

**文件**: `apps/web/src/components/conversation/MessageItem.tsx`

**新增 Props**:

```typescript
interface MessageItemProps {
  // ... 其他 props
  streamingFiles?: StreamingFile[]  // 新增：流式生成的文件
}
```

**多模态内容合并**:

```typescript
// 转换流式文件为 FileUIPart 格式
const streamingAttachments: FileUIPart[] = streamingFiles.map((file) => ({
  type: 'file' as const,
  url: file.url,
  filename: file.filename,
  mediaType: file.mediaType,
}));

// 合并数据库附件和流式附件
const allAttachments = [...attachments, ...streamingAttachments];
```

## Channel 事件类型

### 1. message_chunk（文本块）

```typescript
{
  messageId: string
  chunk: string        // 当前文本块
  fullContent: string  // 累积的完整文本
  type: 'text'
}
```

### 2. message_file（文件生成）

```typescript
{
  messageId: string
  file: {
    type: string        // 'file' 或 'image'
    url: string         // 文件 URL
    mediaType: string   // MIME 类型
    filename: string    // 文件名
  }
}
```

### 3. message_complete（完成信号）

```typescript
{
  messageId: string
  fullContent: string
  tokenCount: number
  processingTime: number
  files?: Array<{      // 所有生成的文件
    type: string
    url: string
    mediaType: string
    filename: string
  }>
}
```

## 支持的模型和功能

### 文本生成（所有模型）

- ✅ OpenAI GPT-4/GPT-3.5
- ✅ Anthropic Claude
- ✅ Google Gemini
- ✅ Pollinations AI
- ✅ OpenRouter（多模型）

### 多模态输入（视觉理解）

- ✅ OpenAI GPT-4 Vision
- ✅ Anthropic Claude 3 (Opus/Sonnet/Haiku)
- ✅ Google Gemini Pro Vision
- ⚠️ 其他模型需要检查文档

### 多模态输出（图片生成）

- ✅ Google Gemini（可以生成图片）
- ⚠️ 大多数文本模型不支持图片生成
- 💡 可以通过工具调用集成 DALL-E、Midjourney 等

## 使用示例

### 1. 发送带图片的消息

```typescript
// 用户消息包含文本和图片
const message = {
  conversation_id: conversationId,
  sender_type: 'user',
  content: '这张图片里有什么？',
  attachments: [
    {
      type: 'image/png',
      url: 'https://example.com/image.png',
      name: 'photo.png',
    }
  ],
}
```

### 2. 接收流式文本和生成的图片

```typescript
// 前端自动处理流式内容
<MessageItem
  message={message}
  streamingContent={streamingContent}  // 流式文本
  streamingFiles={streamingFiles}      // 流式生成的文件
  isStreaming={isStreaming}
/>
```

## 测试指南

### 1. 测试多模态输入

#### 测试图片理解

1. 上传一张图片到对话
2. 发送消息："描述这张图片"
3. 验证 Agent 能正确理解图片内容

#### 测试多图片输入

1. 上传多张图片
2. 发送消息："比较这些图片的异同"
3. 验证 Agent 能处理多个图片

### 2. 测试多模态输出

#### 测试图片生成（需要支持的模型）

1. 发送消息："生成一张猫的图片"
2. 验证流式显示过程：
   - 文本逐字显示
   - 图片生成后实时显示
3. 验证完成后图片保存到数据库

### 3. 验证要点

#### 前端验证

- [ ] 文本流式显示正常
- [ ] 图片附件正确显示
- [ ] 流式生成的文件实时显示
- [ ] 多模态内容合并正确
- [ ] 刷新页面后内容仍然存在

#### 后端验证

- [ ] 多模态消息历史构建正确
- [ ] 图片 URL 正确传递给模型
- [ ] 生成的文件正确广播
- [ ] 完整消息正确保存到数据库
- [ ] 附件数组包含所有文件

## 性能优化

### 1. 图片处理

- 使用 CDN 加速图片加载
- 图片懒加载
- 缩略图预览

### 2. 流式传输

- 批量发送文本块（减少 Channel 调用）
- 文件生成后立即发送（不等待文本完成）
- 使用 WebP 格式减小图片大小

### 3. 内存管理

- 及时清理已完成的流式状态
- 限制同时显示的图片数量
- 使用虚拟滚动处理大量消息

## 故障排查

### 问题：图片不显示

**可能原因**:
1. 图片 URL 无效或过期
2. CORS 问题
3. 图片格式不支持

**解决方案**:
1. 检查图片 URL 是否可访问
2. 配置 Supabase Storage CORS
3. 使用支持的图片格式（PNG, JPG, WebP）

### 问题：模型不支持图片输入

**可能原因**:
1. 使用的模型不支持视觉理解
2. 图片格式不正确

**解决方案**:
1. 切换到支持视觉的模型（GPT-4 Vision, Claude 3, Gemini Pro Vision）
2. 确保图片是 base64 或 URL 格式

### 问题：生成的图片未保存

**可能原因**:
1. 模型响应格式解析错误
2. 数据库更新失败

**解决方案**:
1. 检查 Edge Function 日志
2. 验证 `finalResult.response.messages` 结构
3. 确认数据库更新语句执行成功

## 未来改进

### 1. 更多模态支持

- 🎵 **音频**：语音输入和输出
- 🎥 **视频**：视频理解和生成
- 📄 **文档**：PDF、Word 等文档理解

### 2. 高级功能

- 🔄 **实时编辑**：流式生成过程中编辑
- 🎨 **图片编辑**：对生成的图片进行编辑
- 📊 **数据可视化**：自动生成图表
- 🔗 **工具集成**：集成 DALL-E、Midjourney 等

### 3. 性能优化

- ⚡ **增量渲染**：只渲染变化的部分
- 💾 **智能缓存**：缓存常用图片
- 🗜️ **压缩传输**：压缩大文件传输

## 相关文件

### 后端
- `supabase/functions/process-agent-message/index.ts` - Edge Function（多模态支持）

### 前端
- `apps/web/src/hooks/useStreamingMessage.ts` - 流式消息订阅（多模态支持）
- `apps/web/src/components/conversation/MessageItem.tsx` - 消息项组件（多模态显示）
- `apps/web/src/components/conversation/MessageList.tsx` - 消息列表组件

## 参考资源

- [Vercel AI SDK - Multimodal Messages](https://sdk.vercel.ai/docs/foundations/prompts#multimodal-messages)
- [Vercel AI SDK - Streaming](https://sdk.vercel.ai/docs/foundations/streaming)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Anthropic Claude Vision](https://docs.anthropic.com/claude/docs/vision)
- [Google Gemini Multimodal](https://ai.google.dev/tutorials/multimodal)

## 总结

多模态流式消息功能通过以下方式实现：

1. **后端**：使用 Vercel AI SDK 的多模态消息格式，支持图片、文件等输入，并处理模型生成的多模态输出
2. **传输**：通过 Supabase Realtime Channel 的多个事件类型（text, file, complete）传输不同类型的内容
3. **前端**：订阅多个事件类型，实时显示文本和文件，并在完成后合并到数据库消息

该实现遵循了以下原则：

- **KISS**: 使用 Vercel AI SDK 的标准多模态格式
- **DRY**: 复用现有的流式传输机制
- **SRP**: 每个事件类型处理特定的内容
- **扩展性**: 易于添加新的模态类型
- **用户体验**: 实时显示提升交互体验
