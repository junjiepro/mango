# Agent 用户偏好迁移指南

本文档说明如何为现有用户安全地迁移Agent偏好设置。

## 概述

Agent系统集成需要为每个用户创建默认的偏好设置。此迁移脚本将：

1. 为所有现有的已验证用户创建默认的Agent偏好设置
2. 确保数据迁移的安全性和一致性
3. 提供回滚机制以防出现问题

## 准备工作

### 1. 环境变量配置

确保以下环境变量已设置：

```bash
# 必需
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key

# 可选
DRY_RUN=true          # 模拟运行，不实际执行（建议先使用）
LOG_LEVEL=info        # 日志级别 (debug|info|warn|error)
```

### 2. 数据库迁移

首先运行数据库迁移以创建`agent_preferences`表：

```bash
# 使用Supabase CLI
supabase db push

# 或者在Supabase Dashboard的SQL Editor中运行
# supabase/migrations/20241201000002_agent_preferences_table.sql
```

## 运行迁移

### 1. 模拟运行（推荐）

在实际执行前，建议先进行模拟运行：

```bash
DRY_RUN=true npm run migrate:user-preferences migrate
```

这将显示迁移计划但不会实际修改数据库。

### 2. 实际执行

确认模拟运行结果无误后，执行实际迁移：

```bash
npm run migrate:user-preferences migrate
```

### 3. 验证结果

脚本会自动验证迁移结果，包括：

- 检查所有用户是否都有偏好设置
- 统计总记录数
- 报告任何缺失的配置

## 迁移脚本功能

### 批量处理
- 每批处理100个用户，避免数据库负载过高
- 支持大量用户的安全迁移

### 错误处理
- 详细的日志记录
- 优雅地处理重复记录和并发冲突
- 统计迁移成功/失败情况

### 幂等性
- 脚本可以安全地多次运行
- 自动跳过已有偏好设置的用户
- 不会覆盖现有配置

## 默认偏好设置

脚本会为每个用户创建以下默认设置：

### 基本设置
- 模式：简洁模式
- 主题：系统默认
- 语言：中文

### 对话设置
- 自动保存：启用
- 历史限制：100条消息
- 时间戳：关闭
- 打字指示器：启用

### AI模型设置
- 模型：claude-3-sonnet
- 温度：0.7
- 最大令牌：4000
- 流式响应：启用
- 工具调用：启用
- 长期记忆：启用

### 界面偏好
- 侧边栏：展开
- 紧凑模式：关闭
- 代码预览：启用
- 动画效果：启用

### 隐私设置
- 分析数据收集：关闭
- 对话分享：关闭
- 个性化推荐：启用
- 数据保留期：365天

## 监控和排错

### 日志级别

```bash
# 详细调试信息
LOG_LEVEL=debug npm run migrate:user-preferences migrate

# 仅显示重要信息
LOG_LEVEL=warn npm run migrate:user-preferences migrate
```

### 常见问题

1. **权限错误**
   - 确保`SUPABASE_SERVICE_KEY`是service role密钥
   - 检查RLS策略是否正确配置

2. **表不存在**
   - 运行数据库迁移创建`agent_preferences`表

3. **并发冲突**
   - 脚本会自动处理，重新运行即可

4. **部分用户失败**
   - 检查日志中的错误信息
   - 可以安全地重新运行脚本处理剩余用户

## 回滚操作

⚠️ **警告**: 回滚将删除所有Agent偏好设置，请谨慎使用！

```bash
# 模拟回滚
DRY_RUN=true npm run migrate:user-preferences rollback

# 实际回滚（紧急情况使用）
npm run migrate:user-preferences rollback
```

## 生产环境建议

1. **备份数据**
   ```bash
   # 使用Supabase CLI导出数据
   supabase db dump --data-only > backup.sql
   ```

2. **维护窗口**
   - 在用户活动较少的时间执行
   - 预计每1000用户需要1-2分钟

3. **监控**
   - 监控数据库性能
   - 观察错误日志
   - 验证用户体验

4. **分步执行**
   ```bash
   # 可以通过修改BATCH_SIZE控制批次大小
   # 在脚本中设置更小的批次，如50或25
   ```

## 验证清单

迁移完成后，请验证：

- [ ] 所有活跃用户都有Agent偏好记录
- [ ] 偏好设置的默认值正确
- [ ] 用户可以正常访问Agent功能
- [ ] 设置页面可以正常加载和修改偏好
- [ ] RLS策略正常工作（用户只能访问自己的偏好）

## 技术细节

### 数据库表结构
```sql
agent_preferences (
    id uuid PRIMARY KEY,
    user_id uuid UNIQUE NOT NULL,
    mode text,
    theme text,
    language text,
    conversation_settings jsonb,
    ai_settings jsonb,
    ui_preferences jsonb,
    privacy_settings jsonb,
    advanced_settings jsonb,
    created_at timestamp,
    updated_at timestamp
)
```

### 安全特性
- Row Level Security (RLS) 保护用户数据
- 外键约束确保数据完整性
- Service role权限用于批量操作
- 审计日志记录所有操作