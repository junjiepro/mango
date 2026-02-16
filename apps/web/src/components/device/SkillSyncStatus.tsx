'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';

interface SyncStatus {
  lastSyncAt: string | null;
  skillCount: number;
  status: 'synced' | 'pending' | 'error';
}

interface SkillSyncStatusProps {
  deviceId: string;
  deviceUrl: string;
}

export function SkillSyncStatus({ deviceId, deviceUrl }: SkillSyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${deviceUrl}/skills`);
      const data = await res.json();
      setStatus({
        lastSyncAt: data.lastSyncAt,
        skillCount: data.skills?.length || 0,
        status: 'synced',
      });
    } catch {
      setStatus({ lastSyncAt: null, skillCount: 0, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [deviceUrl]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${deviceUrl}/skills/sync`, { method: 'POST' });
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Skill 同步状态</CardTitle>
          <StatusBadge status={status?.status || 'error'} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">已缓存:</span>{' '}
          {status?.skillCount || 0} 个 Skill
        </div>
        {status?.lastSyncAt && (
          <div className="text-sm">
            <span className="text-muted-foreground">上次同步:</span>{' '}
            {new Date(status.lastSyncAt).toLocaleString()}
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCwIcon className={`size-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '同步中...' : '立即同步'}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'synced') {
    return (
      <Badge variant="outline" className="text-green-600">
        <CheckCircleIcon className="size-3 mr-1" />
        已同步
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-red-600">
      <AlertCircleIcon className="size-3 mr-1" />
      未同步
    </Badge>
  );
}
