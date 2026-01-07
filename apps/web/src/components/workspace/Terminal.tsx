/**
 * Terminal Component
 * 基于 xterm.js 的终端组件
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  deviceId?: string;
  className?: string;
}

export function Terminal({ deviceId, className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !deviceId) return;

    // 创建终端实例
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // 挂载到 DOM
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 连接 WebSocket
    connectWebSocket(xterm, deviceId);

    // 窗口大小调整
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      wsRef.current?.close();
      xterm.dispose();
    };
  }, [deviceId]);

  const connectWebSocket = async (xterm: XTerm, deviceId: string) => {
    try {
      // 获取 WebSocket URL 和认证信息
      const response = await fetch(`/api/devices/${deviceId}/terminal`);
      if (!response.ok) {
        throw new Error('Failed to get terminal connection info');
      }

      const { wsUrl, token } = await response.json();

      // 连接到设备的 WebSocket
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // 发送认证信息
        ws.send(JSON.stringify({ type: 'auth', token }));
        xterm.writeln('终端已连接');

        // 发送终端输入到服务器
        xterm.onData((data) => {
          ws.send(JSON.stringify({ type: 'input', data }));
        });
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
          xterm.write(message.data);
        }
      };

      ws.onerror = () => {
        xterm.writeln('\r\n终端连接错误');
      };

      ws.onclose = () => {
        xterm.writeln('\r\n终端连接已断开');
      };

      wsRef.current = ws;
    } catch (error) {
      xterm.writeln('\r\n无法连接到终端');
      console.error('Terminal connection error:', error);
    }
  };

  return (
    <div className={`h-full bg-[#1e1e1e] ${className}`}>
      <div ref={terminalRef} className="h-full p-2" />
    </div>
  );
}
