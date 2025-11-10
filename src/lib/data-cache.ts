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
    console.log(`🗑️ [CACHE CLEAR] ${key}`)
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear()
    console.log(`🗑️ [CACHE CLEAR ALL]`)
  }

  /**
   * Get or fetch data (with cache)
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    console.log(`🔍 [CACHE MISS] ${key} - fetching...`)
    const data = await fetchFn()
    this.set(key, data, ttl)
    return data
  }
}

// Singleton
export const dataCache = new DataCache()
