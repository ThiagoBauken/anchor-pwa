// IndexedDB wrapper para sistema offline-first completo
import type { Company, User, Project, Location, AnchorPoint, AnchorTest } from '@/types'

interface DBSchema {
  companies: Company
  users: User & { password_hash?: string; offline_created?: boolean }
  projects: Project
  locations: Location  
  anchor_points: AnchorPoint
  anchor_tests: AnchorTest
  sync_queue: SyncOperation
  files: FileRecord
}

// Apenas essas tabelas podem ser sincronizadas via sync queue
type SyncableTable = 'anchor_points' | 'anchor_tests' | 'projects' | 'locations'

interface SyncOperation {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: SyncableTable  // CORREÇÃO: Apenas tabelas sincronizáveis
  data: any
  timestamp: number
  createdAt: string  // ISO date string for UI display
  retries: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
}

interface FileRecord {
  id: string
  filename: string
  blob: Blob
  uploaded: boolean
  url?: string
  timestamp: number
}

class OfflineDB {
  private db: IDBDatabase | null = null
  private readonly dbName = 'AnchorViewDB'
  private readonly version = 1

  async init(): Promise<void> {
    if (this.db) return
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result

        // Handle connection close events
        this.db.onclose = () => {
          console.warn('⚠️ IndexedDB connection closed unexpectedly')
          this.db = null
        }

        // Handle version change (happens when another tab updates DB)
        this.db.onversionchange = () => {
          console.warn('⚠️ IndexedDB version changed by another tab, closing connection')
          this.db?.close()
          this.db = null
        }

        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Companies store
        if (!db.objectStoreNames.contains('companies')) {
          const companiesStore = db.createObjectStore('companies', { keyPath: 'id' })
          companiesStore.createIndex('name', 'name', { unique: false })
        }

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' })
          usersStore.createIndex('email', 'email', { unique: true })
          usersStore.createIndex('companyId', 'companyId', { unique: false })
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' })
          projectsStore.createIndex('companyId', 'companyId', { unique: false })
          projectsStore.createIndex('name', 'name', { unique: false })
        }

        // Locations store
        if (!db.objectStoreNames.contains('locations')) {
          const locationsStore = db.createObjectStore('locations', { keyPath: 'id' })
          locationsStore.createIndex('companyId', 'companyId', { unique: false })
        }

        // Anchor points store
        if (!db.objectStoreNames.contains('anchor_points')) {
          const pointsStore = db.createObjectStore('anchor_points', { keyPath: 'id' })
          pointsStore.createIndex('projectId', 'projectId', { unique: false })
          pointsStore.createIndex('numeroPonto', 'numeroPonto', { unique: false })
          pointsStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        // Anchor tests store
        if (!db.objectStoreNames.contains('anchor_tests')) {
          const testsStore = db.createObjectStore('anchor_tests', { keyPath: 'id' })
          testsStore.createIndex('pontoId', 'pontoId', { unique: false })
          testsStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('status', 'status', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' })
          filesStore.createIndex('uploaded', 'uploaded', { unique: false })
        }
      }
    })
  }

  private async getStore(storeName: keyof DBSchema, mode: IDBTransactionMode = 'readonly', retryCount = 0): Promise<IDBObjectStore> {
    try {
      // If no connection or connection was closed, initialize
      if (!this.db) {
        await this.init()
      }

      // Create transaction
      const transaction = this.db!.transaction([storeName], mode)
      return transaction.objectStore(storeName)
    } catch (error: any) {
      // If database connection is closing/closed, retry once
      if (error.name === 'InvalidStateError' && retryCount === 0) {
        console.warn('⚠️ IndexedDB connection invalid, reconnecting...')
        this.db = null
        await this.init()
        return this.getStore(storeName, mode, retryCount + 1)
      }
      throw error
    }
  }

  // Generic CRUD operations
  async get<T extends keyof DBSchema>(
    storeName: T, 
    key: string
  ): Promise<DBSchema[T] | null> {
    const store = await this.getStore(storeName)
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T extends keyof DBSchema>(storeName: T): Promise<DBSchema[T][]> {
    const store = await this.getStore(storeName)
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getByIndex<T extends keyof DBSchema>(
    storeName: T,
    indexName: string,
    value: any
  ): Promise<DBSchema[T][]> {
    const store = await this.getStore(storeName)
    const index = store.index(indexName)
    return new Promise((resolve, reject) => {
      const request = index.getAll(value)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async put<T extends keyof DBSchema>(
    storeName: T,
    data: DBSchema[T],
    addToSyncQueue = true
  ): Promise<void> {
    // CORREÇÃO: Só adiciona à fila se OFFLINE
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const shouldQueue = addToSyncQueue && !isOnline && storeName !== 'sync_queue'
    const key = (data as any).id

    // ✅ CORREÇÃO DEFINITIVA: NÃO usar async no Promise constructor (anti-pattern)
    // Seguindo boas práticas do IndexedDB: transações devem ser síncronas
    const storePromise = this.getStore(storeName, 'readwrite')

    return storePromise.then((store) => {
      return new Promise<void>((resolve, reject) => {
        // ✅ Tudo acontece de forma síncrona dentro da mesma transação

        // Simplificado: assumir sempre 'update' para evitar race condition
        // O IndexedDB put() funciona tanto para create quanto update
        const operation: 'create' | 'update' = 'update'

        const putRequest = store.put({
          ...data,
          lastModified: Date.now(),
          syncStatus: shouldQueue ? 'pending' : 'synced'
        })

        putRequest.onsuccess = () => {
          // IMPORTANTE: Só adiciona à fila se OFFLINE
          if (shouldQueue) {
            // ✅ Usar operation correto (create ou update)
            this.addToSyncQueue(operation, storeName as any, data)
              .then(() => {
                if (typeof console !== 'undefined') {
                  console.log(`📱 OFFLINE: ${operation} adicionado à fila - ${storeName}`)
                }
                resolve()
              })
              .catch((error) => {
                console.error('Failed to add to sync queue:', error)
                // Don't fail the put operation if sync queue fails
                resolve()
              })
          } else {
            if (isOnline && typeof console !== 'undefined') {
              console.log(`🌐 ONLINE: ${operation} NÃO vai pra fila - ${storeName}`)
            }
            resolve()
          }
        }

        putRequest.onerror = () => {
          console.error(`Failed to put in ${String(storeName)}:`, putRequest.error)
          reject(putRequest.error)
        }
      })
    }).catch((error) => {
      console.error(`Failed to get store ${String(storeName)}:`, error)
      throw error
    })
  }

  async delete<T extends keyof DBSchema>(
    storeName: T,
    key: string,
    addToSyncQueue = true
  ): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite')
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = async () => {
        if (addToSyncQueue && storeName !== 'sync_queue') {
          await this.addToSyncQueue('delete', storeName as any, { id: key })
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Sync queue operations
  async addToSyncQueue(
    operation: SyncOperation['operation'],
    table: SyncOperation['table'],
    data: any
  ): Promise<void> {
    const now = Date.now()
    const syncOperation: SyncOperation = {
      id: `${table}_${operation}_${data.id || now}`,
      operation,
      table,
      data,
      timestamp: now,
      createdAt: new Date(now).toISOString(),  // Add ISO string for UI
      retries: 0,
      status: 'pending'
    }

    await this.put('sync_queue', syncOperation, false)
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    return this.getByIndex('sync_queue', 'status', 'pending')
  }

  async updateSyncStatus(id: string, status: SyncOperation['status']): Promise<void> {
    const operation = await this.get('sync_queue', id)
    if (operation) {
      await this.put('sync_queue', { ...operation, status }, false)
    }
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return this.getAll('companies')
  }

  async createCompany(company: Company): Promise<void> {
    await this.put('companies', {
      ...company,
      // offline_created: true,
      createdAt: new Date().toISOString()
    } as any)
  }

  // User operations (with offline authentication)
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const users = await this.getByIndex('users', 'email', email)
      if (users.length === 0) return null

      const user = users[0] as User & { password_hash?: string; password?: string }
      
      // Check both password formats for backwards compatibility
      const expectedHash = this.simpleHash(password)
      const isValidPassword = user.password_hash === expectedHash || user.password === password
      
      if (isValidPassword) {
        // Return clean user object without password fields
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          active: user.active,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        } as User
      }
      
      return null
    } catch (error) {
      console.error('Authentication error:', error)
      return null
    }
  }

  async createUser(user: User & { password: string }): Promise<void> {
    const { password, ...userData } = user
    await this.put('users', {
      ...userData,
      password_hash: this.simpleHash(password),
      // offline_created: true,
      createdAt: new Date().toISOString()
    } as any)
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return this.getByIndex('users', 'companyId', companyId)
  }

  // Project operations
  async getProjectsByCompany(companyId: string): Promise<Project[]> {
    const allProjects = await this.getByIndex('projects', 'companyId', companyId)
    // CRITICAL: Filter out deleted projects to prevent them from reappearing
    return allProjects.filter((p: any) => !p.deleted)
  }

  async createProject(project: Project): Promise<void> {
    await this.put('projects', {
      ...project,
      // offline_created: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any)
  }

  // Location operations
  async getLocationsByCompany(companyId: string): Promise<Location[]> {
    return this.getByIndex('locations', 'companyId', companyId)
  }

  // Anchor points operations
  async getPointsByProject(projectId: string): Promise<AnchorPoint[]> {
    return this.getByIndex('anchor_points', 'projectId', projectId)
  }

  async createPoint(point: AnchorPoint): Promise<void> {
    await this.put('anchor_points', {
      ...point,
      offlineCreated: true,
      dataHora: new Date().toISOString()
    } as any, true) // Add to sync queue as 'create'

    if (typeof console !== 'undefined') {
      console.log(`✨ Point creation queued for sync: ${point.numeroPonto}`)
    }
  }

  async updatePoint(point: AnchorPoint): Promise<void> {
    // Update in IndexedDB
    await this.put('anchor_points', {
      ...point,
      lastSyncedAt: new Date().toISOString()
    }, false) // Don't auto-add to sync queue as 'create'

    // Add to sync queue as 'update' operation
    await this.addToSyncQueue('update', 'anchor_points', point)

    if (typeof console !== 'undefined') {
      console.log(`📝 Point update queued for sync: ${point.id}`)
    }
  }

  // Anchor tests operations
  async getTestsByPoint(pontoId: string): Promise<AnchorTest[]> {
    return this.getByIndex('anchor_tests', 'pontoId', pontoId)
  }

  async createTest(test: AnchorTest): Promise<void> {
    await this.put('anchor_tests', {
      ...test,
      offlineCreated: true,
      dataHora: new Date().toISOString()
    }, true) // Add to sync queue as 'create'

    if (typeof console !== 'undefined') {
      console.log(`✨ Test creation queued for sync: ${test.resultado}`)
    }
  }

  async updateTest(test: AnchorTest): Promise<void> {
    // Update in IndexedDB
    await this.put('anchor_tests', {
      ...test,
      lastSyncAt: new Date().toISOString()
    }, false) // Don't auto-add to sync queue as 'create'

    // Add to sync queue as 'update' operation
    await this.addToSyncQueue('update', 'anchor_tests', test)

    if (typeof console !== 'undefined') {
      console.log(`📝 Test update queued for sync: ${test.id}`)
    }
  }

  // File operations
  async storeFile(id: string, filename: string, blob: Blob): Promise<void> {
    const fileRecord: FileRecord = {
      id,
      filename,
      blob,
      uploaded: false,
      timestamp: Date.now()
    }
    await this.put('files', fileRecord, false)
  }

  async getFile(id: string): Promise<FileRecord | null> {
    return this.get('files', id)
  }

  async getPendingFiles(): Promise<FileRecord[]> {
    return this.getByIndex('files', 'uploaded', false)
  }

  // Utility functions
  private simpleHash(password: string): string {
    // Simple hash for offline mode - in production use bcrypt
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  // Clear all data (for logout/reset)
  async clearAllData(): Promise<void> {
    if (!this.db) return
    
    const storeNames: (keyof DBSchema)[] = [
      'companies', 'users', 'projects', 'locations', 
      'anchor_points', 'anchor_tests', 'sync_queue', 'files'
    ]
    
    const transaction = this.db.transaction(storeNames, 'readwrite')
    
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName)
      store.clear()
    }
  }

  // Get database stats
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {}

    const storeNames: (keyof DBSchema)[] = [
      'companies', 'users', 'projects', 'locations',
      'anchor_points', 'anchor_tests', 'sync_queue', 'files'
    ]

    for (const storeName of storeNames) {
      const data = await this.getAll(storeName)
      stats[storeName] = data.length
    }

    return stats
  }

  // Clean invalid operations from sync queue
  async cleanInvalidSyncOperations(): Promise<number> {
    const validTables: SyncableTable[] = ['anchor_points', 'anchor_tests', 'projects', 'locations']
    const queue = await this.getAll('sync_queue')

    let removedCount = 0
    let fixedCount = 0

    for (const operation of queue) {
      // Remove se a tabela não está na lista de tabelas válidas
      if (!validTables.includes(operation.table as SyncableTable)) {
        await this.delete('sync_queue', operation.id, false)
        removedCount++
        if (typeof console !== 'undefined') {
          console.log(`🗑️ Removed invalid sync operation: ${operation.table} - ${operation.id}`)
        }
      }
      // Fix operations missing createdAt field
      else if (!operation.createdAt && operation.timestamp) {
        const fixedOp = {
          ...operation,
          createdAt: new Date(operation.timestamp).toISOString()
        }
        await this.put('sync_queue', fixedOp, false)
        fixedCount++
        if (typeof console !== 'undefined') {
          console.log(`🔧 Fixed sync operation missing createdAt: ${operation.id}`)
        }
      }
    }

    if (typeof console !== 'undefined') {
      if (removedCount > 0) {
        console.log(`✅ Cleaned ${removedCount} invalid operations from sync queue`)
      }
      if (fixedCount > 0) {
        console.log(`✅ Fixed ${fixedCount} operations missing createdAt field`)
      }
    }

    return removedCount
  }
}

// Singleton instance
export const offlineDB = new OfflineDB()

// Initialize on import (only in browser)
if (typeof window !== 'undefined') {
  offlineDB.init().catch(console.error)
}

export default offlineDB