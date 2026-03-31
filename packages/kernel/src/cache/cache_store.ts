/**
 * Pluggable cache storage backend.
 *
 * Implement this interface to use Redis, database, or other stores.
 * The default in-memory implementation uses a Map with lazy TTL eviction.
 */
export interface CacheStore {
  /** Retrieve a cached value. Returns `null` if the key doesn't exist or has expired. */
  get<T = unknown>(key: string): Promise<T | null>

  /** Store a value with optional TTL in seconds. Omit TTL for no expiry. */
  set(key: string, value: unknown, ttl?: number): Promise<void>

  /** Check if a key exists and is not expired. */
  has(key: string): Promise<boolean>

  /** Remove a single key from the cache. */
  forget(key: string): Promise<void>

  /** Remove all entries from the cache. */
  flush(): Promise<void>
}

export interface CacheConfig {
  /** Cache driver name. @default 'memory' */
  default: string
  /** Key prefix applied to all cache operations. @default '' */
  prefix: string
  /** Default TTL in seconds when none is specified. @default 3600 */
  ttl: number
}
