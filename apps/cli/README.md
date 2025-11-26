# Mango CLI

Mango 平台的命令行工具，用于管理本地 MCP/ACP 服务。

## 安装

```bash
# 从项目根目录
pnpm install

# 构建 CLI
cd apps/cli
pnpm build
```

## 使用

```bash
# 查看帮助
mango --help

# 初始化配置
mango init

# 认证
mango auth --login

# 服务管理（即将推出）
mango service register <service-name>
mango service list
mango service status <service-name>
```

## 开发

```bash
# 开发模式（热重载）
pnpm dev

# 构建
pnpm build

# 本地测试
pnpm start
```
