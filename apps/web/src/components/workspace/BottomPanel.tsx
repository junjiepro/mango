/**
 * BottomPanel Component
 * VS Code 风格的底部面板，用于终端管理
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal } from './Terminal';
import { DeviceBinding } from '@/services/DeviceService';

export interface TerminalSession {
  id: string;
  title: string;
}

interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId?: string;
  device?: DeviceBinding;
  className?: string;
  // 状态持久化
  initialTerminals?: TerminalSession[];
  initialActiveTerminalId?: string;
  onStateChange?: (terminals: TerminalSession[], activeTerminalId: string) => void;
}

export function BottomPanel({
  isOpen,
  onClose,
  deviceId,
  device,
  className = '',
  initialTerminals,
  initialActiveTerminalId,
  onStateChange,
}: BottomPanelProps) {
  const isInitializedRef = useRef(false);
  const [terminals, setTerminals] = useState<TerminalSession[]>(
    initialTerminals || [{ id: '1', title: '终端 1' }]
  );
  const [activeTerminal, setActiveTerminal] = useState(initialActiveTerminalId || '1');

  // 初始化时设置状态
  useEffect(() => {
    if (!isInitializedRef.current && initialTerminals) {
      setTerminals(initialTerminals);
      setActiveTerminal(initialActiveTerminalId || initialTerminals[0]?.id || '1');
      isInitializedRef.current = true;
    }
  }, [initialTerminals, initialActiveTerminalId]);

  // 状态变化时通知外部
  useEffect(() => {
    if (isInitializedRef.current && onStateChange) {
      onStateChange(terminals, activeTerminal);
    }
  }, [terminals, activeTerminal, onStateChange]);

  // 添加新终端
  const handleAddTerminal = () => {
    const newId = String(terminals.length + 1);
    const newTerminal: TerminalSession = {
      id: newId,
      title: `终端 ${newId}`,
    };
    setTerminals([...terminals, newTerminal]);
    setActiveTerminal(newId);
  };

  // 删除终端
  const handleRemoveTerminal = (id: string) => {
    if (terminals.length === 1) return; // 至少保留一个终端

    const newTerminals = terminals.filter((t) => t.id !== id);
    setTerminals(newTerminals);

    // 如果删除的是当前活动终端，切换到第一个
    if (activeTerminal === id && newTerminals.length > 0) {
      setActiveTerminal(newTerminals[0].id);
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full border-t bg-background ${className}`}
      style={{
        display: isOpen ? 'flex' : 'none'
      }}
    >
      <Tabs
        value={activeTerminal}
        onValueChange={setActiveTerminal}
        className="flex flex-col h-full"
      >
        {/* 标题栏和标签页 */}
        <div className="flex items-center justify-between h-10 px-2 border-b bg-muted/40">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <TabsList className="h-8 bg-transparent">
              {terminals.map((terminal) => (
                <TabsTrigger
                  key={terminal.id}
                  value={terminal.id}
                  className="h-7 px-3 text-xs data-[state=active]:bg-background"
                >
                  <span>{terminal.title}</span>
                  {terminals.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTerminal(terminal.id);
                      }}
                      className="h-4 w-4 ml-1 hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddTerminal}
              className="h-7 w-7"
              title="新建终端"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 终端内容区域 */}
        <div className="flex-1 overflow-hidden relative">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              className="absolute inset-0"
              style={{
                visibility: activeTerminal === terminal.id ? 'visible' : 'hidden',
                zIndex: activeTerminal === terminal.id ? 1 : 0,
              }}
            >
              <Terminal deviceId={deviceId} device={device} />
            </div>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
