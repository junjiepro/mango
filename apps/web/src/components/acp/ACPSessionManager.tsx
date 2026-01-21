/**
 * ACP Session Manager Component
 * 管理多个 ACP 会话的创建、切换和删除
 */

'use client';

import { useState, useEffect } from 'react';
import { useACPSession, type ACPAgent } from '@/hooks/useACPSession';
import { ACPChat } from './ACPChat';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface ACPSessionManagerProps {
  deviceId: string;
  availableAgents: ACPAgent[];
}

export function ACPSessionManager({ deviceId, availableAgents }: ACPSessionManagerProps) {
  const { sessions, loading, error, createSession, fetchSessions, deleteSession } =
    useACPSession(deviceId);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ACPAgent | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async () => {
    if (!selectedAgent) return;

    try {
      const sessionId = await createSession(selectedAgent, envVars);
      setActiveSessionId(sessionId);
      setIsCreateDialogOpen(false);
      setEnvVars({});
      await fetchSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(sessions[0]?.sessionId || null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">ACP Sessions</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create ACP Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select
                  value={selectedAgent?.name}
                  onValueChange={(name) => {
                    const agent = availableAgents.find((a) => a.name === name);
                    setSelectedAgent(agent || null);
                    setEnvVars({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.name} value={agent.name}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAgent?.env && selectedAgent.env.length > 0 && (
                <div className="space-y-2">
                  <Label>Environment Variables</Label>
                  {selectedAgent.env.map((envConfig) => (
                    <div key={envConfig.key} className="space-y-1">
                      <Label className="text-sm">
                        {envConfig.key}
                        {envConfig.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        type={envConfig.key.includes('KEY') ? 'password' : 'text'}
                        placeholder={envConfig.description}
                        value={envVars[envConfig.key] || ''}
                        onChange={(e) =>
                          setEnvVars((prev) => ({
                            ...prev,
                            [envConfig.key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleCreateSession}
                disabled={!selectedAgent || loading}
                className="w-full"
              >
                Create Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10">
          Error: {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>No active sessions. Create one to get started.</p>
        </div>
      ) : (
        <Tabs
          value={activeSessionId || sessions[0]?.sessionId}
          onValueChange={setActiveSessionId}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full justify-start border-b rounded-none">
            {sessions.map((session) => (
              <div key={session.sessionId} className="flex items-center">
                <TabsTrigger value={session.sessionId}>
                  {session.agent.command}
                </TabsTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDeleteSession(session.sessionId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </TabsList>

          {sessions.map((session) => (
            <TabsContent
              key={session.sessionId}
              value={session.sessionId}
              className="flex-1 m-0"
            >
              <ACPChat
                deviceId={deviceId}
                sessionId={session.sessionId}
                agentName={session.agent.command}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
