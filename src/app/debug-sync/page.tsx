'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Import SyncOperation type from indexeddb
type SyncOperation = {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: string
  data: any
  timestamp: number
  createdAt: string
  retries: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
}

export default function DebugSyncPage() {
  const { toast } = useToast()
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [grouped, setGrouped] = useState<Record<string, SyncOperation[]>>({})

  useEffect(() => {
    loadSyncQueue()
  }, [])

  const loadSyncQueue = async () => {
    setLoading(true)
    try {
      const { offlineDB } = await import('@/lib/indexeddb')
      const queue = await offlineDB.getSyncQueue()

      setSyncQueue(queue)

      // Agrupar por tabela e operação
      const groupedItems: Record<string, SyncQueueItem[]> = {}
      queue.forEach(item => {
        const key = `${item.table} (${item.operation})`
        if (!groupedItems[key]) {
          groupedItems[key] = []
        }
        groupedItems[key].push(item)
      })
      setGrouped(groupedItems)

    } catch (error) {
      console.error('Erro ao carregar sync queue:', error)
      toast({
        title: '❌ Erro',
        description: 'Falha ao carregar fila de sincronização',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const { offlineDB } = await import('@/lib/indexeddb')
      await offlineDB.delete('sync_queue', id)

      toast({
        title: '✅ Removido',
        description: 'Item removido da fila de sincronização'
      })

      loadSyncQueue()
    } catch (error) {
      console.error('Erro ao deletar item:', error)
      toast({
        title: '❌ Erro',
        description: 'Falha ao remover item',
        variant: 'destructive'
      })
    }
  }

  const clearAllPending = async () => {
    if (!confirm('⚠️ Tem certeza? Isso vai DELETAR todos os itens pendentes!')) return

    try {
      const { offlineDB } = await import('@/lib/indexeddb')
      const queue = await offlineDB.getSyncQueue()

      for (const item of queue) {
        if (item.status === 'pending') {
          await offlineDB.delete('sync_queue', item.id)
        }
      }

      toast({
        title: '✅ Limpo!',
        description: `${queue.length} itens pendentes foram removidos`
      })

      loadSyncQueue()
    } catch (error) {
      console.error('Erro ao limpar fila:', error)
      toast({
        title: '❌ Erro',
        description: 'Falha ao limpar fila',
        variant: 'destructive'
      })
    }
  }

  const cleanInvalidOperations = async () => {
    try {
      const { offlineDB } = await import('@/lib/indexeddb')
      const removedCount = await offlineDB.cleanInvalidSyncOperations()

      toast({
        title: '✅ Limpeza concluída!',
        description: `${removedCount} operações inválidas (companies, users) foram removidas`
      })

      loadSyncQueue()
    } catch (error) {
      console.error('Erro ao limpar operações inválidas:', error)
      toast({
        title: '❌ Erro',
        description: 'Falha ao limpar operações inválidas',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('pt-BR')
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🔍 Debug: Fila de Sincronização</h1>
        <p className="text-gray-600 mt-2">
          Visualize e gerencie os {syncQueue.length} itens na fila de sincronização
        </p>
      </div>

      {/* Resumo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📊 Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Total de Itens</div>
              <div className="text-2xl font-bold text-blue-600">{syncQueue.length}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-gray-600">Pendentes</div>
              <div className="text-2xl font-bold text-yellow-600">
                {syncQueue.filter(i => i.status === 'pending').length}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-600">Com Erro</div>
              <div className="text-2xl font-bold text-red-600">
                {syncQueue.filter(i => i.status === 'failed').length}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Tipos Únicos</div>
              <div className="text-2xl font-bold text-gray-600">
                {Object.keys(grouped).length}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <Button onClick={loadSyncQueue} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
            <Button onClick={cleanInvalidOperations} variant="secondary">
              🧹 Limpar Operações Inválidas
            </Button>
            <Button onClick={clearAllPending} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Todos Pendentes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Itens Agrupados */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([groupKey, items]) => (
          <Card key={groupKey}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{groupKey}</span>
                <Badge variant="secondary">{items.length} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg flex items-start justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          item.status === 'pending' ? 'default' :
                          item.status === 'failed' ? 'destructive' :
                          item.status === 'syncing' ? 'secondary' :
                          'outline'
                        }>
                          {item.status === 'synced' ? '✅ Sincronizado' : item.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.createdAt)}
                        </span>
                        {item.retries && item.retries > 0 && (
                          <Badge variant="outline">
                            {item.retries} tentativas
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        <strong>ID:</strong> {item.data?.id || 'N/A'}
                      </div>
                      {item.data?.projectId && (
                        <div className="text-sm text-gray-600">
                          <strong>ProjectID:</strong> {item.data.projectId}
                        </div>
                      )}
                      {item.data?.name && (
                        <div className="text-sm text-gray-600">
                          <strong>Nome:</strong> {item.data.name}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {syncQueue.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">Fila Vazia!</h3>
            <p className="text-gray-600">
              Não há itens pendentes de sincronização.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
