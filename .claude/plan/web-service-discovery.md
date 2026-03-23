# 实施计划：设备 Web 服务自动发现与预览

## 📋 任务类型
- [x] 全栈 (CLI 后端 + Web 前端)

## 技术方案

**核心思路**：CLI 端自动扫描设备本地 Web 服务端口 → 通过 HTTP API 暴露服务列表 → Web 端 DeviceTab 展示 → 点击后通过 CLI 反向代理在编辑区 iframe 预览。

**方案选型**：CLI 内建"扫描器 + 反向代理"（方案 A），所有流量走 CLI 设备入口，保证 Tunnel 场景可用。

### 关键设计决策

1. **端口扫描**：`net.connect` 探测 + HTTP 应用层探测（抓取 title、Server header）
2. **反向代理**：`ALL /proxy/web/:serviceId/*` 代理到目标服务，移除 X-Frame-Options 限制
3. **iframe 预览认证**：URL query token（短期有效），不依赖 Bearer header
4. **前端标签页**：`EditorTab.type` 新增 `'webservice'`，复用 `LinkPreviewer` 组件
5. **刷新机制**：首版 10-15s 轮询；后续可升级为 WebSocket 推送
6. **手动探测**：Web 端支持手动输入端口号，CLI 端按需探测单个端口并返回结果，可直接打开

## 实施步骤

### Step 1：CLI 端 - Web 服务扫描器模块
**文件**：`apps/cli/src/lib/web-service-scanner.ts`（新建）

- 创建 `WebServiceScanner` 类
- 默认扫描端口：`[80, 443, 3000, 4173, 5173, 8000, 8080, 8888]`
- 扫描流程：
  1. `net.connect(port, '127.0.0.1')` 探测端口开放（超时 500ms）
  2. 对开放端口发 HTTP GET 请求，抓取 `<title>`、`Server` header、status code
  3. 协议判断：443 默认 HTTPS，其余默认 HTTP，失败后回退
- 定时扫描（默认 15s），首次启动立即扫描
- 排除 CLI 自身端口（`actualPort`、`actualHttpsPort`）
- 服务数据结构：
```typescript
interface DiscoveredWebService {
  id: string;              // `ws-${port}` 格式
  port: number;
  protocol: 'http' | 'https';
  host: string;            // 固定 '127.0.0.1'
  status: 'online' | 'offline';
  title?: string;          // <title> 内容
  serverHeader?: string;   // Server 响应头
  responseTimeMs?: number;
  lastCheckedAt: string;
  lastSeenAt?: string;
}
```
- 导出单例 `webServiceScanner`
- 提供 `start(config)`, `stop()`, `getServices()`, `refresh()` 方法
- 提供 `probePort(port: number)` 方法：按需探测单个端口，探测成功后加入服务列表

### Step 2：CLI 端 - 反向代理端点
**文件**：`apps/cli/src/server/index.ts`（修改）

- 新增 `GET /web-services` 端点（需 binding_code 认证）
  - 返回 `{ services: DiscoveredWebService[], lastScanAt, scanConfig }`
- 新增 `POST /web-services/refresh` 端点（手动触发扫描）
- 新增 `POST /web-services/probe` 端点（手动探测单个端口）
  - 请求体：`{ port: number }`
  - 逻辑：调用 scanner.probePort(port)，探测该端口是否有 Web 服务
  - 返回：`{ service: DiscoveredWebService | null }`（探测成功返回服务信息，失败返回 null）
  - 探测成功的端口自动加入服务列表（后续轮询也会包含）
- 新增 `ALL /proxy/web/:serviceId/*` 代理端点
  - 鉴权：支持 `?_preview_token=xxx` query 参数（短期 token）
  - 代理逻辑：
    1. 验证 serviceId 对应的服务存在且 online
    2. 构建目标 URL：`http(s)://127.0.0.1:{port}/{path}`
    3. 转发请求（headers、body）
    4. 响应处理：移除 `X-Frame-Options`、修改 `Content-Security-Policy` 的 `frame-ancestors`
    5. 对 HTTPS 本地服务容忍自签名证书
  - 安全约束：只代理扫描结果中的服务，拒绝任意 URL
- 代理端点同时支持手动探测加入的端口（probePort 成功后即在服务列表中）

### Step 3：CLI 端 - 启动集成
**文件**：`apps/cli/src/commands/start.ts`（修改）

- 在服务启动后（步骤 8 附近）启动 web service scanner
- 传入配置（端口列表、扫描间隔、排除端口）
- 在 cleanup 中调用 scanner.stop()

### Step 4：Web 端 - EditorTab 类型扩展
**文件**：`apps/web/src/hooks/useEditorTabs.ts`（修改）

- `EditorTab.type` 增加 `'webservice'`
- 新增字段 `webService?: { id, port, protocol, title, proxyUrl }`
- 新增 `openWebServiceTab(service)` 方法

### Step 5：Web 端 - EnhancedEditorTabs 渲染分支
**文件**：`apps/web/src/components/workspace/EnhancedEditorTabs.tsx`（修改）

- 新增 `tab.type === 'webservice'` 分支
- 渲染 `LinkPreviewer`，`url` 指向 CLI 代理地址：`${onlineUrl}/proxy/web/${serviceId}/`

### Step 6：Web 端 - DeviceTab 新增 Web 服务区域
**文件**：`apps/web/src/components/workspace/tabs/DeviceTab.tsx`（修改）

- 新增 props：`onOpenWebService?: (service: DiscoveredWebService) => void`
- 新增"Web 服务发现"折叠区域（Collapsible），放在 MCP 调试上方
- 状态：`webServices`, `isLoadingServices`, `webServicesOpen`
- 加载逻辑：展开时 fetch `${onlineUrl}/web-services`
- 自动刷新：每 15s 重新 fetch（折叠区展开时）
- 手动刷新按钮 + 上次扫描时间显示
- 服务列表项 UI：
  ```
  [🟢] :3000  HTTP  │ My Vite App        [打开 ↗]
  [🔴] :8080  HTTP  │ --                  [离线]
  ```
  - 左侧状态指示灯（Circle 图标，绿/灰）
  - 端口号 + 协议 Badge
  - 服务标题（无标题显示端口信息）
  - 右侧：在线时显示"打开"按钮，点击调用 `onOpenWebService`
- 空状态：设备在线但无服务时显示提示
- 离线状态：设备离线时折叠区不可展开
- **手动输入端口区域**（在服务列表下方）：
  - 一行布局：`[端口输入框(number, 1-65535)] [探测按钮]`
  - 输入框 placeholder: "输入端口号..."
  - 点击探测按钮 → fetch `POST ${onlineUrl}/web-services/probe` `{ port }`
  - 探测中显示 loading 状态
  - 探测成功：服务自动出现在上方列表，并自动调用 `onOpenWebService` 在编辑区打开
  - 探测失败：显示 toast 提示"端口 {port} 未发现 Web 服务"
  - 输入验证：1-65535 整数，回车键触发探测

### Step 7：Web 端 - VSCodeWorkspace 集成
**文件**：`apps/web/src/components/workspace/VSCodeWorkspace.tsx`（修改）

- DeviceTab 传入 `onOpenWebService` 回调
- 回调逻辑：调用 `openWebServiceTab(service)` 在编辑区打开预览

### Step 8：国际化文本
**文件**：`apps/web/messages/zh/devices.json` + `apps/web/messages/en/devices.json`（修改）

新增 key：
```json
{
  "deviceTab.webServices": "Web 服务发现",
  "deviceTab.noWebServices": "未发现 Web 服务",
  "deviceTab.noWebServicesHint": "设备上未检测到运行中的 Web 服务",
  "deviceTab.refreshServices": "刷新服务",
  "deviceTab.lastScan": "上次扫描",
  "deviceTab.openService": "打开",
  "deviceTab.serviceOffline": "离线",
  "deviceTab.port": "端口",
  "deviceTab.scanning": "扫描中...",
  "deviceTab.manualProbe": "手动探测",
  "deviceTab.portPlaceholder": "输入端口号...",
  "deviceTab.probe": "探测",
  "deviceTab.probing": "探测中...",
  "deviceTab.probeNotFound": "端口 {port} 未发现 Web 服务",
  "deviceTab.probeSuccess": "已发现服务，正在打开...",
  "deviceTab.invalidPort": "请输入有效端口号 (1-65535)"
}
```

### Step 9：共享类型定义
**文件**：`packages/shared/src/types/web-service.types.ts`（新建）

- 导出 `DiscoveredWebService` 接口，CLI 和 Web 共用

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/cli/src/lib/web-service-scanner.ts` | 新建 | 端口扫描器模块 |
| `apps/cli/src/server/index.ts` | 修改 | 新增 /web-services、/proxy/web 端点 |
| `apps/cli/src/commands/start.ts` | 修改 | 启动时集成扫描器 |
| `packages/shared/src/types/web-service.types.ts` | 新建 | 共享类型定义 |
| `apps/web/src/hooks/useEditorTabs.ts` | 修改 | EditorTab 新增 webservice 类型 |
| `apps/web/src/components/workspace/EnhancedEditorTabs.tsx` | 修改 | 新增 webservice 渲染分支 |
| `apps/web/src/components/workspace/tabs/DeviceTab.tsx` | 修改 | 新增 Web 服务发现折叠区 |
| `apps/web/src/components/workspace/VSCodeWorkspace.tsx` | 修改 | 集成 onOpenWebService 回调 |
| `apps/web/messages/zh/devices.json` | 修改 | 中文国际化文本 |
| `apps/web/messages/en/devices.json` | 修改 | 英文国际化文本 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 代理层根路径资源丢失前缀 | Phase 1 不做 HTML 重写，用 Referer 反查 serviceId；提供"外部打开"按钮作为 fallback |
| iframe 内某些网站拒绝嵌入 | 代理层移除 X-Frame-Options；仍有问题时引导用户用"外部打开" |
| 端口扫描误扫到敏感服务 | 只扫描预设白名单端口，不接受任意 URL |
| 手动探测端口范围过大 | 限制 1-65535，只探测 127.0.0.1，单次单端口 |
| 代理变成 SSRF 入口 | 只代理 serviceId 对应的 127.0.0.1 端口，不支持任意 host |
| HMR/WebSocket 不通过代理 | Phase 1 明确不支持，Phase 2 再做 WebSocket 透传 |

## 不在首版范围内

- WebSocket/HMR 透传
- 服务上下线的 WebSocket 实时推送（首版用轮询）
- HTML 全量重写（修复根路径资源引用）
- Cookie/Session 穿透

## SESSION_ID（供 /ccg:execute 使用）
- CODEX_SESSION: 019d0fa0-5376-7240-b10e-1544a7230b1c
- GEMINI_SESSION: N/A（调用失败）
