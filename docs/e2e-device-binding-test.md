# 设备绑定端到端测试指南

本文档描述如何测试完整的设备绑定流程 (User Story 3)。

## 测试环境准备

### 1. 启动本地 Supabase

```bash
cd D:\Projects\mango
npx supabase start
```

确认以下服务正常运行:
- API URL: http://localhost:54321
- Studio URL: http://localhost:54323
- Realtime: 启用

### 2. 配置环境变量

CLI 工具需要以下环境变量:

```bash
# apps/cli/.env (如果不存在则创建)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<从 supabase start 输出中获取>
APP_URL=http://localhost:3000
PORT=3001
```

Web 应用需要:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<从 supabase start 输出中获取>
```

### 3. 启动 Web 应用

```bash
cd D:\Projects\mango
npm run dev
```

访问 http://localhost:3000 确认应用正常运行。

## 测试流程

### 步骤 1: 启动 CLI 工具

```bash
cd D:\Projects\mango\apps\cli
npm run dev start
```

**预期结果:**
- ✅ HTTP 服务器启动成功 (端口 3001 或其他可用端口)
- ✅ Cloudflare Tunnel 创建成功 (如果已安装 cloudflared)
- ✅ 生成 8 位临时绑定码 (例如: `a1b2c3d4`)
- ✅ Realtime Channel 建立成功 (`binding:a1b2c3d4`)
- ✅ 设备 URL 发布到 Channel
- ✅ 自动打开浏览器到绑定页面

**检查点:**
```
✓ Configuration loaded
✓ Device ID: <device-id-hash>...
  Platform: windows (x64)
  Hostname: <your-hostname>
✓ Server running on port 3001
✓ Cloudflare Tunnel created
  - Cloudflare URL: https://xxx.trycloudflare.com
✓ Temporary binding code generated: a1b2c3d4
✓ Realtime Channel established: binding:a1b2c3d4
✓ Device URLs published to channel
✓ Listening for URL requests from Web...

Cloudflare URL: https://xxx.trycloudflare.com
Localhost URL: http://localhost:3001
Hostname URL: http://192.168.1.100:3001  (本机 IP 地址)
Bind URL: http://localhost:3000/devices/bind?code=a1b2c3d4
```

**注意事项:**
- Hostname URL 使用本机 IP 地址 (如 `192.168.1.100`),而不是 hostname
- 如果没有安装 cloudflared,Cloudflare URL 将不可用
- CLI 工具会监听 Web 端的 URL 请求,如果 Web 端没有收到数据会自动重新发送

### 步骤 2: Web 端绑定

浏览器应该自动打开到 `http://localhost:3000/devices/bind?code=a1b2c3d4`

**预期结果:**
1. ✅ 临时绑定码自动填充到输入框
2. ✅ 页面订阅 Realtime Channel (`binding:a1b2c3d4`)
3. ✅ **主动请求机制**:
   - 如果 3 秒内没有收到设备 URL,Web 端会主动发送 `request_urls` 消息
   - CLI 端收到请求后重新发送设备 URL
   - 如果第一次请求后仍没有数据,3 秒后会再次重试
   - 浏览器控制台会显示: "Requesting device URLs from CLI..."
   - CLI 端会显示: "Received URL request from Web, resending device URLs..."
4. ✅ 显示 "Connected to device" 状态 (绿色 Wifi 图标)
5. ✅ 显示设备信息:
   - Platform: windows
   - Hostname: <your-hostname>
   - Device URL: https://xxx.trycloudflare.com 或 http://192.168.1.100:3001
6. ✅ Health Check 自动执行并显示 "Device is accessible" (绿色勾号)
7. ✅ 显示设备名称输入框和 "Bind Device" 按钮

**操作:**
- 输入设备名称 (例如: "My Work Laptop")
- 点击 "Bind Device" 按钮

**预期结果:**
- ✅ 显示 "Binding..." 加载状态
- ✅ 绑定成功后显示 "Device bound successfully!"
- ✅ 3 秒后自动跳转到 `/settings/devices`

### 步骤 3: 验证设备管理页面

在 `http://localhost:3000/settings/devices` 页面:

**预期结果:**
- ✅ 显示刚刚绑定的设备
- ✅ 设备信息正确:
  - Binding Name: "My Work Laptop"
  - Platform: windows
  - Hostname: <your-hostname>
  - Device ID: <device-id-hash>...
  - Status: Active
  - Last Seen: <刚才的时间>
- ✅ Device URL 显示正确
- ✅ 状态徽章显示 "Unknown" (因为默认不检查在线状态)

**操作:**
- 点击刷新按钮 (RefreshCw 图标)

**预期结果:**
- ✅ 状态徽章更新为 "Online" (绿色) 或 "Offline" (红色)

### 步骤 4: 测试设备通信

**4.1 Health Check**

在浏览器中访问设备 URL 的 health 端点:
```
http://localhost:3001/health
```

**预期响应:**
```json
{
  "status": "ok",
  "timestamp": 1703001234567,
  "version": "0.1.0"
}
```

**4.2 测试设备 URL 更新**

模拟设备 URL 变更 (例如 Cloudflare Tunnel URL 变更):

```bash
curl -X POST http://localhost:54321/functions/v1/update-device-url \
  -H "Content-Type: application/json" \
  -d '{
    "binding_code": "<从数据库获取的 binding_code>",
    "new_device_url": "https://new-tunnel-url.trycloudflare.com"
  }'
```

**预期响应:**
```json
{
  "success": true,
  "updated": {
    "binding_id": "<uuid>",
    "device_url": "https://new-tunnel-url.trycloudflare.com",
    "updated_at": "2025-01-24T..."
  }
}
```

刷新设备管理页面,确认 Device URL 已更新。

### 步骤 5: 测试解绑设备

在设备管理页面:

**操作:**
- 点击设备卡片右上角的删除按钮 (Trash2 图标)
- 在确认对话框中点击 "Unbind Device"

**预期结果:**
- ✅ 显示 "Unbinding..." 加载状态
- ✅ 设备从列表中移除
- ✅ 数据库中的 `device_bindings` 记录被删除
- ✅ 相关的 `mcp_services` 记录被级联删除

## 数据库验证

使用 Supabase Studio (http://localhost:54323) 验证数据:

### 1. devices 表

```sql
SELECT * FROM devices ORDER BY created_at DESC LIMIT 1;
```

**预期字段:**
- `id`: UUID
- `device_id`: 硬件生成的唯一 ID
- `device_name`: "My Work Laptop"
- `platform`: "windows"
- `hostname`: <your-hostname>
- `created_at`: 绑定时间
- `last_seen_at`: 最后活跃时间

### 2. device_bindings 表

```sql
SELECT * FROM device_bindings ORDER BY created_at DESC LIMIT 1;
```

**预期字段:**
- `id`: UUID
- `device_id`: 关联的设备 ID
- `user_id`: 当前用户 ID
- `binding_name`: "My Work Laptop"
- `device_url`: 设备 URL
- `binding_code`: 256 位随机字符串
- `status`: "active"
- `created_at`: 绑定时间
- `updated_at`: 更新时间

### 3. 验证 RLS 策略

以不同用户身份登录,确认只能看到自己的设备绑定。

## 常见问题排查

### 问题 1: Realtime Channel 连接失败

**症状:** Web 端显示 "Waiting for device..." 一直不变

**排查:**
1. 检查 Supabase Realtime 是否启用
2. 检查临时绑定码是否正确
3. 检查浏览器控制台是否有 WebSocket 错误
4. 确认 CLI 工具是否成功发布设备 URL
5. **检查主动请求机制**:
   - 等待 3 秒,观察浏览器控制台是否显示 "Requesting device URLs from CLI..."
   - 检查 CLI 端是否显示 "Received URL request from Web, resending device URLs..."
   - 如果 CLI 端没有收到请求,可能是 Channel 订阅失败

### 问题 2: Health Check 失败

**症状:** 显示 "Device not accessible"

**排查:**
1. 检查设备 URL 是否可访问
2. 如果使用 Cloudflare Tunnel,确认 tunnel 是否正常运行
3. 如果使用 Hostname URL (IP 地址),确认:
   - 本机 IP 地址是否正确 (不应该是 127.0.0.1 或 localhost)
   - 防火墙是否允许该端口访问
   - Web 应用和 CLI 工具是否在同一网络
4. 检查防火墙设置
5. 尝试直接访问 `<device-url>/health`

### 问题 3: 绑定失败

**症状:** 点击 "Bind Device" 后显示错误

**排查:**
1. 检查浏览器控制台错误信息
2. 检查 CLI 工具日志
3. 检查数据库连接
4. 确认用户已登录

### 问题 4: 设备管理页面不显示设备

**症状:** 绑定成功但设备列表为空

**排查:**
1. 检查数据库中是否有记录
2. 检查 RLS 策略是否正确
3. 检查 API 响应 (`/api/devices`)
4. 确认用户 ID 匹配

### 问题 5: Hostname URL 显示为 localhost

**症状:** Hostname URL 显示为 `http://localhost:3001` 而不是 IP 地址

**原因:**
- 无法获取本机 IP 地址
- 所有网络接口都是虚拟接口或内部接口

**排查:**
1. 检查网络连接是否正常
2. 确认本机有有效的网络接口 (非虚拟网卡)
3. 在 CLI 端手动检查 IP: `ipconfig` (Windows) 或 `ifconfig` (macOS/Linux)

## 测试清单

- [ ] CLI 工具启动成功
- [ ] 临时绑定码生成
- [ ] Realtime Channel 建立
- [ ] Hostname URL 使用本机 IP 地址 (不是 hostname.local)
- [ ] Web 端接收设备信息
- [ ] **主动请求机制**: Web 端 3 秒内没收到数据会主动请求
- [ ] **重试机制**: 第一次请求后仍没数据会再次重试
- [ ] CLI 端响应 Web 端的 URL 请求
- [ ] Health Check 成功
- [ ] 设备绑定成功
- [ ] 设备管理页面显示设备
- [ ] 在线状态检查正常
- [ ] 设备 URL 更新功能正常
- [ ] 解绑设备功能正常
- [ ] 数据库记录正确
- [ ] RLS 策略生效

## 性能测试

### 1. Realtime Channel 延迟

测量从 CLI 发布设备 URL 到 Web 端接收的时间:
- **目标:** < 1 秒 (正常情况)
- **降级:** 3-6 秒 (使用主动请求机制)

### 2. 主动请求响应时间

测量从 Web 端发送 `request_urls` 到收到响应的时间:
- **目标:** < 500ms

### 3. Health Check 响应时间

测量 Health Check 请求的响应时间:
- **目标:** < 500ms (localhost)
- **目标:** < 2 秒 (Cloudflare Tunnel)
- **目标:** < 1 秒 (Hostname URL - 本地网络)

### 4. 绑定操作时间

测量从点击 "Bind Device" 到绑定成功的时间:
- **目标:** < 3 秒

## 安全测试

### 1. 临时绑定码安全性

- [ ] 临时绑定码只在运行时内存中存在
- [ ] 临时绑定码不存储在数据库
- [ ] 临时绑定码在绑定后失效

### 2. 正式绑定码安全性

- [ ] 绑定码为 256 位随机字符串
- [ ] 绑定码存储在本地文件 (~/.mango/binding_code)
- [ ] 文件权限为 0o600 (仅用户可读写)
- [ ] 绑定码在数据库中唯一

### 3. RLS 策略

- [ ] 用户只能查看自己的设备绑定
- [ ] 用户只能删除自己的设备绑定
- [ ] 匿名用户可以创建设备记录 (CLI 调用)

## 总结

完成以上所有测试步骤后,确认:
1. ✅ 设备绑定流程完整可用
2. ✅ Realtime Channel 通信正常
3. ✅ **主动请求机制工作正常** (Web 端可以主动请求设备 URL)
4. ✅ **重试机制工作正常** (第一次请求失败后会自动重试)
5. ✅ Hostname URL 使用本机 IP 地址
6. ✅ 数据库结构正确
7. ✅ API 端点功能正常
8. ✅ 安全策略生效

## 新增功能说明

### 主动请求机制

为了提高绑定流程的可靠性,我们实现了主动请求机制:

**工作原理:**
1. Web 端订阅 Realtime Channel 后,等待 3 秒
2. 如果 3 秒内没有收到设备 URL,主动发送 `request_urls` 消息
3. CLI 端监听 `request_urls` 事件,收到后重新发送设备 URL
4. 如果第一次请求后仍没有数据,3 秒后再次重试
5. 收到数据后清除所有定时器,停止重试

**解决的问题:**
- 网络延迟导致的消息丢失
- Web 端订阅时 CLI 端已经发送过数据
- Realtime Channel 的消息可靠性问题

**日志追踪:**
- Web 端: 浏览器控制台显示 "Requesting device URLs from CLI..."
- CLI 端: 终端显示 "Received URL request from Web, resending device URLs..."

### Hostname URL 优化

**改进前:** `http://J.local:3001` (使用 hostname)
**改进后:** `http://192.168.1.100:3001` (使用本机 IP 地址)

**优势:**
- 更容易在局域网内访问
- 不依赖 mDNS 或 Bonjour 服务
- 跨平台兼容性更好
- 更直观,便于调试

如有任何问题,请参考上述排查步骤或查看相关日志。
