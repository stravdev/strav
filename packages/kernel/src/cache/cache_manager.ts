import { inject } from '../core/inject.ts'
import { ConfigurationError } from '../exceptions/errors.ts'
import Configuration from '../config/configuration.ts'
import { MemoryCacheStore } from './memory_store.ts'
import type { CacheStore, CacheConfig } from './cache_store.ts'

/**
 * Central cache configuration hub.
 *
 * Resolved once via the DI container — reads the cache config
 * and initializes the appropriate store driver.
 *
 * @example
 * app.singleton(CacheManager)
 * app.resolve(CacheManager)
 *
 * // Plug in a custom store (e.g., Redis)
 * CacheManager.useStore(new MyRedisStore())
 */
@inject
export default class CacheManager {
  private static _store: CacheStore
  private static _config: CacheConfig

  constructor(config: Configuration) {
    CacheManager._config = {
      default: 'memory',
      prefix: '',
      ttl: 3600,
      ...(config.get('cache', {}) as object),
    }

    const driver = CacheManager._config.default
    if (driver === 'memory') {
      CacheManager._store = new MemoryCacheStore()
    } else {
      throw new ConfigurationError(
        `Unknown cache driver: ${driver}. Use CacheManager.useStore() for custom drivers.`
      )
    }
  }

  static get store(): CacheStore {
    if (!CacheManager._store) {
      throw new ConfigurationError(
        'CacheManager not configured. Resolve it through the container first.'
      )
    }
    return CacheManager._store
  }

  static get config(): CacheConfig {
    return CacheManager._config
  }

  /** Swap the cache store at runtime (e.g., for testing or a custom Redis store). */
  static useStore(store: CacheStore): void {
    CacheManager._store = store
  }
}
