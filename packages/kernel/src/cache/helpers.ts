import CacheManager from './cache_manager.ts'

function prefixed(key: string): string {
  return CacheManager.config.prefix + key
}

/**
 * Cache helper object — the primary API for cache-aside operations.
 *
 * All methods delegate to `CacheManager.store` with the configured prefix.
 *
 * @example
 * import { cache } from '@stravigor/kernel/cache'
 *
 * const user = await cache.remember(`user:${id}`, 300, () => User.find(id))
 * await cache.forget(`user:${id}`)
 */
export const cache = {
  /** Retrieve a cached value. */
  async get<T = unknown>(key: string): Promise<T | null> {
    return CacheManager.store.get<T>(prefixed(key))
  },

  /** Store a value with optional TTL in seconds. Falls back to config default. */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    return CacheManager.store.set(prefixed(key), value, ttl ?? CacheManager.config.ttl)
  },

  /** Check if a key exists and is not expired. */
  async has(key: string): Promise<boolean> {
    return CacheManager.store.has(prefixed(key))
  },

  /** Remove a cached value. */
  async forget(key: string): Promise<void> {
    return CacheManager.store.forget(prefixed(key))
  },

  /** Clear all cached values. */
  async flush(): Promise<void> {
    return CacheManager.store.flush()
  },

  /**
   * Cache-aside: return cached value or execute factory and cache the result.
   *
   * @example
   * const user = await cache.remember(`user:${id}`, 300, () => User.find(id))
   * const stats = await cache.remember('stats', 60, async () => ({
   *   users: await User.count(),
   *   projects: await Project.count(),
   * }))
   */
  async remember<T>(key: string, ttl: number, factory: () => T | Promise<T>): Promise<T> {
    const pk = prefixed(key)
    const cached = await CacheManager.store.get<T>(pk)
    if (cached !== null) return cached

    const value = await factory()
    await CacheManager.store.set(pk, value, ttl)
    return value
  },

  /** Cache-aside with no expiry. */
  async rememberForever<T>(key: string, factory: () => T | Promise<T>): Promise<T> {
    const pk = prefixed(key)
    const cached = await CacheManager.store.get<T>(pk)
    if (cached !== null) return cached

    const value = await factory()
    await CacheManager.store.set(pk, value)
    return value
  },
}
