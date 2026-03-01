# process-agent-message 重构计划

**当前状态**: 单文件 1713 行,逻辑混杂
**目标**: 模块化、可维护、易扩展

## 📋 重构策略

### 1. 文件结构规划

```
supabase/functions/process-agent-message/
├── index.ts                 # 主入口 (简化到 ~100 行)
├── types.ts                 # 类型定义
├── config.ts                # 配置和常量
├── lib/
│   ├── supabase.ts         # Supabase 客户端工具
│   ├── message.ts          # 消息处理逻辑
│   ├── history.ts          # 对话历史管理
│   └── realtime.ts         # Realtime 通道管理
├── tools/
│   ├── registry.ts         # 工具注册表
│   ├── mcp.ts              # MCP 工具集成
│   ├── miniapp.ts          # 小应用工具
│   └── device.ts           # 设备工具
├── agent/
│   ├── stream.ts           # 流式响应处理
│   ├── system-prompt.ts    # 系统提示词
│   └── context.ts          # 上下文构建
└── utils/
    ├── error.ts            # 错误处理
    └── logger.ts           # 日志工具
```

### 2. 模块职责划分

**index.ts** (主入口)
- HTTP 请求处理
- 参数验证
- 错误处理
- 响应返回

**lib/message.ts**
- 创建消息
- 更新消息状态
- 消息序列号管理

**lib/history.ts**
- 获取对话历史
- 格式化历史消息
- 上下文窗口管理

**tools/registry.ts**
- 工具注册
- 工具发现
- 工具调用路由

**agent/stream.ts**
- 流式响应处理
- Realtime 推送
- 状态更新

### 3. 重构步骤

**Phase 1: 提取类型和配置**
- [ ] 创建 types.ts
- [ ] 创建 config.ts
- [ ] 更新 index.ts 引用

**Phase 2: 提取工具模块**
- [ ] 创建 tools/registry.ts
- [ ] 创建 tools/mcp.ts
- [ ] 创建 tools/miniapp.ts
- [ ] 创建 tools/device.ts

**Phase 3: 提取消息处理**
- [ ] 创建 lib/message.ts
- [ ] 创建 lib/history.ts
- [ ] 创建 lib/realtime.ts

**Phase 4: 提取 Agent 逻辑**
- [ ] 创建 agent/stream.ts
- [ ] 创建 agent/system-prompt.ts
- [ ] 创建 agent/context.ts

**Phase 5: 提取工具函数**
- [ ] 创建 utils/error.ts
- [ ] 创建 utils/logger.ts

**Phase 6: 重构主入口**
- [ ] 简化 index.ts
- [ ] 测试验证

## 🎯 预期效果

- ✅ 主文件减少到 ~100 行
- ✅ 每个模块职责单一
- ✅ 易于测试和维护
- ✅ 便于添加新功能 (如 A2UI)

## 📝 注意事项

1. 保持向后兼容
2. 逐步重构,每步验证
3. 保留原有功能
4. 添加必要的注释
