# 部署指南

本指南介绍如何将 Mango 认证系统部署到各种平台。

## 目录

- [部署前准备](#部署前准备)
- [Vercel 部署（推荐）](#vercel-部署推荐)
- [Netlify 部署](#netlify-部署)
- [Railway 部署](#railway-部署)
- [Docker 部署](#docker-部署)
- [自定义服务器部署](#自定义服务器部署)
- [环境变量配置](#环境变量配置)
- [域名和 SSL 配置](#域名和-ssl-配置)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)

## 部署前准备

### 1. 项目检查清单

在部署之前，请确保完成以下检查：

- [ ] 所有测试通过
- [ ] 环境变量配置正确
- [ ] Supabase 项目配置完成
- [ ] 代码已提交到 Git 仓库
- [ ] 数据库迁移已完成

### 2. 构建测试

在本地运行生产构建测试：

```bash
npm run build
npm run start
```

确保应用在生产模式下正常工作。

### 3. 环境变量准备

准备以下环境变量：

```env
# 必需变量
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 可选变量
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
ANALYZE=false
```

## Vercel 部署（推荐）

Vercel 是 Next.js 的官方部署平台，提供最佳的开发体验。

### 方法一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/mango)

### 方法二：从 GitHub 部署

1. **连接 GitHub 仓库**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择您的 GitHub 仓库

2. **配置项目设置**
   ```bash
   # 构建命令
   npm run build

   # 输出目录
   .next

   # 安装命令
   npm install
   ```

3. **设置环境变量**
   在 Vercel 项目设置中添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`

4. **部署**
   点击 "Deploy" 完成部署。

### 方法三：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产部署
vercel --prod
```

### Vercel 配置文件

创建 `vercel.json` 进行高级配置：

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## Netlify 部署

Netlify 提供静态站点托管和无服务器函数支持。

### 1. 网站部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 初始化项目
netlify init

# 部署预览
netlify deploy

# 生产部署
netlify deploy --prod
```

### 2. Netlify 配置

创建 `netlify.toml` 配置文件：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### 3. 环境变量配置

在 Netlify Dashboard > Site settings > Environment variables 中添加：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.netlify.app
```

## Railway 部署

Railway 是现代化的云平台，支持全栈应用部署。

### 1. Railway CLI 部署

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### 2. 从 GitHub 部署

1. 访问 [Railway Dashboard](https://railway.app/dashboard)
2. 选择 "Deploy from GitHub repo"
3. 选择您的仓库
4. 配置环境变量
5. 部署

### 3. Railway 配置

创建 `railway.toml` 配置文件：

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Docker 部署

使用 Docker 进行容器化部署。

### 1. Dockerfile

创建 `Dockerfile`：

```dockerfile
# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine AS base

# 安装依赖项目镜像
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 构建镜像
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# 设置权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

### 3. 部署命令

```bash
# 构建镜像
docker build -t mango-app .

# 运行容器
docker run -d \
  --name mango-app \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  mango-app

# 使用 Docker Compose
docker-compose up -d
```

## 自定义服务器部署

在自己的服务器上部署应用。

### 1. 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+ 推荐)
- **Node.js**: 18.17 或更高版本
- **内存**: 最少 1GB RAM
- **存储**: 最少 10GB 磁盘空间
- **网络**: 公网 IP 和域名

### 2. 服务器设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install nginx -y

# 配置防火墙
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. 应用部署

```bash
# 克隆代码
git clone https://github.com/your-username/mango.git
cd mango

# 安装依赖
npm install

# 构建应用
npm run build

# 使用 PM2 启动
pm2 start npm --name "mango-app" -- start
pm2 startup
pm2 save
```

### 4. Nginx 配置

创建 `/etc/nginx/sites-available/mango`：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/mango /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 环境变量配置

### 开发环境

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 生产环境

```env
# 生产环境变量
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# 可选优化变量
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### 环境变量验证

添加运行时验证：

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

## 域名和 SSL 配置

### 1. 域名配置

**DNS 记录设置**:
```
Type: A
Name: @
Value: your_server_ip

Type: CNAME
Name: www
Value: yourdomain.com
```

### 2. SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. SSL 配置验证

更新后的 Nginx 配置：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 配置优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 性能优化

### 1. Next.js 优化配置

```typescript
// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      enabled: true
    }
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  images: {
    domains: ['your-supabase-url.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin'
        }
      ]
    }
  ]
}

export default nextConfig
```

### 2. 缓存策略

```nginx
# Nginx 缓存配置
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.(html)$ {
    expires -1;
    add_header Cache-Control "public, no-cache";
}
```

### 3. CDN 配置

使用 CDN 提升全球访问速度：

- **Cloudflare**: 免费 CDN 和 DDoS 保护
- **AWS CloudFront**: 与 AWS 生态集成
- **Vercel Edge Network**: Vercel 内置 CDN

## 监控和日志

### 1. 应用监控

使用 PM2 监控：

```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs

# 查看监控面板
pm2 monit

# 重启应用
pm2 restart mango-app
```

### 2. 系统监控

```bash
# 安装监控工具
sudo apt install htop iotop nethogs -y

# 查看系统资源
htop
iotop
nethogs
```

### 3. 日志管理

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/mango

# 内容
/var/log/mango/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

### 4. 错误跟踪

集成错误跟踪服务：

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.user) {
      delete event.user.email
    }
    return event
  }
})
```

## 故障排除

### 常见部署问题

#### 1. 构建失败

**错误**: "npm ERR! code ELIFECYCLE"

**解决方案**:
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 检查 Node.js 版本
node --version
npm --version
```

#### 2. 环境变量问题

**错误**: "Missing environment variables"

**解决方案**:
- 检查环境变量名称拼写
- 确保所有必需变量已设置
- 验证变量值格式正确

#### 3. 数据库连接失败

**错误**: "Connection refused"

**解决方案**:
- 检查 Supabase URL 和密钥
- 验证网络连接
- 检查防火墙设置

#### 4. SSL 证书问题

**错误**: "SSL certificate verification failed"

**解决方案**:
```bash
# 检查证书状态
sudo certbot certificates

# 强制续期
sudo certbot renew --force-renewal

# 重新获取证书
sudo certbot delete --cert-name yourdomain.com
sudo certbot --nginx -d yourdomain.com
```

### 健康检查

创建健康检查端点：

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // 检查数据库连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) throw error

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 })
  }
}
```

## 备份和恢复

### 1. 数据备份

```bash
# Supabase 数据导出
npx supabase db dump > backup.sql

# 定期备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
npx supabase db dump > "backup_$DATE.sql"
gzip "backup_$DATE.sql"
```

### 2. 代码备份

```bash
# Git 备份
git remote add backup https://github.com/backup-repo/mango.git
git push backup main

# 文件备份
tar -czf mango_backup_$(date +%Y%m%d).tar.gz /path/to/mango
```

## 下一步

- 设置监控和告警
- 配置自动化部署
- 实施 DevOps 最佳实践
- 查看 [认证系统文档](./AUTHENTICATION.md)

---

如需更多帮助，请参考各平台的官方文档或提交 [Issue](https://github.com/your-username/mango/issues)。