'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Database,
  Wifi,
  WifiOff,
  Download,
  Settings
} from 'lucide-react'
import { hybridDataManager } from '@/lib/hybrid-data-manager'
import { syncManager } from '@/lib/sync-manager'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function PwaControlPanel() {
  const { toast } = useToast()

  // Status do Service Worker
  const [swStatus, setSwStatus] = useState<'active' | 'waiting' | 'installing' | 'none'>('none')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Status de dados
  const [pendingItems, setPendingItems] = useState(0)
  const [cacheSize, setCacheSize] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false)

  // Load initial data
  useEffect(() => {
    loadStatus()
    checkForUpdates()

    // Online/offline detection
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Load current status
   */
  const loadStatus = async () => {
    try {
      // Pending items
      const pending = await hybridDataManager.getTotalPendingItems()
      setPendingItems(pending.total)

      // Cache size
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        setCacheSize(estimate.usage || 0)
      }
    } catch (error) {
      console.error('Error loading status:', error)
    }
  }

  /**
   * Check for Service Worker updates
   */
  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        setSwRegistration(registration)

        // Check SW state
        if (registration.active) {
          setSwStatus('active')
        } else if (registration.installing) {
          setSwStatus('installing')
        } else if (registration.waiting) {
          setSwStatus('waiting')
          setUpdateAvailable(true)
        }

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
                setSwStatus('waiting')
                toast({
                  title: '🔄 Atualização Disponível',
                  description: 'Uma nova versão do app está pronta.',
                })
              }
            })
          }
        })
      } catch (error) {
        console.error('Error checking for updates:', error)
        setSwStatus('none')
      }
    }
  }

  /**
   * Force update Service Worker
   */
  const updateServiceWorker = async () => {
    if (!swRegistration) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Service Worker não encontrado.',
      })
      return
    }

    try {
      setIsLoading(true)

      // Send message to SW to skipWaiting
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // Reload page
      window.location.reload()
    } catch (error) {
      console.error('Error updating SW:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o Service Worker.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sync pending items before clearing cache
   */
  const syncBeforeClear = async () => {
    if (!isOnline) {
      toast({
        variant: 'destructive',
        title: 'Sem conexão',
        description: 'Conecte-se à internet para sincronizar.',
      })
      return
    }

    try {
      setIsLoading(true)
      const result = await syncManager.syncNow()

      if (result.success) {
        toast({
          title: '✅ Sincronizado',
          description: result.message,
        })

        // Reload status
        await loadStatus()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro na sincronização',
          description: result.message,
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao sincronizar dados.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Clear all caches and reload
   */
  const clearCacheAndReload = async () => {
    setShowClearConfirm(false)

    try {
      setIsLoading(true)

      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))

        toast({
          title: '🗑️ Cache Limpo',
          description: 'Todos os caches foram removidos. Recarregando...',
        })

        // Reload page
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível limpar o cache.',
      })
      setIsLoading(false)
    }
  }

  /**
   * Unregister Service Worker (full reset)
   */
  const unregisterServiceWorker = async () => {
    setShowUnregisterConfirm(false)

    if ('serviceWorker' in navigator) {
      try {
        setIsLoading(true)

        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))

        // Clear caches
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))

        toast({
          title: '⚙️ Service Worker Desregistrado',
          description: 'PWA completamente resetado. Recarregando...',
        })

        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('Error unregistering SW:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível desregistrar o Service Worker.',
        })
        setIsLoading(false)
      }
    }
  }

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Controle do PWA
          </CardTitle>
          <CardDescription>
            Gerenciar cache, atualizações e sincronização
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Worker Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Service Worker</span>
                <Badge variant={swStatus === 'active' ? 'default' : 'secondary'}>
                  {swStatus === 'active' && '✓ Ativo'}
                  {swStatus === 'waiting' && '⏳ Aguardando'}
                  {swStatus === 'installing' && '⚙️ Instalando'}
                  {swStatus === 'none' && '❌ Inativo'}
                </Badge>
              </div>
              {updateAvailable && (
                <p className="text-xs text-yellow-600">
                  Nova versão disponível
                </p>
              )}
            </div>

            {/* Network Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Conexão</span>
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            {/* Cache Size */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Cache</span>
                <Database className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(cacheSize)}
              </p>
            </div>
          </div>

          {/* Pending Items Warning */}
          {pendingItems > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{pendingItems} itens pendentes</strong> aguardando sincronização.
                Sincronize antes de limpar o cache para não perder dados.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Update Available */}
            {updateAvailable && (
              <Button
                onClick={updateServiceWorker}
                className="w-full"
                variant="default"
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar para Nova Versão
              </Button>
            )}

            {/* Sync First */}
            {pendingItems > 0 && isOnline && (
              <Button
                onClick={syncBeforeClear}
                className="w-full"
                variant="secondary"
                disabled={isLoading}
              >
                <Download className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Sincronizar Agora ({pendingItems} itens)
              </Button>
            )}

            {/* Clear Cache */}
            <Button
              onClick={() => setShowClearConfirm(true)}
              className="w-full"
              variant={pendingItems > 0 ? 'outline' : 'destructive'}
              disabled={isLoading || (pendingItems > 0 && !isOnline)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Cache e Reiniciar
            </Button>

            {/* Advanced: Unregister SW */}
            <details className="pt-4 border-t">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Opções Avançadas
              </summary>
              <div className="mt-3 space-y-2">
                <Button
                  onClick={() => setShowUnregisterConfirm(true)}
                  variant="ghost"
                  className="w-full"
                  disabled={isLoading}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Desregistrar Service Worker (Reset Total)
                </Button>
              </div>
            </details>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p>💡 <strong>Limpar Cache:</strong> Remove cache do navegador. Útil para resolver bugs.</p>
            <p>⚠️ <strong>Reset Total:</strong> Remove completamente o PWA. Use apenas se tiver problemas graves.</p>
          </div>
        </CardContent>
      </Card>

      {/* Clear Cache Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Cache e Reiniciar?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingItems > 0 ? (
                <div className="space-y-2">
                  <p className="text-yellow-600 font-medium">
                    ⚠️ Atenção: Você tem {pendingItems} itens não sincronizados!
                  </p>
                  <p>
                    Se continuar sem sincronizar, esses dados podem ser perdidos.
                    Recomendamos sincronizar antes de limpar o cache.
                  </p>
                </div>
              ) : (
                <p>
                  Isso vai remover todos os caches do navegador e recarregar o app.
                  Seus dados sincronizados não serão afetados.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {pendingItems > 0 ? (
              <AlertDialogAction onClick={syncBeforeClear} className="bg-blue-600">
                Sincronizar Primeiro
              </AlertDialogAction>
            ) : null}
            <AlertDialogAction
              onClick={clearCacheAndReload}
              className={pendingItems > 0 ? 'bg-destructive' : ''}
            >
              {pendingItems > 0 ? 'Limpar Mesmo Assim' : 'Limpar Cache'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unregister SW Confirmation */}
      <AlertDialog open={showUnregisterConfirm} onOpenChange={setShowUnregisterConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desregistrar Service Worker?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p className="text-destructive font-medium">
                  ⚠️ Esta é uma ação drástica!
                </p>
                <p>
                  Isso vai:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Desregistrar completamente o Service Worker</li>
                  <li>Remover todos os caches</li>
                  <li>Desabilitar funcionamento offline</li>
                  <li>Recarregar o app do zero</li>
                </ul>
                <p className="mt-2">
                  Use apenas se estiver com problemas graves que não foram resolvidos limpando o cache.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={unregisterServiceWorker}
              className="bg-destructive"
            >
              Sim, Desregistrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
