'use client';

import { useState, useCallback } from 'react';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

export function useMiniAppManager() {
  const [miniAppDialogOpen, setMiniAppDialogOpen] = useState(false);
  const [selectedMiniApp, setSelectedMiniApp] = useState<{
    miniApp: MiniApp;
    installation: MiniAppInstallation;
  } | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);

  const loadInstallations = useCallback(async () => {
    setLoadingInstallations(true);
    try {
      const response = await fetch('/api/miniapps/installations');
      const result = await response.json();
      if (result.success) {
        setInstallations(result.data);
      }
    } catch (error) {
      console.error('Failed to load installations:', error);
    } finally {
      setLoadingInstallations(false);
    }
  }, []);

  const handleOpenMiniAppSelector = useCallback(() => {
    loadInstallations();
    setMiniAppDialogOpen(true);
  }, [loadInstallations]);

  const handleSelectMiniApp = useCallback((installation: any) => {
    setSelectedMiniApp({
      miniApp: installation.mini_app,
      installation,
    });
    setMiniAppDialogOpen(false);
  }, []);

  const handleOpenMiniApp = useCallback((miniApp: MiniApp, installation: MiniAppInstallation) => {
    setSelectedMiniApp({ miniApp, installation });
  }, []);

  return {
    miniAppDialogOpen,
    setMiniAppDialogOpen,
    selectedMiniApp,
    setSelectedMiniApp,
    installations,
    loadingInstallations,
    loadInstallations,
    handleOpenMiniAppSelector,
    handleSelectMiniApp,
    handleOpenMiniApp,
  };
}
