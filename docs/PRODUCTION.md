# 生产环境变量配置指南

# ===========================================
# 生产环境配置 (.env.production)
# ===========================================

# Supabase 生产环境配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# 生产站点 URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# 生产环境设置
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# ===========================================
# 部署平台配置指南
# ===========================================

## Vercel 部署配置

# 1. 在 Vercel Dashboard 中设置环境变量：
#    Project Settings > Environment Variables

# 生产环境变量 (Production):
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
# NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# 预览环境变量 (Preview):
# NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
# NEXT_PUBLIC_SITE_URL=https://your-branch-preview.vercel.app

# 开发环境变量 (Development):
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

## Netlify 部署配置

# 在 Netlify Dashboard 中设置：
# Site settings > Environment variables

# 生产环境变量：
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
# NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app

## Railway 部署配置

# 在 Railway Dashboard 中设置：
# Project > Variables

# NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
# NEXT_PUBLIC_SITE_URL=https://your-app.railway.app
# PORT=3000

## Docker 部署配置

# docker-compose.yml 中的环境变量：
# environment:
#   - NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
#   - NEXT_PUBLIC_SITE_URL=https://yourdomain.com
#   - NODE_ENV=production

# 或使用 .env.production 文件：
# docker run --env-file .env.production your-app

# ===========================================
# Supabase 生产环境配置
# ===========================================

## 1. 创建生产环境项目

# 1. 在 Supabase Dashboard 创建新项目
# 2. 记录项目 URL 和 anon key
# 3. 配置认证设置：
#    - Site URL: https://yourdomain.com
#    - Redirect URLs: https://yourdomain.com/auth/callback

## 2. 数据库配置

# 1. 运行生产环境迁移：
#    npx supabase db push --linked
# 2. 设置 RLS 策略
# 3. 配置数据库备份

## 3. 邮箱配置

# 1. 配置自定义 SMTP（可选）
# 2. 更新邮箱模板中的链接：
#    - 确认邮箱: https://yourdomain.com/auth/confirm
#    - 重置密码: https://yourdomain.com/auth/reset

## 4. 安全配置

# 1. 启用 RLS (Row Level Security)
# 2. 配置 API 速率限制
# 3. 设置适当的 CORS 策略
# 4. 启用数据库审计日志

# ===========================================
# 环境变量安全最佳实践
# ===========================================

## 1. 密钥管理

# ✅ 使用环境变量存储敏感信息
# ✅ 定期轮换 API 密钥
# ✅ 为不同环境使用不同的密钥
# ✅ 监控 API 密钥使用情况

# ❌ 永远不要在代码中硬编码密钥
# ❌ 不要在客户端暴露敏感密钥
# ❌ 不要将 .env 文件提交到版本控制

## 2. 环境隔离

# 开发环境: 本地 Supabase 或专用开发项目
# 暂存环境: 独立的暂存 Supabase 项目
# 生产环境: 独立的生产 Supabase 项目

## 3. 访问控制

# 1. 限制 Supabase 项目访问权限
# 2. 使用团队管理功能分配权限
# 3. 启用双因素认证
# 4. 定期审查访问权限

# ===========================================
# 部署前检查清单
# ===========================================

## 环境变量检查
# □ 所有必需的环境变量已设置
# □ 环境变量值正确且有效
# □ 生产环境使用正确的 Supabase 项目
# □ 站点 URL 与实际域名匹配

## Supabase 配置检查
# □ 认证设置正确配置
# □ 邮箱模板已更新
# □ RLS 策略已启用
# □ 数据库迁移已运行

## 安全检查
# □ 所有敏感信息已从代码中移除
# □ HTTPS 已启用
# □ CORS 策略已配置
# □ 错误页面不暴露敏感信息

## 功能测试
# □ 用户注册流程正常
# □ 邮箱验证功能正常
# □ 登录/登出功能正常
# □ 密码重置功能正常
# □ 路由保护正常工作

# ===========================================
# 监控和维护
# ===========================================

## 1. 应用监控

# 推荐工具：
# - Sentry (错误跟踪)
# - LogRocket (用户会话记录)
# - Vercel Analytics (性能监控)

## 2. Supabase 监控

# 在 Supabase Dashboard 监控：
# - API 使用情况
# - 数据库性能
# - 认证成功率
# - 错误日志

## 3. 定期维护

# □ 检查并更新依赖
# □ 监控安全漏洞
# □ 备份数据库
# □ 审查访问日志
# □ 更新文档

# ===========================================
# 故障排除
# ===========================================

## 常见生产环境问题

# 1. CORS 错误
# 解决方案: 检查 Supabase 项目 CORS 设置

# 2. 认证重定向失败
# 解决方案: 验证 Site URL 和 Redirect URLs 配置

# 3. 邮箱验证不工作
# 解决方案: 检查邮箱模板中的 URL 链接

# 4. 环境变量未生效
# 解决方案: 重启应用，清除构建缓存

## 调试技巧

# 1. 启用详细日志记录
# 2. 使用环境变量验证工具
# 3. 检查网络请求和响应
# 4. 监控 Supabase 项目日志

# ===========================================
# 联系支持
# ===========================================

# 如果遇到问题：
# 1. 查看项目文档: docs/
# 2. 检查 Supabase 状态页面
# 3. 提交 GitHub Issue
# 4. 联系技术支持