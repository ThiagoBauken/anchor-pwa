/**
 * SINCRONIZAÇÃO IMEDIATA - SEM FILA
 *
 * Sistema simplificado que:
 * - Online: Salva direto no PostgreSQL
 * - Offline: Salva local com flag needsSync=true
 * - Auto-sync quando volta online
 */

import type { AnchorPoint, AnchorTest, Project } from '@/types'

class ImmediateSyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private syncInProgress = false

  constructor() {
    if (typeof window !== 'undefined') {
      // Detecta quando volta online
      window.addEventListener('online', () => {
        this.isOnline = true
        console.log('🌐 Online detectado - iniciando auto-sync')
        this.autoSyncAll()
      })

      window.addEventListener('offline', () => {
        this.isOnline = false
        console.log('📱 Offline detectado')
      })
    }
  }

  /**
   * Sincroniza ponto de ancoragem
   */
  async syncPoint(point: AnchorPoint): Promise<boolean> {
    if (!this.isOnline) {
      console.log('📱 Offline - salvando ponto localmente')
      this.savePointLocally(point, true)
      return false
    }

    try {
      console.log('🌐 Online - salvando ponto no servidor')

      // Salvar direto no servidor
      const { addAnchorPoint, updateAnchorPoint } = await import('@/app/actions/anchor-actions')
      const { DataAdapter } = await import('./type-adapters')

      const prismaData = DataAdapter.anchorPointLocalStorageToPrisma(point)

      if (point.offlineCreated) {
        // É um ponto novo criado offline
        // Remove campos que addAnchorPoint espera que sejam omitidos
        const { id, dataHora, status, createdByUserId, lastModifiedByUserId, archived, ...pointDataWithoutOmitted } = prismaData

        // addAnchorPoint aceita 1 parâmetro obrigatório e usa user autenticado internamente
        await addAnchorPoint(pointDataWithoutOmitted)
      } else {
        // É um update - updateAnchorPoint aceita Partial<AnchorPoint>, então OK
        await updateAnchorPoint(point.id, prismaData)
      }

      // Salva local SEM flag de needsSync
      this.savePointLocally(point, false)

      console.log('✅ Ponto sincronizado com sucesso')
      return true

    } catch (error) {
      console.error('❌ Erro ao sincronizar ponto:', error)
      // Se falhar, salva local COM flag de needsSync
      this.savePointLocally(point, true)
      return false
    }
  }

  /**
   * Sincroniza teste
   */
  async syncTest(test: AnchorTest): Promise<boolean> {
    if (!this.isOnline) {
      console.log('📱 Offline - salvando teste localmente')
      this.saveTestLocally(test, true)
      return false
    }

    try {
      console.log('🌐 Online - salvando teste no servidor')

      const { addAnchorTest } = await import('@/app/actions/anchor-actions')
      const { DataAdapter } = await import('./type-adapters')

      const prismaData = DataAdapter.anchorTestLocalStorageToPrisma(test)

      // Remove id e dataHora, pois addAnchorTest espera Omit<AnchorTest, 'id' | 'dataHora'>
      const { id, dataHora, ...testDataWithoutIdAndDate } = prismaData

      // addAnchorTest só aceita 1 parâmetro e usa user autenticado internamente
      await addAnchorTest(testDataWithoutIdAndDate)

      // Salva local SEM flag de needsSync
      this.saveTestLocally(test, false)

      console.log('✅ Teste sincronizado com sucesso')
      return true

    } catch (error) {
      console.error('❌ Erro ao sincronizar teste:', error)
      this.saveTestLocally(test, true)
      return false
    }
  }

  /**
   * Auto-sync de TUDO quando volta online
   */
  async autoSyncAll(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⏳ Sync já em andamento, aguardando...')
      return
    }

    this.syncInProgress = true
    console.log('🔄 Iniciando auto-sync de itens pendentes...')

    try {
      // Sync pontos pendentes
      const points = this.getPendingPoints()
      console.log(`📍 Encontrados ${points.length} pontos pendentes`)

      for (const point of points) {
        await this.syncPoint(point)
      }

      // Sync testes pendentes
      const tests = this.getPendingTests()
      console.log(`🧪 Encontrados ${tests.length} testes pendentes`)

      for (const test of tests) {
        await this.syncTest(test)
      }

      console.log('✅ Auto-sync completo!')

    } catch (error) {
      console.error('❌ Erro no auto-sync:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Conta itens pendentes de sincronização
   */
  getPendingCount(): { points: number; tests: number; total: number } {
    const points = this.getPendingPoints()
    const tests = this.getPendingTests()

    return {
      points: points.length,
      tests: tests.length,
      total: points.length + tests.length
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS - localStorage
  // ==========================================

  private savePointLocally(point: AnchorPoint, needsSync: boolean): void {
    try {
      const stored = localStorage.getItem('anchorViewPoints')
      const points: AnchorPoint[] = stored ? JSON.parse(stored) : []

      const index = points.findIndex(p => p.id === point.id)

      const updatedPoint = {
        ...point,
        syncStatus: needsSync ? 'pending' : 'synced'
      } as AnchorPoint

      if (index >= 0) {
        points[index] = updatedPoint
      } else {
        points.push(updatedPoint)
      }

      localStorage.setItem('anchorViewPoints', JSON.stringify(points))
    } catch (error) {
      console.error('Erro ao salvar ponto localmente:', error)
    }
  }

  private saveTestLocally(test: AnchorTest, needsSync: boolean): void {
    try {
      const stored = localStorage.getItem('anchorViewTests')
      const tests: AnchorTest[] = stored ? JSON.parse(stored) : []

      const index = tests.findIndex(t => t.id === test.id)

      const updatedTest = {
        ...test,
        syncStatus: needsSync ? 'pending' : 'synced'
      } as AnchorTest

      if (index >= 0) {
        tests[index] = updatedTest
      } else {
        tests.push(updatedTest)
      }

      localStorage.setItem('anchorViewTests', JSON.stringify(tests))
    } catch (error) {
      console.error('Erro ao salvar teste localmente:', error)
    }
  }

  private getPendingPoints(): AnchorPoint[] {
    try {
      const stored = localStorage.getItem('anchorViewPoints')
      if (!stored) return []

      const points: AnchorPoint[] = JSON.parse(stored)
      return points.filter(p => p.syncStatus === 'pending')
    } catch {
      return []
    }
  }

  private getPendingTests(): AnchorTest[] {
    try {
      const stored = localStorage.getItem('anchorViewTests')
      if (!stored) return []

      const tests: AnchorTest[] = JSON.parse(stored)
      return tests.filter(t => t.syncStatus === 'pending')
    } catch {
      return []
    }
  }
}

// Singleton instance
export const immediateSyncManager = new ImmediateSyncManager()
