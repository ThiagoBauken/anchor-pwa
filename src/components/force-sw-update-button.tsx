"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ForceSwUpdateButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const forceUpdate = async () => {
    setIsUpdating(true);

    try {
      // 1. Desregistrar Service Workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // 2. Limpar todos os caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }

      toast({
        title: '✅ Service Worker atualizado',
        description: 'Recarregando página em 2 segundos...',
      });

      // 3. Recarregar página com hard refresh
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
      toast({
        variant: 'destructive',
        title: '❌ Erro',
        description: 'Falha ao atualizar Service Worker. Tente recarregar manualmente (Ctrl+Shift+R).',
      });
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={forceUpdate}
      disabled={isUpdating}
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
      {isUpdating ? 'Atualizando...' : 'Atualizar Cache'}
    </Button>
  );
}
