import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RedisConfigStore } from '../src/Stores/RedisConfigStore'
import { ConfigSourceException } from '../src/Exceptions/ConfigSourceException'

// Mock Redis client
const createMockRedisClient = () => {
  const storage = new Map<string, string>()
  
  return {
    storage,
    get: jest.fn(async (key: string) => storage.get(key) || null),
    set: jest.fn(async (key: string, value: string) => {
      storage.set(key, value)
      return 'OK'
    }),
    setex: jest.fn(async (key: string, ttl: number, value: string) => {
      storage.set(key, value)
      return 'OK'
    }),
    del: jest.fn(async (...keys: string[]) => {
      let deleted = 0
      keys.forEach(key => {
        if (storage.has(key)) {
          storage.delete(key)
          deleted++
        }
      })
      return deleted
    }),
    keys: jest.fn(async (pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return Array.from(storage.keys()).filter(key => regex.test(key))
    }),
    // Helper methods for testing
    clear: () => storage.clear(),
    size: () => storage.size
  }
}

describe('RedisConfigStore', () => {
  let store: RedisConfigStore
  let mockRedis: ReturnType<typeof createMockRedisClient>

  beforeEach(() => {
    mockRedis = createMockRedisClient()
    store = new RedisConfigStore(mockRedis as any, 'test:')
  })

  describe('constructor', () => {
    it('should create store with default key prefix', () => {
      const defaultStore = new RedisConfigStore(mockRedis)
      expect(defaultStore).toBeInstanceOf(RedisConfigStore)
    })

    it('should create store with custom key prefix', () => {
      const customStore = new RedisConfigStore(mockRedis, 'custom:')
      expect(customStore).toBeInstanceOf(RedisConfigStore)
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent keys', async () => {
      const result = await store.get<string>('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty path', async () => {
      const result = await store.get<string>('')
      expect(result).toBeUndefined()
    })

    it('should return undefined for whitespace-only path', async () => {
      const result = await store.get<string>('   ')
      expect(result).toBeUndefined()
    })

    it('should get cached value if available', async () => {
      // Set up cached value
      mockRedis.storage.set('test:key', JSON.stringify('cached-value'))
      
      const result = await store.get<string>('key')
      expect(result).toBe('cached-value')
      expect(mockRedis.get).toHaveBeenCalledWith('test:key')
    })

    it('should fallback to root object when cache miss', async () => {
      // Set up root object
      const rootData = { nested: { key: 'root-value' } }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.get<string>('nested.key')
      expect(result).toBe('root-value')
      expect(mockRedis.setex).toHaveBeenCalledWith('test:nested.key', 3600, JSON.stringify('root-value'))
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))
      
      await expect(store.get<string>('key')).rejects.toThrow(ConfigSourceException)
      await expect(store.get<string>('key')).rejects.toThrow('Failed to get configuration value at path \'key\'')
    })

    it('should get nested object values', async () => {
      const rootData = { 
        database: { 
          host: 'localhost', 
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret'
          }
        } 
      }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      expect(await store.get<string>('database.host')).toBe('localhost')
      expect(await store.get<number>('database.port')).toBe(5432)
      expect(await store.get<string>('database.credentials.username')).toBe('admin')
    })

    it('should get array values by index', async () => {
      const rootData = { servers: ['web1', 'web2', 'web3'] }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      expect(await store.get<string>('servers.0')).toBe('web1')
      expect(await store.get<string>('servers.2')).toBe('web3')
    })

    it('should return undefined for invalid array indices', async () => {
      const rootData = { servers: ['web1', 'web2'] }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      expect(await store.get<string>('servers.5')).toBeUndefined()
      expect(await store.get<string>('servers.-1')).toBeUndefined()
      expect(await store.get<string>('servers.invalid')).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should throw error for empty path', async () => {
      await expect(store.set('', 'value')).rejects.toThrow('Path cannot be empty')
    })

    it('should throw error for whitespace-only path', async () => {
      await expect(store.set('   ', 'value')).rejects.toThrow('Path cannot be empty')
    })

    it('should set simple values', async () => {
      await store.set('key', 'value')
      
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify({ key: 'value' }))
      expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 3600, JSON.stringify('value'))
    })

    it('should set nested values', async () => {
      await store.set('database.host', 'localhost')
      
      const expectedRoot = { database: { host: 'localhost' } }
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify(expectedRoot))
      expect(mockRedis.setex).toHaveBeenCalledWith('test:database.host', 3600, JSON.stringify('localhost'))
    })

    it('should update existing nested values', async () => {
      // Set initial data
      const initialData = { database: { host: 'old-host', port: 5432 } }
      mockRedis.storage.set('test:__root__', JSON.stringify(initialData))
      
      await store.set('database.host', 'new-host')
      
      const expectedRoot = { database: { host: 'new-host', port: 5432 } }
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify(expectedRoot))
    })

    it('should handle array indices', async () => {
      await store.set('servers.0', 'web1')
      await store.set('servers.1', 'web2')
      
      const expectedRoot = { servers: ['web1', 'web2'] }
      expect(mockRedis.set).toHaveBeenLastCalledWith('test:__root__', JSON.stringify(expectedRoot))
    })

    it('should handle complex nested structures', async () => {
      const complexValue = {
        name: 'production',
        settings: {
          debug: false,
          features: ['auth', 'logging']
        }
      }
      
      await store.set('environment', complexValue)
      
      const expectedRoot = { environment: complexValue }
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify(expectedRoot))
    })

    it('should invalidate parent path caches', async () => {
      await store.set('database.connection.host', 'localhost')
      
      expect(mockRedis.del).toHaveBeenCalledWith('test:database.connection', 'test:database')
    })

    it('should handle Redis errors', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'))
      
      await expect(store.set('key', 'value')).rejects.toThrow(ConfigSourceException)
      await expect(store.set('key', 'value')).rejects.toThrow('Failed to set configuration value at path \'key\'')
    })
  })

  describe('has', () => {
    it('should return false for non-existent keys', async () => {
      const result = await store.has('nonexistent')
      expect(result).toBe(false)
    })

    it('should return true for existing keys', async () => {
      mockRedis.storage.set('test:key', JSON.stringify('value'))
      
      const result = await store.has('key')
      expect(result).toBe(true)
    })

    it('should return true for nested existing keys', async () => {
      const rootData = { database: { host: 'localhost' } }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.has('database.host')
      expect(result).toBe(true)
    })

    it('should return false for nested non-existent keys', async () => {
      const rootData = { database: { host: 'localhost' } }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.has('database.port')
      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('should return false for non-existent keys', async () => {
      const result = await store.delete('nonexistent')
      expect(result).toBe(false)
    })

    it('should delete existing keys', async () => {
      // Set up initial data
      const rootData = { key: 'value', other: 'data' }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      mockRedis.storage.set('test:key', JSON.stringify('value'))
      
      const result = await store.delete('key')
      expect(result).toBe(true)
      
      expect(mockRedis.del).toHaveBeenCalledWith('test:key')
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify({ other: 'data' }))
    })

    it('should delete nested keys', async () => {
      const rootData = { database: { host: 'localhost', port: 5432 } }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.delete('database.host')
      expect(result).toBe(true)
      
      const expectedRoot = { database: { port: 5432 } }
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify(expectedRoot))
    })

    it('should invalidate parent paths', async () => {
      const rootData = { database: { connection: { host: 'localhost' } } }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      await store.delete('database.connection.host')
      
      expect(mockRedis.del).toHaveBeenCalledWith('test:database.connection', 'test:database')
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      
      await expect(store.delete('key')).rejects.toThrow(ConfigSourceException)
      await expect(store.delete('key')).rejects.toThrow('Failed to delete configuration value at path \'key\'')
    })
  })

  describe('clear', () => {
    it('should clear all keys with prefix', async () => {
      mockRedis.storage.set('test:key1', 'value1')
      mockRedis.storage.set('test:key2', 'value2')
      mockRedis.storage.set('other:key', 'value')
      
      await store.clear()
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*')
      expect(mockRedis.del).toHaveBeenCalledWith('test:key1', 'test:key2')
    })

    it('should handle empty key list', async () => {
      mockRedis.keys.mockResolvedValueOnce([])
      
      await store.clear()
      
      expect(mockRedis.del).not.toHaveBeenCalled()
    })

    it('should handle Redis errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'))
      
      await expect(store.clear()).rejects.toThrow(ConfigSourceException)
      await expect(store.clear()).rejects.toThrow('Failed to clear configuration data')
    })
  })

  describe('keys', () => {
    it('should return empty array when no root data', async () => {
      const result = await store.keys()
      expect(result).toEqual([])
    })

    it('should return all configuration paths', async () => {
      const rootData = {
        database: {
          host: 'localhost',
          port: 5432
        },
        cache: {
          enabled: true
        },
        servers: ['web1', 'web2']
      }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.keys()
      expect(result).toContain('database')
      expect(result).toContain('database.host')
      expect(result).toContain('database.port')
      expect(result).toContain('cache')
      expect(result).toContain('cache.enabled')
      expect(result).toContain('servers')
      expect(result).toContain('servers.0')
      expect(result).toContain('servers.1')
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      
      await expect(store.keys()).rejects.toThrow(ConfigSourceException)
      await expect(store.keys()).rejects.toThrow('Failed to get configuration keys')
    })
  })

  describe('snapshot', () => {
    it('should return empty object when no data', async () => {
      const result = await store.snapshot()
      expect(result).toEqual({})
    })

    it('should return complete configuration snapshot', async () => {
      const rootData = {
        database: { host: 'localhost', port: 5432 },
        cache: { enabled: true }
      }
      mockRedis.storage.set('test:__root__', JSON.stringify(rootData))
      
      const result = await store.snapshot()
      expect(result).toEqual(rootData)
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      
      await expect(store.snapshot()).rejects.toThrow(ConfigSourceException)
      await expect(store.snapshot()).rejects.toThrow('Failed to get configuration snapshot')
    })
  })

  describe('invalidate', () => {
    it('should clear all data', async () => {
      mockRedis.storage.set('test:key1', 'value1')
      mockRedis.storage.set('test:key2', 'value2')
      
      await store.invalidate()
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*')
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('loadData', () => {
    it('should clear existing data and load new data', async () => {
      const configData = {
        database: { host: 'localhost' },
        cache: { enabled: true }
      }
      
      await store.loadData(configData)
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*')
      expect(mockRedis.set).toHaveBeenCalledWith('test:__root__', JSON.stringify(configData))
    })

    it('should handle Redis errors', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'))
      
      await expect(store.loadData({})).rejects.toThrow(ConfigSourceException)
      await expect(store.loadData({})).rejects.toThrow('Failed to load configuration data')
    })
  })

  describe('serialization', () => {
    it('should handle different data types', async () => {
      await store.set('string', 'text')
      await store.set('number', 42)
      await store.set('boolean', true)
      await store.set('null', null)
      await store.set('array', [1, 2, 3])
      await store.set('object', { key: 'value' })
      
      expect(await store.get<string>('string')).toBe('text')
      expect(await store.get<number>('number')).toBe(42)
      expect(await store.get<boolean>('boolean')).toBe(true)
      expect(await store.get<null>('null')).toBe(null)
      expect(await store.get<number[]>('array')).toEqual([1, 2, 3])
      expect(await store.get<object>('object')).toEqual({ key: 'value' })
    })

    it('should handle invalid JSON gracefully', async () => {
      // Manually set invalid JSON
      mockRedis.storage.set('test:key', 'invalid-json')
      
      const result = await store.get<string>('key')
      expect(result).toBe('invalid-json')
    })
  })

  describe('edge cases', () => {
    it('should handle deeply nested paths', async () => {
      await store.set('a.b.c.d.e.f.g', 'deep-value')
      
      expect(await store.get<string>('a.b.c.d.e.f.g')).toBe('deep-value')
    })

    it('should handle paths with special characters', async () => {
      await store.set('key-with-dashes', 'value')
      await store.set('key_with_underscores', 'value')
      
      expect(await store.get<string>('key-with-dashes')).toBe('value')
      expect(await store.get<string>('key_with_underscores')).toBe('value')
    })

    it('should handle large data structures', async () => {
      const largeObject: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = `value${i}`
      }
      
      await store.set('large', largeObject)
      const result = await store.get<object>('large')
      
      expect(result).toEqual(largeObject)
    })

    it('should handle concurrent operations', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(store.set(`key${i}`, `value${i}`))
      }
      
      await Promise.all(promises)
      
      for (let i = 0; i < 10; i++) {
        expect(await store.get<string>(`key${i}`)).toBe(`value${i}`)
      }
    })
  })
})