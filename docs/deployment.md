# 部署指南

## 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Supabase CLI (`npm install -g supabase`)
- Supabase 生产项目
- Vercel 账号（已关联 GitHub 仓库）
- npm 账号（用于 CLI 发布）

## 部署架构

```
方式一：GitHub Actions 自动部署（推荐）
  推送到 main → CI 通过 → deploy.yml 自动触发
    → 数据库迁移 → Edge Functions + Vercel + CLI npm publish（并行）→ 验证

方式二：本地一键部署
  pnpm deploy:all
    → 前置检查 → 数据库迁移 → Edge Functions → CLI 发布 → 完成提示
```

---

## 1. GitHub Actions 自动部署

### 工作流说明

CI 通过后，`.github/workflows/deploy.yml` 自动触发，包含以下 Job：

| Job | 依赖 | 说明 |
|-----|------|------|
| `check-ci` | 无 | 确认 CI 成功 |
| `deploy-supabase-migrations` | check-ci | 数据库迁移 |
| `deploy-supabase-functions` | migrations | matrix 并行部署 8 个 Edge Functions |
| `deploy-web` | migrations | 等待 Vercel 部署 + 健康检查 |
| `publish-cli` | check-ci | npm publish @mango/cli |

### 需要配置的 GitHub Secrets

| Secret | 用途 |
|--------|------|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 认证 |
| `SUPABASE_PROJECT_REF` | 生产项目 ID |
| `NPM_TOKEN` | npm 发布认证 |

### 手动触发

支持通过 GitHub Actions 页面手动触发 `workflow_dispatch`，可选跳过数据库迁移（用于回滚或重新部署）。

---

## 2. 本地一键部署

### 可用命令

```bash
pnpm deploy:all        # 全量部署（数据库 + Functions + CLI）
pnpm deploy:db         # 仅数据库迁移
pnpm deploy:functions  # 仅 Edge Functions
pnpm deploy:cli        # 仅 CLI npm 发布
```

### 环境变量

本地部署前需设置以下环境变量：

```bash
export SUPABASE_ACCESS_TOKEN="your-token"
export SUPABASE_PROJECT_REF="your-project-ref"
```

---

## 3. CLI npm 发布

`@mango/cli` 通过 npm 发布，支持全局安装：

```bash
npm install -g @mango/cli
```

发布前确保：
- `apps/cli/package.json` 中版本号已更新
- npm 已登录（`npm whoami`）
- 可先用 `--dry-run` 测试：`cd apps/cli && npm publish --dry-run`

---

## 4. Vercel 部署

Web 应用通过 Vercel GitHub Integration 自动部署：
- PR 创建时自动生成 Preview 部署
- 合并到 main 后自动触发 Production 部署
- deploy.yml 中会等待 Vercel 部署完成并执行健康检查

### 构建配置

- Framework: Next.js
- Root Directory: `apps/web`
- Build Command: `cd ../.. && pnpm build --filter @mango/web`
- Install Command: `pnpm install`

---

## 5. 回滚策略

| 组件 | 回滚方式 |
|------|----------|
| 数据库 | 编写反向迁移 SQL，走正常 PR 流程 |
| Edge Functions | 手动触发 deploy.yml 或本地 `pnpm deploy:functions` |
| Vercel | Dashboard 内置 Instant Rollback |
| CLI | `npm unpublish @mango/cli@x.x.x` 或发布修复版本 |

---

## 6. 验证方式

1. 本地 `pnpm deploy:db` 测试数据库迁移
2. 本地 `pnpm deploy:functions` 测试函数部署
3. 本地 `pnpm deploy:cli` 测试 npm 发布（可先用 `--dry-run`）
4. 推送到 main，观察 CI → Deploy 流水线自动触发
5. `npm info @mango/cli` 确认 CLI 包已发布
