/**
 * Terminal Component
 * 基于 xterm.js 的终端组件
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { DeviceBinding } from '@/services/DeviceService';
import { useDeviceClient } from '@/hooks/useDeviceClient';

interface TerminalProps {
  deviceId?: string;
  device?: DeviceBinding;
  className?: string;
}

export function Terminal({ deviceId, device, className }: TerminalProps) {
  const t = useTranslations('workspace');
  const { client, isReady } = useDeviceClient(device);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !deviceId || !client) return;

    // 创建终端实例
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      scrollback: 1000,
      disableStdin: false,
      convertEol: true,
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // 挂载到 DOM
    xterm.open(terminalRef.current);

    // 延迟调用 fit 以确保容器已渲染
    setTimeout(() => {
      fitAddon.fit();
      // 发送终端大小到后端
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows,
        }));
      }
    }, 100);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 连接 WebSocket
    connectWebSocket(xterm, deviceId);

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      // 只有在容器有有效尺寸时才调用 fit
      if (terminalRef.current) {
        const { offsetWidth, offsetHeight } = terminalRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          fitAddon.fit();
          // 发送新的终端大小到后端
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'resize',
              cols: xterm.cols,
              rows: xterm.rows,
            }));
          }
        }
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      wsRef.current?.close();
      xterm.dispose();
    };
  }, [deviceId, client]);

  const connectWebSocket = async (xterm: XTerm, deviceId: string) => {
    if (!client) return;

    try {
      // 使用 client 获取 WebSocket URL 和认证信息
      const wsUrl = client.terminal.getWebSocketUrl();
      const token = client.terminal.getAuthToken();

      // 连接到设备的 WebSocket
      const ws = new WebSocket(wsUrl);

      // 提前注册键盘输入监听器，确保用户输入能被捕获
      xterm.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      ws.onopen = () => {
        // 发送认证信息
        ws.send(JSON.stringify({ type: 'auth', token }));

        // 认证后立即发送终端尺寸
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: xterm.cols,
            rows: xterm.rows,
          }));
        }, 100);

        xterm.writeln(t('terminal.connected'));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
          xterm.write(message.data);
        }
      };

      ws.onerror = () => {
        xterm.writeln('\r\n' + t('terminal.connectionError'));
      };

      ws.onclose = () => {
        xterm.writeln('\r\n' + t('terminal.disconnected'));
      };

      wsRef.current = ws;
    } catch (error) {
      xterm.writeln('\r\n' + t('terminal.cannotConnect'));
      console.error('Terminal connection error:', error);
    }
  };

  return (
    <div className={`h-full w-full bg-[#1e1e1e] overflow-hidden ${className}`}>
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}
