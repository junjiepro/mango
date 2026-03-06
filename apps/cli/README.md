# Mango CLI

Mango 智能Agent对话平台的命令行工具，用于启动设备服务、管理本地 MCP/ACP 服务，并通过 Cloudflare Tunnel 将本地服务暴露到公网。

## 功能特性

- 🚀 一键启动设备服务
- 🔒 安全的设备绑定流程（临时绑定码 + 正式绑定码）
- 🌐 自动创建 Cloudflare Tunnel
- 🔧 管理本地 MCP/ACP 服务
- 📊 实时查看设备和服务状态
- 🔄 自动更新设备 URL

## 前置要求

### 必需

- **Node.js**: v20.0.0 或更高版本
- **pnpm**: v8.0.0 或更高版本

### 可选

- **cloudflared**: 用于创建 Cloudflare Tunnel（推荐）
  - 如果不安装，设备服务只能在本地网络访问

## 安装

### 方法 1: 从源码安装（开发环境）

```bash
# 1. 克隆项目
git clone https://github.com/junjiepro/mango.git
cd mango

# 2. 安装依赖
pnpm install

# 3. 构建 CLI
cd apps/cli
pnpm build

# 4. 全局链接（可选）
pnpm link --global
```

### 方法 2: 使用 npm/pnpm 安装（生产环境）

```bash
# 使用 npm
npm install -g mango-ai-cli

# 使用 pnpm
pnpm add -g mango-ai-cli
```

### 安装 Cloudflare Tunnel（推荐）

```bash
# macOS (使用 Homebrew)
brew install cloudflare/cloudflare/cloudflared

# Windows (使用 Scoop)
scoop install cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# 验证安装
cloudflared --version
```

## 快速开始

### 1. 启动设备服务

```bash
# 使用默认配置启动
mango-ai-cli start --app-url https://mango.example.com

# 指定端口启动
mango-ai-cli start --port 3200

# 不自动打开浏览器
mango-ai-cli start --ignore-open-bind-url
```

启动后，CLI 会：

1. 生成临时绑定码（6位数字）
2. 启动本地 HTTP 服务
3. 创建 Cloudflare Tunnel（如果已安装 cloudflared）
4. 自动打开浏览器到绑定页面

### 2. 完成设备绑定

在浏览器中：

1. 输入临时绑定码
2. 为设备命名
3. 点击"绑定设备"

绑定成功后，设备服务会保存正式绑定码，用于后续的 API 认证。

### 3. 配置 MCP 服务

在 Mango Web 应用的设备管理页面：

1. 进入"设备设置"
2. 添加 MCP 服务配置
3. 保存配置

CLI 会自动加载并启动配置的 MCP 服务。

## 命令参考

### `start` - 启动设备服务

```bash
mango-ai-cli start [options]
```

**选项:**

- `--port <port>` - 指定服务端口（默认: 3100）
- `--app-url <url>` - 指定 Mango Web 应用 URL
- `--supabase-url <url>` - 指定 Supabase URL
- `--supabase-anon-key <key>` - 指定 Supabase 匿名密钥
- `--ignore-open-bind-url` - 不自动打开绑定页面
- `--no-tunnel` - 不创建 Cloudflare Tunnel

**示例:**

```bash
# 基本使用，默认连接本地 Mango 应用
mango-ai-cli start

# 自定义端口
mango-ai-cli start --port 3200

# 指定 Mango 应用 URL
mango-ai-cli start --app-url https://mango.example.com

# 不创建 Tunnel（仅本地访问）
mango-ai-cli start --no-tunnel
```

### `status` - 查看设备状态

```bash
mango-ai-cli status
```

显示信息：

- 系统信息（平台、主机名、架构）
- 绑定状态（已绑定设备数量）
- 绑定详情（设备名称、ID、MCP 服务）
- Tunnel 状态

### `version` - 显示版本信息

```bash
mango-ai-cli version
```

### `help` - 显示帮助信息

```bash
mango-ai-cli help
```

## 配置文件

CLI 会在以下位置存储配置：

- **Windows**: `%USERPROFILE%\.mango-ai-cli\`
- **macOS/Linux**: `~/.mango-ai-cli/`

配置文件包括：

- `device-secret.json` - 设备密钥
- `binding-codes.json` - 绑定码配置
- `mcp-services.json` - MCP 服务配置

## 环境变量

可以通过环境变量配置 CLI：

```bash
# Mango Web 应用 URL
export MANGO_APP_URL=https://mango.example.com

# Supabase 配置
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

# 设备密钥（可选，自动生成）
export DEVICE_SECRET=your-device-secret
```

## 安全最佳实践

### 临时绑定码

- **有效期**: 1小时
- **用途**: 仅用于初始设备绑定
- **存储**: 仅在运行时内存中
- **传输**: 通过 Realtime Channel 安全传输

### 正式绑定码

- **长度**: 256位随机字符串
- **用途**: API 认证
- **存储**: 本地配置文件（加密存储）
- **传输**: HTTPS + Bearer Token

### 建议

1. **不要分享绑定码**: 绑定码等同于设备访问权限
2. **定期更换**: 如果怀疑泄露，立即解绑并重新绑定
3. **使用 HTTPS**: 生产环境必须使用 HTTPS
4. **限制访问**: 在防火墙中限制设备服务的访问

## 故障排除

### 问题: Cloudflare Tunnel 创建失败

**解决方案:**

1. 检查 cloudflared 是否已安装:

   ```bash
   cloudflared --version
   ```

2. 检查网络连接

3. 使用 `--no-tunnel` 选项跳过 Tunnel 创建:

   ```bash
   mango-ai-cli start --no-tunnel
   ```

### 问题: 设备绑定失败

**解决方案:**

1. 检查临时绑定码是否正确
2. 检查临时绑定码是否过期（1小时有效期）
3. 重新启动 CLI 生成新的临时绑定码

### 问题: MCP 服务无法启动

**解决方案:**

1. 检查 MCP 服务配置是否正确
2. 检查服务命令是否可执行
3. 查看 CLI 日志获取详细错误信息

## 开发

### 开发模式

```bash
# 进入 CLI 目录
cd apps/cli

# 启动开发模式（热重载）
pnpm dev

# 运行 linter
pnpm lint

# 构建
pnpm build

# 本地测试
pnpm start
```

### 项目结构

```
apps/cli/
├── src/
│   ├── commands/          # 命令实现
│   │   ├── start.ts       # 启动命令
│   │   ├── status.ts      # 状态命令
│   │   ├── version.ts     # 版本命令
│   │   └── help.ts        # 帮助命令
│   ├── lib/               # 核心库
│   │   ├── config.ts      # 配置管理
│   │   ├── device-id.ts   # 设备ID生成
│   │   ├── tunnel-manager.ts  # Tunnel管理
│   │   ├── temp-binding-manager.ts  # 临时绑定码管理
│   │   ├── binding-code-manager.ts  # 正式绑定码管理
│   │   └── connectors/    # 服务连接器
│   │       ├── mcp-connector.ts
│   │       └── acp-connector.ts
│   ├── server/            # HTTP服务器
│   │   └── index.ts       # Hono服务器
│   ├── types/             # 类型定义
│   └── index.ts           # 入口文件
├── package.json
├── tsconfig.json
└── README.md
```

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解详情。

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件

## 支持

- 📖 文档: https://docs.mango.example.com
- 💬 讨论: https://github.com/junjiepro/mango/discussions
- 🐛 问题反馈: https://github.com/junjiepro/mango/issues
