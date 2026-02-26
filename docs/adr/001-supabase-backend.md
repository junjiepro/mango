# ADR-001: 使用 Supabase 作为后端基础设施

## 状态
已采纳

## 背景
需要选择后端基础设施方案，要求支持 PostgreSQL、实时通信、认证、文件存储。

## 决策
采用 Supabase 一体化方案，替代自建 PostgreSQL + WebSocket + Auth 服务。

## 理由
- 内置 RLS 行级安全策略，减少后端鉴权代码
- Realtime 订阅开箱即用
- Edge Functions 支持服务端逻辑
- 托管服务降低运维成本

## 后果
- 依赖 Supabase 平台可用性
- RLS 策略需仔细设计和测试
- Edge Functions 冷启动延迟需关注
