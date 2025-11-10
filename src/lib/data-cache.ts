/**
 * Cache simples para evitar múltiplas chamadas duplicadas ao banco
 *
 * Problema: AnchorDataContext e OfflineDataContext estavam chamando
 * getProjectsForCompany() múltiplas vezes (15+ chamadas!)
 *
 * Solução: Cache com TTL de 5 minutos
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresIn: number
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>() // ✅ CORREÇÃO: Promise deduplication
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.expiresIn) {
      // Expirou
      this.cache.delete(key)
      return null
    }

    console.log(`🎯 [CACHE HIT] ${key}`)
    return entry.data
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl
    })
    console.log(`💾 [CACHE SET] ${key} (TTL: ${ttl}ms)`)
  }

  /**
   * Clear specific key
   */
  clear(key: string): void {
    this.cache.delete(key)
    this.pendingRequests.delete(key) // ✅ CORREÇÃO: Limpar pending também
    console.log(`🗑️ [CACHE CLEAR] ${key}`)
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear()
    this.pendingRequests.clear() // ✅ CORREÇÃO: Limpar pending também
    console.log(`🗑️ [CACHE CLEAR ALL]`)
  }

  /**
   * ✅ CORREÇÃO: Get or fetch data com promise deduplication
   *
   * Se múltiplos contextos chamarem ao mesmo tempo, apenas 1 chamada real será feita
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // 1. Check cache first
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 2. ✅ Check if request is already pending (NOVO!)
    const pending = this.pendingRequests.get(key)
    if (pending) {
      console.log(`⏳ [PENDING REQUEST] ${key} - waiting for in-flight request...`)
      return pending as Promise<T>
    }

    // 3. Start new request
    console.log(`🔍 [CACHE MISS] ${key} - fetching...`)
    const promise = fetchFn()
      .then((data) => {
        this.set(key, data, ttl)
        this.pendingRequests.delete(key) // ✅ Remove from pending após completar
        return data
      })
      .catch((error) => {
        this.pendingRequests.delete(key) // ✅ Remove from pending mesmo se erro
        throw error
      })

    // 4. ✅ Store pending promise
    this.pendingRequests.set(key, promise)

    return promise
  }
}

// Singleton
export const dataCache = new DataCache()
