'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('devices');
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
    return <div className="text-sm text-muted-foreground">{t('skillSyncStatus.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('skillSyncStatus.title')}</CardTitle>
          <StatusBadge status={status?.status || 'error'} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">{t('skillSyncStatus.cached')}</span>{' '}
          {status?.skillCount || 0} {t('skillSyncStatus.skills')}
        </div>
        {status?.lastSyncAt && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('skillSyncStatus.lastSync')}</span>{' '}
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
          {syncing ? t('skillSyncStatus.syncing') : t('skillSyncStatus.syncNow')}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('devices');
  if (status === 'synced') {
    return (
      <Badge variant="outline" className="text-green-600">
        <CheckCircleIcon className="size-3 mr-1" />
        {t('skillSyncStatus.synced')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-red-600">
      <AlertCircleIcon className="size-3 mr-1" />
      {t('skillSyncStatus.notSynced')}
    </Badge>
  );
}
