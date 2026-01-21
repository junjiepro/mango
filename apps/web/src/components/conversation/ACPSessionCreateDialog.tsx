/**
 * ACP Session Create Dialog
 * ACP 会话创建对话框
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ACPAgent } from '@/hooks/useACPSession';

interface ACPSessionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAgents: ACPAgent[];
  onCreateSession: (agent: ACPAgent, envVars: Record<string, string>) => Promise<void>;
}

export function ACPSessionCreateDialog({
  open,
  onOpenChange,
  availableAgents,
  onCreateSession,
}: ACPSessionCreateDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<ACPAgent | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');

  // 当选择agent时,初始化推荐的环境变量
  useEffect(() => {
    if (selectedAgent?.env) {
      const initialEnv: Record<string, string> = {};
      selectedAgent.env.forEach((envConfig) => {
        initialEnv[envConfig.key] = '';
      });
      setEnvVars(initialEnv);
      setJsonInput(JSON.stringify(initialEnv, null, 2));
      setJsonError(null);
    }
  }, [selectedAgent]);

  // 当表单模式的envVars变化时,同步到JSON
  useEffect(() => {
    if (editMode === 'form') {
      setJsonInput(JSON.stringify(envVars, null, 2));
    }
  }, [envVars, editMode]);

  // 处理JSON输入变化
  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        setEnvVars(parsed);
        setJsonError(null);
      } else {
        setJsonError('环境变量必须是一个对象');
      }
    } catch (error) {
      setJsonError('JSON 格式错误');
    }
  };

  const handleCreate = async () => {
    if (!selectedAgent) return;

    setLoading(true);
    try {
      await onCreateSession(selectedAgent, envVars);
      onOpenChange(false);
      setSelectedAgent(null);
      setEnvVars({});
    } catch (error) {
      console.error('Failed to create ACP session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建 ACP 会话</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>选择 Agent</Label>
            <Select
              value={selectedAgent?.name}
              onValueChange={(name) => {
                const agent = availableAgents.find((a) => a.name === name);
                setSelectedAgent(agent || null);
                setEnvVars({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择一个 Agent" />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.name} value={agent.name}>
                    <div className="flex items-center gap-2">
                      {agent.meta?.icon && <span>{agent.meta.icon}</span>}
                      <span>{agent.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent?.meta?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedAgent.meta.description}
              </p>
            )}
          </div>

          {/* 环境变量配置 */}
          {selectedAgent && (
            <div className="space-y-2">
              <Label>环境变量</Label>
              <Tabs value={editMode} onValueChange={(v) => setEditMode(v as 'form' | 'json')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="form">表单模式</TabsTrigger>
                  <TabsTrigger value="json">JSON 模式</TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="space-y-3 mt-3">
                  {selectedAgent.env && selectedAgent.env.length > 0 ? (
                    selectedAgent.env.map((envConfig) => (
                      <div key={envConfig.key} className="space-y-1">
                        <Label className="text-sm">
                          {envConfig.key}
                          {envConfig.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {envConfig.description && (
                          <p className="text-xs text-muted-foreground">{envConfig.description}</p>
                        )}
                        <Input
                          type={envConfig.key.includes('KEY') || envConfig.key.includes('SECRET') ? 'password' : 'text'}
                          placeholder={`输入 ${envConfig.key}`}
                          value={envVars[envConfig.key] || ''}
                          onChange={(e) =>
                            setEnvVars((prev) => ({
                              ...prev,
                              [envConfig.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">该 Agent 没有推荐的环境变量</p>
                  )}
                </TabsContent>

                <TabsContent value="json" className="space-y-2 mt-3">
                  <Textarea
                    value={jsonInput}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder='{"KEY": "value"}'
                    className="font-mono text-sm min-h-[200px]"
                  />
                  {jsonError && (
                    <p className="text-sm text-destructive">{jsonError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    直接编辑 JSON 格式的环境变量,支持添加自定义变量
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!selectedAgent || loading || !!jsonError}
            className="w-full"
          >
            {loading ? '创建中...' : '创建会话'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
