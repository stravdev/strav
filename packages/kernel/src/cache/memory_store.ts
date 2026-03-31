import type { CacheStore } from './cache_store.ts'

interface CacheEntry {
  value: unknown
  expiresAt: number | null // null = no expiry
}

/**
 * In-memory cache store using a Map with lazy TTL eviction.
 * Suitable for single-process deployments.
 */
export class MemoryCacheStore implements CacheStore {
  private entries = new Map<string, CacheEntry>()

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.entries.get(key)
    if (!entry) return null

    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.entries.delete(key)
      return null
    }

    return entry.value as T
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const expiresAt = ttl != null ? Date.now() + ttl * 1000 : null

    this.entries.set(key, { value, expiresAt })

    if (this.entries.size > 10_000) this.cleanup()
  }

  async has(key: string): Promise<boolean> {
    const entry = this.entries.get(key)
    if (!entry) return false

    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.entries.delete(key)
      return false
    }

    return true
  }

  async forget(key: string): Promise<void> {
    this.entries.delete(key)
  }

  async flush(): Promise<void> {
    this.entries.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== null && now >= entry.expiresAt) {
        this.entries.delete(key)
      }
    }
  }
}
