/**
 * MiniApp Container Component
 * T088: Create MiniAppContainer component
 *
 * 提供安全的 iframe 沙箱环境来运行小应用
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface SecureMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  version: string;
  nonce: string;
  timestamp: number;
  payload: any;
  signature?: string;
}

interface MiniAppContainerProps {
  miniApp: MiniApp;
  installation: MiniAppInstallation;
  className?: string;
  onMessage?: (message: SecureMessage) => void;
  onError?: (error: Error) => void;
}

export interface MiniAppContainerRef {
  sendMessage: (action: string, payload: any) => Promise<any>;
}

/**
 * MiniAppContainer 组件
 * 使用 iframe 沙箱运行小应用代码
 */
export const MiniAppContainer = React.forwardRef<MiniAppContainerRef, MiniAppContainerProps>(
  ({ miniApp, installation, className, onMessage, onError }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const messageHandlers = useRef<Map<string, (response: any) => void>>(new Map());

    // 生成随机 nonce
    const generateNonce = () => {
      return (
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      );
    };

    // 发送消息到 iframe
    const sendMessage = (action: string, payload: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!iframeRef.current?.contentWindow) {
          reject(new Error('Iframe not ready'));
          return;
        }

        const message: SecureMessage = {
          id: generateNonce(),
          type: 'REQUEST',
          action,
          version: '1.0.0',
          nonce: generateNonce(),
          timestamp: Date.now(),
          payload,
        };

        // 保存回调
        messageHandlers.current.set(message.id, resolve);

        // 设置超时
        setTimeout(() => {
          if (messageHandlers.current.has(message.id)) {
            messageHandlers.current.delete(message.id);
            reject(new Error('Message timeout'));
          }
        }, 30000); // 30秒超时

        // 发送消息
        iframeRef.current.contentWindow.postMessage(message, '*');
      });
    };

    // 处理来自 iframe 的消息
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // 验证来源
        if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
          return;
        }

        try {
          const message = event.data as SecureMessage;

          // 验证消息格式
          if (!message.id || !message.type || !message.action) {
            console.warn('Invalid message format:', message);
            return;
          }

          // 验证时间戳（防止重放攻击）
          const now = Date.now();
          if (Math.abs(now - message.timestamp) > 60000) {
            // 1分钟内有效
            console.warn('Message timestamp expired');
            return;
          }

          // 处理响应
          if (message.type === 'RESPONSE') {
            const handler = messageHandlers.current.get(message.id);
            if (handler) {
              handler(message.payload);
              messageHandlers.current.delete(message.id);
            }
          }

          // 处理事件
          if (message.type === 'EVENT') {
            onMessage?.(message);
          }
        } catch (error) {
          console.error('Error handling message:', error);
          onError?.(error as Error);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onMessage, onError]);

    // 创建沙箱 HTML
    const createSandboxHTML = () => {
      const runtimeConfig = (miniApp.runtime_config as any) || {};
      const manifest = (miniApp.manifest as any) || {};

      // 如果提供了自定义 HTML，使用自定义 HTML 并注入 MiniApp API
      if (miniApp.html) {
        // 注入 MiniApp API 到自定义 HTML
        const apiScript = `
    <script>
      // MiniApp API
      window.MiniAppAPI = {
        // 发送消息到父窗口
        sendMessage: (action, payload) => {
          return new Promise((resolve, reject) => {
            if (!action) {
              reject(new Error('Missing action'));
              return;
            }
              
            const messageId = Math.random().toString(36).substring(2, 15);
            const message = {
              id: messageId,
              type: 'REQUEST',
              action,
              version: '1.0.0',
              nonce: Math.random().toString(36).substring(2, 15),
              timestamp: Date.now(),
              payload,
            };

            const handleResponse = (event) => {
              if (event.data.id === messageId && event.data.type === 'RESPONSE') {
                window.removeEventListener('message', handleResponse);
                resolve(event.data.payload);
              }
            };

            window.addEventListener('message', handleResponse);
            window.parent.postMessage(message, '*');

            // 超时处理
            setTimeout(() => {
              window.removeEventListener('message', handleResponse);
              reject(new Error('Request timeout'));
            }, 30000);
          });
        },

        // 存储 API
        storage: {
          get: (key) => window.MiniAppAPI.sendMessage('storage.get', { key }),
          set: (key, value) => window.MiniAppAPI.sendMessage('storage.set', { key, value }),
          remove: (key) => window.MiniAppAPI.sendMessage('storage.remove', { key }),
        },

        // 通知 API
        notification: {
          send: (title, body, options) =>
            window.MiniAppAPI.sendMessage('notification.send', { title, body, options }),
        },

        // 用户信息 API
        user: {
          getInfo: () => window.MiniAppAPI.sendMessage('user.getInfo', {}),
        },

        // 调用 MiniApp 代码（类似 edge function 的 invoke_miniapp）
        invokeMiniApp: async (action, params = {}) => {
          try {
            // 创建执行上下文
            const context = {
              action,
              params,
              storage: window.MiniAppAPI.storage,
              console: window.console,
            };

            // 将 context 暴露为全局变量供用户代码访问
            window.__miniapp_context__ = context;

            // 执行用户代码（用户代码可以直接访问 action, params, storage, console）
            const result = await (async function() {
              const { action, params, storage, console } = window.__miniapp_context__;
              ${miniApp.code}
            })();

            // 清理全局变量
            delete window.__miniapp_context__;

            return result;
          } catch (error) {
            console.error('MiniApp invocation error:', error);
            delete window.__miniapp_context__;
            throw error;
          }
        },
      };

      // 错误处理
      window.addEventListener('error', (event) => {
        console.error('MiniApp error:', event.error);
        window.parent.postMessage({
          id: 'error',
          type: 'EVENT',
          action: 'error',
          version: '1.0.0',
          nonce: Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
          payload: { error: event.error?.message || 'Unknown error', stack: event.error?.stack },
        }, '*');
      });
    </script>
      `;

        // 在 </head> 或 </body> 之前注入 API 脚本
        let html = miniApp.html;
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${apiScript}</head>`);
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', `${apiScript}</body>`);
        } else {
          // 如果没有 head 或 body 标签，在末尾添加
          html = html + apiScript;
        }

        return html;
      }

      // 默认模板（使用 code 字段）
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* Mango Design System Colors */
    :root {
      --mango-dark: hsl(40, 3%, 8%);
      --mango-light: hsl(48, 31%, 97%);
      --mango-mid-gray: hsl(48, 4%, 68%);
      --mango-light-gray: hsl(48, 13%, 89%);
      --mango-orange: hsl(15, 63%, 60%);
      --mango-orange-dark: hsl(15, 53%, 50%);
      --mango-blue: hsl(210, 45%, 60%);
      --mango-green: hsl(85, 21%, 45%);
      --mango-gray-100: hsl(48, 25%, 96%);
      --mango-gray-200: hsl(48, 13%, 89%);
      --mango-gray-300: hsl(48, 8%, 82%);
      --mango-gray-600: hsl(48, 3%, 42%);
      --mango-gray-700: hsl(48, 4%, 32%);
    }

    body {
      font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--mango-light);
      min-height: 100vh;
      padding: 20px;
      color: var(--mango-dark);
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 4px 20px rgba(20, 20, 19, 0.08);
      overflow: hidden;
      border: 1px solid var(--mango-gray-200);
    }

    .header {
      background: linear-gradient(135deg, var(--mango-orange) 0%, var(--mango-orange-dark) 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      font-family: "Poppins", sans-serif;
    }

    .header p {
      opacity: 0.95;
      font-size: 14px;
      font-weight: 400;
    }

    .content {
      padding: 24px;
      background: var(--mango-light);
    }

    .section {
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 0.5rem;
      border: 1px solid var(--mango-gray-200);
      box-shadow: 0 1px 3px rgba(20, 20, 19, 0.04);
    }

    .section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--mango-dark);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: "Poppins", sans-serif;
    }

    .section h2::before {
      content: '📦';
      font-size: 20px;
    }

    .api-group {
      display: grid;
      gap: 12px;
    }

    .api-item {
      background: var(--mango-gray-100);
      padding: 16px;
      border-radius: 0.375rem;
      border: 1px solid var(--mango-gray-200);
      transition: all 0.2s ease;
    }

    .api-item:hover {
      border-color: var(--mango-orange);
      box-shadow: 0 2px 8px rgba(217, 119, 87, 0.1);
    }

    .api-item h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--mango-gray-700);
      margin-bottom: 12px;
      font-family: "Poppins", sans-serif;
    }

    .input-group {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    input, textarea {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--mango-gray-200);
      border-radius: 0.375rem;
      font-size: 14px;
      font-family: inherit;
      background: white;
      color: var(--mango-dark);
      transition: all 0.2s ease;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: var(--mango-orange);
      box-shadow: 0 0 0 3px hsla(15, 63%, 60%, 0.1);
    }

    textarea {
      resize: vertical;
      min-height: 60px;
      font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
      font-size: 13px;
    }

    button {
      padding: 8px 16px;
      background: var(--mango-orange);
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: "Poppins", sans-serif;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(217, 119, 87, 0.2);
    }

    button:hover {
      background: var(--mango-orange-dark);
      box-shadow: 0 2px 6px rgba(217, 119, 87, 0.3);
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(217, 119, 87, 0.2);
    }

    .result {
      margin-top: 12px;
      padding: 12px;
      background: hsl(210, 100%, 97%);
      border: 1px solid hsl(210, 100%, 85%);
      border-radius: 0.375rem;
      font-size: 13px;
      color: hsl(210, 100%, 30%);
      display: none;
      word-break: break-all;
      font-family: "SF Mono", Monaco, monospace;
    }

    .result.show {
      display: block;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .result.error {
      background: hsl(0, 100%, 97%);
      border-color: hsl(0, 100%, 85%);
      color: hsl(0, 70%, 40%);
    }

    .result.success {
      background: hsl(85, 60%, 95%);
      border-color: hsl(85, 60%, 75%);
      color: var(--mango-green);
    }

    #app {
      margin-top: 24px;
      padding: 20px;
      background: hsl(48, 100%, 97%);
      border: 2px dashed var(--mango-orange);
      border-radius: 0.5rem;
      min-height: 100px;
      color: var(--mango-dark);
    }

    #app:empty::before {
      content: '💡 用户代码输出区域';
      color: var(--mango-gray-600);
      font-size: 14px;
      font-weight: 500;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--mango-orange);
      color: white;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
      font-family: "Poppins", sans-serif;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--mango-gray-100);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--mango-mid-gray);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--mango-gray-600);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 MiniApp 默认面板</h1>
      <p>测试和体验 MiniApp 标准 API 接口</p>
    </div>

    <div class="content">
      <!-- 存储 API -->
      <div class="section">
        <h2>存储 API <span class="badge">Storage</span></h2>
        <div class="api-group">
          <div class="api-item">
            <h3>💾 保存数据</h3>
            <div class="input-group">
              <input type="text" id="setKey" placeholder="键名 (key)" value="myData">
              <textarea id="setValue" placeholder="值 (JSON格式)">{"name": "测试数据", "count": 42}</textarea>
            </div>
            <button onclick="testStorageSet()">保存</button>
            <div id="setResult" class="result"></div>
          </div>

          <div class="api-item">
            <h3>📖 读取数据</h3>
            <div class="input-group">
              <input type="text" id="getKey" placeholder="键名 (key)" value="myData">
              <button onclick="testStorageGet()">读取</button>
            </div>
            <div id="getResult" class="result"></div>
          </div>

          <div class="api-item">
            <h3>🗑️ 删除数据</h3>
            <div class="input-group">
              <input type="text" id="removeKey" placeholder="键名 (key)" value="myData">
              <button onclick="testStorageRemove()">删除</button>
            </div>
            <div id="removeResult" class="result"></div>
          </div>
        </div>
      </div>

      <!-- 通知 API -->
      <div class="section">
        <h2>通知 API <span class="badge">Notification</span></h2>
        <div class="api-item">
          <h3>🔔 发送通知</h3>
          <div class="input-group">
            <input type="text" id="notifTitle" placeholder="标题" value="MiniApp 通知">
            <input type="text" id="notifBody" placeholder="内容" value="这是一条测试通知">
          </div>
          <button onclick="testNotification()">发送通知</button>
          <div id="notifResult" class="result"></div>
        </div>
      </div>

      <!-- 用户信息 API -->
      <div class="section">
        <h2>用户信息 API <span class="badge">User</span></h2>
        <div class="api-item">
          <h3>👤 获取用户信息</h3>
          <button onclick="testGetUserInfo()">获取信息</button>
          <div id="userResult" class="result"></div>
        </div>
      </div>

      <!-- 用户代码区域 -->
      <div class="section">
        <h2>用户代码 <span class="badge">Custom Code</span></h2>
        <div class="api-item">
          <h3>▶️ 运行自定义代码</h3>
          <p style="font-size: 13px; color: var(--mango-gray-600); margin-bottom: 12px;">
            指定操作类型（action）和参数（params）来执行您的代码
          </p>
          <div class="input-group">
            <input type="text" id="codeAction" placeholder="操作类型 (action)" value="execute" style="flex: 0 0 150px;">
            <textarea id="codeParams" placeholder='参数 (JSON格式，例如: {"name": "test", "value": 123})' rows="3">{}</textarea>
          </div>
          <button onclick="runUserCode()">运行代码</button>
          <div id="codeResult" class="result"></div>
        </div>
      </div>

      <!-- 代码输出区域 -->
      <div id="app"></div>
    </div>
  </div>

  <script>
    // MiniApp API
    const MiniAppAPI = {
      sendMessage: (action, payload) => {
        return new Promise((resolve, reject) => {
          const messageId = Math.random().toString(36).substring(2, 15);
          const message = {
            id: messageId,
            type: 'REQUEST',
            action,
            version: '1.0.0',
            nonce: Math.random().toString(36).substring(2, 15),
            timestamp: Date.now(),
            payload,
          };

          const handleResponse = (event) => {
            if (event.data.id === messageId && event.data.type === 'RESPONSE') {
              window.removeEventListener('message', handleResponse);
              resolve(event.data.payload);
            }
          };

          window.addEventListener('message', handleResponse);
          window.parent.postMessage(message, '*');

          setTimeout(() => {
            window.removeEventListener('message', handleResponse);
            reject(new Error('Request timeout'));
          }, 30000);
        });
      },

      storage: {
        get: (key) => MiniAppAPI.sendMessage('storage.get', { key }),
        set: (key, value) => MiniAppAPI.sendMessage('storage.set', { key, value }),
        remove: (key) => MiniAppAPI.sendMessage('storage.remove', { key }),
      },

      notification: {
        send: (title, body, options) =>
          MiniAppAPI.sendMessage('notification.send', { title, body, options }),
      },

      user: {
        getInfo: () => MiniAppAPI.sendMessage('user.getInfo', {}),
      },

      // 调用 MiniApp 代码（类似 edge function 的 invoke_miniapp）
      invokeMiniApp: async (action, params = {}) => {
        try {
          // 创建执行上下文
          const context = {
            action,
            params,
            storage: MiniAppAPI.storage,
            console: window.console,
          };

          // 将 context 暴露为全局变量供用户代码访问
          window.__miniapp_context__ = context;

          // 执行用户代码（用户代码可以直接访问 action, params, storage, console）
          // 注意：用户代码应该返回结果或使用 return 语句
          const result = await (async function() {
            const { action, params, storage, console } = window.__miniapp_context__;
            ${miniApp.code}
          })();

          // 清理全局变量
          delete window.__miniapp_context__;

          return result;
        } catch (error) {
          console.error('MiniApp invocation error:', error);
          delete window.__miniapp_context__;
          throw error;
        }
      },
    };

    // 测试函数 - 定义为全局函数
    window.showResult = function(elementId, message, isError = false) {
      const el = document.getElementById(elementId);
      el.textContent = message;
      el.className = 'result show ' + (isError ? 'error' : 'success');
      setTimeout(() => el.classList.remove('show'), 5000);
    };

    window.testStorageSet = async function() {
      try {
        const key = document.getElementById('setKey').value;
        const valueStr = document.getElementById('setValue').value;
        const value = JSON.parse(valueStr);

        const result = await MiniAppAPI.storage.set(key, value);
        showResult('setResult', '✅ 数据保存成功！键名: ' + key);
      } catch (error) {
        showResult('setResult', '❌ 保存失败: ' + error.message, true);
      }
    };

    window.testStorageGet = async function() {
      try {
        const key = document.getElementById('getKey').value;
        const result = await MiniAppAPI.storage.get(key);

        if (result) {
          showResult('getResult', '✅ 读取成功: ' + JSON.stringify(result, null, 2));
        } else {
          showResult('getResult', '⚠️ 未找到数据，键名: ' + key);
        }
      } catch (error) {
        showResult('getResult', '❌ 读取失败: ' + error.message, true);
      }
    };

    window.testStorageRemove = async function() {
      try {
        const key = document.getElementById('removeKey').value;
        await MiniAppAPI.storage.remove(key);
        showResult('removeResult', '✅ 数据删除成功！键名: ' + key);
      } catch (error) {
        showResult('removeResult', '❌ 删除失败: ' + error.message, true);
      }
    };

    window.testNotification = async function() {
      try {
        const title = document.getElementById('notifTitle').value;
        const body = document.getElementById('notifBody').value;

        await MiniAppAPI.notification.send(title, body);
        showResult('notifResult', '✅ 通知发送成功！');
      } catch (error) {
        showResult('notifResult', '❌ 发送失败: ' + error.message, true);
      }
    };

    window.testGetUserInfo = async function() {
      try {
        const userInfo = await MiniAppAPI.user.getInfo();

        if (userInfo) {
          showResult('userResult', '✅ 用户信息: ' + JSON.stringify(userInfo, null, 2));
        } else {
          showResult('userResult', '⚠️ 无法获取用户信息');
        }
      } catch (error) {
        showResult('userResult', '❌ 获取失败: ' + error.message, true);
      }
    };

    // 用户代码执行标志
    let userCodeExecuted = false;

    // 运行用户代码（支持 action 和 params 参数传递，类似 edge function）
    window.runUserCode = async function() {
      const app = document.getElementById('app');
      const actionInput = document.getElementById('codeAction');
      const paramsInput = document.getElementById('codeParams');

      try {
        // 清空之前的输出
        app.innerHTML = '';

        // 显示执行中状态
        showResult('codeResult', '⏳ 正在执行代码...', false);

        // 获取 action
        const action = actionInput.value.trim() || 'execute';

        // 解析参数
        let params = {};
        const paramsStr = paramsInput.value.trim();

        if (paramsStr) {
          try {
            params = JSON.parse(paramsStr);
          } catch (parseError) {
            params = paramsStr;
          }
        }

        // 使用 invokeMiniApp 方法执行代码
        const result = await MiniAppAPI.invokeMiniApp(action, params);

        userCodeExecuted = true;

        // 显示成功消息
        const actionInfo = 'Action: ' + action;
        const paramInfo = paramsStr ? ', Params: ' + paramsStr.substring(0, 40) + (paramsStr.length > 40 ? '...' : '') : '';
        showResult('codeResult', '✅ 代码执行成功！(' + actionInfo + paramInfo + ')', false);

        // 显示结果
        if (result !== undefined) {
          const resultDiv = document.createElement('div');
          resultDiv.style.cssText = 'margin-top: 12px; padding: 12px; background: hsl(85, 60%, 95%); border: 1px solid hsl(85, 60%, 75%); border-radius: 0.375rem; font-family: monospace; font-size: 13px;';
          resultDiv.innerHTML = '<strong>返回结果:</strong><br><pre style="margin-top: 8px; white-space: pre-wrap; word-break: break-all;">' + JSON.stringify(result, null, 2) + '</pre>';
          app.appendChild(resultDiv);
        }

        // 如果 app 区域为空，显示提示
        if (!app.innerHTML.trim()) {
          app.innerHTML = '<div style="color: var(--mango-gray-600); padding: 12px; text-align: center; font-size: 14px;">💡 代码已执行，但没有输出内容到 #app 区域</div>';
        }
      } catch (error) {
        console.error('MiniApp execution error:', error);

        // 显示错误
        showResult('codeResult', '❌ 执行失败: ' + error.message, true);

        app.innerHTML = '<div style="color: #721c24; padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;"><strong>❌ 代码执行错误:</strong><br>' + error.message + '</div>';

        window.parent.postMessage({
          id: 'error',
          type: 'EVENT',
          action: 'error',
          version: '1.0.0',
          nonce: Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
          payload: { error: error.message, stack: error.stack },
        }, '*');
      }
    };
  </script>
</body>
</html>
    `;
    };

    // 加载小应用
    useEffect(() => {
      if (!iframeRef.current) return;

      try {
        const html = createSandboxHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        iframeRef.current.src = url;
        setIsLoading(false);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Error loading miniapp:', error);
        setError('Failed to load mini app');
        setIsLoading(false);
        onError?.(error as Error);
      }
    }, [miniApp.code, miniApp.html]);

    // 暴露 API 给父组件
    React.useImperativeHandle(
      ref,
      () => ({
        sendMessage,
      }),
      [sendMessage]
    );

    if (error) {
      return (
        <div className={cn('flex items-center justify-center p-8 text-destructive', className)}>
          <div className="text-center">
            <p className="font-semibold">Error loading mini app</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('relative w-full h-full', className)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading mini app...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          title={miniApp.display_name}
        />
      </div>
    );
  }
);

MiniAppContainer.displayName = 'MiniAppContainer';
