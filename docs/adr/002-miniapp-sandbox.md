# ADR-002: MiniApp 沙箱隔离策略

## 状态
已采纳

## 背景
MiniApp 允许用户编写自定义代码，需要防止恶意代码影响宿主应用。

## 决策
采用 iframe sandbox + 受限 API 注入方案。

## 理由
- iframe sandbox 提供浏览器原生隔离
- 仅注入 storage API，限制可访问能力
- 执行时间和内存限制防止资源滥用
- 无需引入 Web Worker 或 WASM 等复杂方案

## 后果
- MiniApp 无法直接访问 DOM
- 跨域通信需通过 postMessage
- 部分浏览器对 sandbox 支持有差异
