import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryConfigStore } from '../src/Stores/MemoryConfigStore'

describe('MemoryConfigStore', () => {
  let store: MemoryConfigStore

  beforeEach(() => {
    store = new MemoryConfigStore()
  })

  describe('constructor', () => {
    it('should create an empty store', async () => {
      expect(await store.snapshot()).toEqual({})
      expect(await store.keys()).toEqual([])
    })

    it('should not be invalidated initially', async () => {
      await store.set('test', 'value')
      expect(await store.get<string>('test')).toEqual('value')
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent paths', async () => {
      expect(await store.get<string>('non.existent.path')).toBeUndefined()
    })

    it('should return undefined for empty or whitespace paths', async () => {
      expect(await store.get<string>('')).toBeUndefined()
      expect(await store.get<string>('   ')).toBeUndefined()
      expect(await store.get<string>('\t')).toBeUndefined()
    })

    it('should retrieve simple values', async () => {
      await store.set('key', 'value')
      expect(await store.get<string>('key')).toEqual('value')
    })

    it('should retrieve nested object values', async () => {
      store.loadData({
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
      })

      expect(await store.get<string>('database.host')).toEqual('localhost')
      expect(await store.get<number>('database.port')).toEqual(5432)
      expect(await store.get<string>('database.credentials.username')).toEqual('admin')
      expect(await store.get<string>('database.credentials.password')).toEqual('secret')
    })

    it('should handle array access with numeric indices', async () => {
      store.loadData({
        servers: [
          { name: 'web1', port: 3000 },
          { name: 'web2', port: 3001 },
          { name: 'api', port: 8080 },
        ],
      })

      expect(await store.get<string>('servers.0.name')).toEqual('web1')
      expect(await store.get<number>('servers.1.port')).toEqual(3001)
      expect(await store.get<string>('servers.2.name')).toEqual('api')
    })

    it('should return undefined for invalid array indices', async () => {
      store.loadData({
        items: ['a', 'b', 'c'],
      })

      expect(await store.get<string>('items.5')).toBeUndefined()
      expect(await store.get<string>('items.-1')).toBeUndefined()
      expect(await store.get<string>('items.abc')).toBeUndefined()
    })

    it('should handle different data types', async () => {
      const testData = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
      }

      store.loadData(testData)

      expect(await store.get<string>('string')).toEqual('hello')
      expect(await store.get<number>('number')).toEqual(42)
      expect(await store.get<boolean>('boolean')).toEqual(true)
      expect(await store.get<null>('null')).toBeNull()
      expect(await store.get<number[]>('array')).toEqual([1, 2, 3])
      expect(await store.get<{ nested: string }>('object')).toEqual({ nested: 'value' })
    })

    it('should handle invalidated store', async () => {
      await store.set('key', 'value')
      store.invalidate()
      expect(await store.get<string>('key')).toEqual(undefined)
    })
  })

  describe('set', () => {
    it('should set simple values', async () => {
      await store.set('key', 'value')
      expect(await store.get<string>('key')).toBe('value')
    })

    it('should set nested values', async () => {
      await store.set('nested.key', 'value')
      expect(await store.get<string>('nested.key')).toBe('value')
      expect(await store.get<{ key: string }>('nested')).toEqual({ key: 'value' })
    })

    it('should overwrite existing values', async () => {
      await store.set('key', 'original')
      expect(await store.get<string>('key')).toBe('original')

      await store.set('key', 'updated')
      expect(await store.get<string>('key')).toBe('updated')
    })

    it('should handle array indices', async () => {
      await store.set('array.0', 'first')
      await store.set('array.1', 'second')
      expect(await store.get<string[]>('array')).toEqual(['first', 'second'])
    })

    it('should handle complex nested structures', async () => {
      await store.set('config.database.host', 'localhost')
      await store.set('config.database.port', 5432)
      await store.set('config.api.version', 'v1')

      expect(
        await store.get<{ database: { host: string; port: number }; api: { version: string } }>(
          'config'
        )
      ).toEqual({
        database: { host: 'localhost', port: 5432 },
        api: { version: 'v1' },
      })
    })

    it('should handle different data types', async () => {
      await store.set('string', 'hello')
      await store.set('number', 42)
      await store.set('boolean', true)
      await store.set('null', null)
      await store.set('array', [1, 2, 3])
      await store.set('object', { nested: 'value' })

      expect(await store.get<string>('string')).toBe('hello')
      expect(await store.get<number>('number')).toBe(42)
      expect(await store.get<boolean>('boolean')).toBe(true)
      expect(await store.get<null>('null')).toBeNull()
      expect(await store.get<number[]>('array')).toEqual([1, 2, 3])
      expect(await store.get<{ nested: string }>('object')).toEqual({ nested: 'value' })
    })
  })

  describe('has', () => {
    beforeEach(async () => {
      await store.set('existing', 'value')
      await store.set('nested.key', 'nested-value')
      await store.set('array', [1, 2, 3])
    })

    it('should return true for existing paths', async () => {
      expect(await store.has('existing')).toBe(true)
      expect(await store.has('nested.key')).toBe(true)
      expect(await store.has('nested')).toBe(true)
      expect(await store.has('array')).toBe(true)
    })

    it('should return false for non-existent paths', async () => {
      expect(await store.has('nonexistent')).toBe(false)
      expect(await store.has('nested.nonexistent')).toBe(false)
      expect(await store.has('array.10')).toBe(false)
    })

    it('should handle empty paths', async () => {
      expect(await store.has('')).toBe(false)
      expect(await store.has('   ')).toBe(false)
    })
  })

  describe('delete', () => {
    beforeEach(async () => {
      await store.set('simple', 'value')
      await store.set('nested.key', 'nested-value')
      await store.set('array', [1, 2, 3])
    })

    it('should delete existing keys', async () => {
      expect(await store.has('simple')).toBe(true)
      await store.delete('simple')
      expect(await store.has('simple')).toBe(false)
    })

    it('should delete nested keys', async () => {
      expect(await store.has('nested.key')).toBe(true)
      await store.delete('nested.key')
      expect(await store.has('nested.key')).toBe(false)
    })

    it('should handle non-existent keys gracefully', async () => {
      const result = await store.delete('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    beforeEach(async () => {
      await store.set('key1', 'value1')
      await store.set('key2', 'value2')
      await store.set('nested.key', 'nested-value')
    })

    it('should clear all data', async () => {
      expect(await store.keys()).toHaveLength(4)
      await store.clear()
      expect(await store.keys()).toHaveLength(0)
      expect(await store.snapshot()).toEqual({})
    })
  })

  describe('keys', () => {
    it('should return empty array for empty store', async () => {
      expect(await store.keys()).toEqual([])
    })

    it('should return all keys', async () => {
      await store.set('key1', 'value1')
      await store.set('key2', 'value2')
      await store.set('nested.key', 'nested-value')

      const keys = await store.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('nested.key')
    })
  })

  describe('snapshot', () => {
    it('should return empty object for empty store', async () => {
      expect(await store.snapshot()).toEqual({})
    })

    it('should return complete data structure', async () => {
      await store.set('simple', 'value')
      await store.set('nested.key', 'nested-value')
      await store.set('array', [1, 2, 3])

      const snapshot = await store.snapshot()
      expect(snapshot).toEqual({
        simple: 'value',
        nested: { key: 'nested-value' },
        array: [1, 2, 3],
      })
    })
  })

  describe('invalidate', () => {
    it('should invalidate the store', async () => {
      await store.set('key', 'value')
      expect(await store.get<string>('key')).toBe('value')

      store.invalidate()

      // After invalidation, the store should be empty
      expect(await store.get<string>('key')).toBeUndefined()
      expect(await store.snapshot()).toEqual({})
      expect(await store.keys()).toEqual([])
    })
  })

  describe('loadData', () => {
    it('should load simple data', async () => {
      const data = { key: 'value', number: 42 }
      store.loadData(data)

      expect(await store.get<string>('key')).toBe('value')
      expect(await store.get<number>('number')).toBe(42)
    })

    it('should load nested data', async () => {
      const data = {
        database: {
          host: 'localhost',
          ssl: true,
          auth: 'auth',
        },
      }
      store.loadData(data)

      expect(await store.get<string>('database.host')).toBe('localhost')
      expect(await store.get<boolean>('database.ssl')).toBe(true)
      expect(await store.get<string>('database.auth')).toBe('auth')
    })

    it('should replace existing data', async () => {
      await store.set('existing', 'value')

      const newData = { new: 'new-value' }
      store.loadData(newData)

      expect(await store.get<string>('new')).toBe('new-value')
    })

    it('should handle complex nested structures', async () => {
      const data = {
        api: {
          endpoints: {
            users: '/users',
            auth: 'secret',
          },
          providers: {
            oauth: 'github',
          },
        },
      }
      store.loadData(data)

      expect(await store.get<string>('api.endpoints.users')).toBe('/users')
      expect(await store.get<string>('api.endpoints.auth')).toBe('secret')
      expect(await store.get<string>('api.providers.oauth')).toBe('github')
    })

    it('should handle arrays', async () => {
      await store.set('existing', 'value')

      const data = {
        items: ['value1', 'value2', 'value3'],
      }
      store.loadData(data)

      expect(await store.get<string>('items.0')).toBe('value1')
      expect(await store.get<string>('items.1')).toBe('value2')
      expect(await store.get<string>('items.2')).toBe('value3')
    })

    it('should handle deeply nested arrays', async () => {
      const data = {
        matrix: [[{ name: 'first' }, 6], ['second']],
      }
      store.loadData(data)

      expect(await store.get<string>('matrix.0.0.name')).toBe('first')
      expect(await store.get<number>('matrix.0.1')).toBe(6)
      expect(await store.get<string>('matrix.1.0')).toBe('second')
    })

    it('should handle circular references without throwing', async () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      // This should not throw an error, but may have limitations
      store.loadData({ circular })
    })
  })

  describe('edge cases', () => {
    it('should handle very large arrays', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`)
      await store.set('large', largeArray)

      expect(await store.get<string>('large.0')).toBe('item-0')
      expect(await store.get<string>('large.999')).toBe('item-999')
    })

    it('should handle special characters in keys', async () => {
      await store.set('key-with-dashes', 'value')
      await store.set('key_with_underscores', 'value')
      await store.set('key.with.dots', 'value')

      expect(await store.get<string>('key-with-dashes')).toBe('value')
      expect(await store.get<string>('key_with_underscores')).toBe('value')
      expect(await store.get<string>('key.with.dots')).toBe('value')
    })

    it('should handle null and undefined values', async () => {
      await store.set('null-value', null)
      await store.set('undefined-value', undefined)

      expect(await store.get<null>('null-value')).toBeNull()
      expect(await store.get<undefined>('undefined-value')).toBeUndefined()
    })
  })
})
