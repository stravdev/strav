import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import { ConfigService } from '../src/Services/ConfigService'
import type { ConfigSource } from '../src/Contracts/ConfigSource'
import type { ConfigChange } from '../src/Types/ConfigChange'
import { ConfigNotLoadedException } from '../src/Exceptions/ConfigNotLoadedException'
import { ConfigReadOnlyException } from '../src/Exceptions/ConfigReadOnlyException'

// Mock ConfigSource implementation for testing
const createMockConfigSource = (data: any = {}, watchable = false): ConfigSource => ({
  type: 'mock',
  location: 'mock://test',
  resolve: mock(async () => data),
  isWatchable: () => watchable,
  watch: watchable ? mock((callback: () => void) => {
    // Return unwatch function
    return () => {}
  }) : undefined
})

describe('ConfigService', () => {
  let service: ConfigService

  beforeEach(() => {
    service = new ConfigService()
  })

  describe('constructor', () => {
    it('should create service with default options', () => {
      const defaultService = new ConfigService()
      expect(defaultService.isLoaded()).toBe(false)
    })

    it('should create service with custom options', () => {
      const strictService = new ConfigService({ strict: true })
      expect(strictService.isLoaded()).toBe(false)
    })

    it('should create service with all options', () => {
      const fullService = new ConfigService({
        strict: true,
        reloadOnChange: true,
        frozen: true
      })
      expect(fullService.isLoaded()).toBe(false)
    })
  })

  describe('load', () => {
    it('should load from single source', async () => {
      const mockData = { app: { name: 'test' } }
      const source = createMockConfigSource(mockData)

      await service.load(source)

      expect(service.isLoaded()).toBe(true)
      expect(source.resolve).toHaveBeenCalledTimes(1)
      expect(service.get<string>('app.name')).toBe('test')
    })

    it('should load from multiple sources', async () => {
      const source1 = createMockConfigSource({ app: { name: 'test' }, db: { host: 'localhost' } })
      const source2 = createMockConfigSource({ app: { version: '1.0' }, api: { port: 3000 } })

      await service.load([source1, source2])

      expect(service.isLoaded()).toBe(true)
      expect(source1.resolve).toHaveBeenCalledTimes(1)
      expect(source2.resolve).toHaveBeenCalledTimes(1)
      expect(service.get<string>('app.name')).toBe('test')
      expect(service.get<string>('app.version')).toBe('1.0')
      expect(service.get<string>('db.host')).toBe('localhost')
      expect(service.get<number>('api.port')).toBe(3000)
    })

    it('should merge data from multiple sources with later sources taking precedence', async () => {
      const source1 = createMockConfigSource({ app: { name: 'test', version: '0.1' } })
      const source2 = createMockConfigSource({ app: { version: '1.0', debug: true } })

      await service.load([source1, source2])

      expect(service.get<string>('app.name')).toBe('test')
      expect(service.get<string>('app.version')).toBe('1.0') // Later source wins
      expect(service.get<boolean>('app.debug')).toBe(true)
    })

    it('should setup source watchers when reloadOnChange is enabled', async () => {
      const watchableService = new ConfigService({ reloadOnChange: true })
      const source = createMockConfigSource({ test: 'data' }, true)

      await watchableService.load(source)

      expect(source.watch).toHaveBeenCalledTimes(1)
    })

    it('should freeze config when frozen option is enabled', async () => {
      const frozenService = new ConfigService({ frozen: true })
      const source = createMockConfigSource({ app: { name: 'test' } })

      await frozenService.load(source)

      const config = frozenService.getAll()
      expect(Object.isFrozen(config)).toBe(true)
      expect(Object.isFrozen(config.app)).toBe(true)
    })
  })

  describe('reload', () => {
    it('should reload from existing sources', async () => {
      const mockData = { counter: 1 }
      const source = createMockConfigSource(mockData)

      await service.load(source)
      expect(service.get<number>('counter')).toBe(1)

      // Update mock data
      mockData.counter = 2
      await service.reload()

      expect(source.resolve).toHaveBeenCalledTimes(2)
      expect(service.get<number>('counter')).toBe(2)
    })

    it('should throw ConfigNotLoadedException when not loaded', async () => {
      await expect(service.reload()).rejects.toThrow(ConfigNotLoadedException)
      await expect(service.reload()).rejects.toThrow('Cannot reload configuration before initial load')
    })

    it('should notify watchers of changes during reload', async () => {
      const source = createMockConfigSource({ value: 'old' })
      await service.load(source)

      const changeCallback = mock((changes: ConfigChange[]) => {})
      service.watch(changeCallback)

      // Update source data
      source.resolve = mock(async () => ({ value: 'new' }))
      await service.reload()

      expect(changeCallback).toHaveBeenCalledTimes(1)
      const changes = changeCallback.mock.calls[0]?.[0] as ConfigChange[]
      expect(changes).toHaveLength(1)
      expect(changes[0]?.path).toBe('value')
      expect(changes[0]?.oldValue).toBe('old')
      expect(changes[0]?.newValue).toBe('new')
    })
  })

  describe('isLoaded', () => {
    it('should return false initially', () => {
      expect(service.isLoaded()).toBe(false)
    })

    it('should return true after loading', async () => {
      const source = createMockConfigSource({ test: 'data' })
      await service.load(source)
      expect(service.isLoaded()).toBe(true)
    })
  })

  describe('get', () => {
    beforeEach(async () => {
      const source = createMockConfigSource({
        app: {
          name: 'test-app',
          version: '1.0.0',
          features: {
            auth: true,
            logging: false
          }
        },
        database: {
          host: 'localhost',
          port: 5432
        }
      })
      await service.load(source)
    })

    it('should get simple values', () => {
      expect(service.get<string>('app.name')).toBe('test-app')
      expect(service.get<string>('app.version')).toBe('1.0.0')
      expect(service.get<number>('database.port')).toBe(5432)
    })

    it('should get nested values', () => {
      expect(service.get<boolean>('app.features.auth')).toBe(true)
      expect(service.get<boolean>('app.features.logging')).toBe(false)
    })

    it('should get object values', () => {
      const features = service.get<{ auth: boolean; logging: boolean }>('app.features')
      expect(features).toEqual({ auth: true, logging: false })
    })

    it('should return default value for non-existent paths', () => {
      expect(service.get<string>('non.existent.path', 'default')).toBe('default')
      expect(service.get<number>('app.non.existent', 42)).toBe(42)
    })

    it('should return undefined for non-existent paths without default', () => {
      expect(service.get<string>('non.existent.path')).toBeUndefined()
    })

    it('should handle strict mode when not loaded', () => {
      const strictService = new ConfigService({ strict: true })
      expect(() => strictService.get<string>('any.path')).toThrow(ConfigNotLoadedException)
    })

    it('should handle strict mode for missing keys', () => {
      const strictService = new ConfigService({ strict: true })
      const source = createMockConfigSource({ existing: 'value' })
      
      return strictService.load(source).then(() => {
        expect(() => strictService.get<string>('missing.key')).toThrow("Configuration key 'missing.key' not found")
      })
    })

    it('should return default in non-strict mode when not loaded', () => {
      expect(service.get<string>('any.path', 'default')).toBe('default')
      expect(service.get<string>('any.path')).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return complete configuration', async () => {
      const mockData = {
        app: { name: 'test' },
        db: { host: 'localhost' }
      }
      const source = createMockConfigSource(mockData)
      await service.load(source)

      const config = service.getAll()
      expect(config).toEqual(mockData)
      expect(config).not.toBe(mockData) // Should be a copy
    })

    it('should return empty object when not loaded in non-strict mode', () => {
      expect(service.getAll()).toEqual({})
    })

    it('should throw when not loaded in strict mode', () => {
      const strictService = new ConfigService({ strict: true })
      expect(() => strictService.getAll()).toThrow(ConfigNotLoadedException)
    })
  })

  describe('has', () => {
    beforeEach(async () => {
      const source = createMockConfigSource({
        app: { name: 'test' },
        database: { host: 'localhost', port: 5432 }
      })
      await service.load(source)
    })

    it('should return true for existing paths', () => {
      expect(service.has('app')).toBe(true)
      expect(service.has('app.name')).toBe(true)
      expect(service.has('database.host')).toBe(true)
      expect(service.has('database.port')).toBe(true)
    })

    it('should return false for non-existent paths', () => {
      expect(service.has('non.existent')).toBe(false)
      expect(service.has('app.version')).toBe(false)
      expect(service.has('database.password')).toBe(false)
    })

    it('should return false when not loaded', () => {
      const unloadedService = new ConfigService()
      expect(unloadedService.has('any.path')).toBe(false)
    })
  })

  describe('set', () => {
    beforeEach(async () => {
      const source = createMockConfigSource({ app: { name: 'test' } })
      await service.load(source)
    })

    it('should set simple values', () => {
      service.set('app.version', '2.0.0')
      expect(service.get<string>('app.version')).toBe('2.0.0')
    })

    it('should set nested values', () => {
      service.set('app.features.auth', true)
      expect(service.get<boolean>('app.features.auth')).toBe(true)
    })

    it('should create nested paths', () => {
      service.set('new.nested.path', 'value')
      expect(service.get<string>('new.nested.path')).toBe('value')
    })

    it('should notify watchers of changes', () => {
      const changeCallback = mock((changes: ConfigChange[]) => {})
      service.watch(changeCallback)

      service.set('app.version', '2.0.0')

      expect(changeCallback).toHaveBeenCalledTimes(1)
      const changes = changeCallback.mock.calls[0]?.[0] as ConfigChange[]
      expect(changes).toHaveLength(1)
      expect(changes[0]?.path).toBe('app.version')
      expect(changes[0]?.oldValue).toBeUndefined()
      expect(changes[0]?.newValue).toBe('2.0.0')
    })

    it('should throw when frozen', async () => {
      const frozenService = new ConfigService({ frozen: true })
      const source = createMockConfigSource({ test: 'data' })
      await frozenService.load(source)

      expect(() => frozenService.set('test', 'new-value')).toThrow(ConfigReadOnlyException)
    })

    it('should throw when not loaded', () => {
      const unloadedService = new ConfigService()
      expect(() => unloadedService.set('any.path', 'value')).toThrow(ConfigNotLoadedException)
    })
  })

  describe('merge', () => {
    beforeEach(async () => {
      const source = createMockConfigSource({
        app: { name: 'test', version: '1.0' },
        database: { host: 'localhost' }
      })
      await service.load(source)
    })

    it('should merge new data', () => {
      service.merge({
        app: { debug: true },
        api: { port: 3000 }
      })

      expect(service.get<string>('app.name')).toBe('test')
      expect(service.get<string>('app.version')).toBe('1.0')
      expect(service.get<boolean>('app.debug')).toBe(true)
      expect(service.get<number>('api.port')).toBe(3000)
    })

    it('should override existing values', () => {
      service.merge({
        app: { version: '2.0' },
        database: { host: 'remote' }
      })

      expect(service.get<string>('app.version')).toBe('2.0')
      expect(service.get<string>('database.host')).toBe('remote')
    })

    it('should notify watchers of changes', () => {
      const changeCallback = mock((changes: ConfigChange[]) => {})
      service.watch(changeCallback)

      service.merge({
        app: { version: '2.0' },
        new: { key: 'value' }
      })

      expect(changeCallback).toHaveBeenCalledTimes(1)
      const changes = changeCallback.mock.calls[0]?.[0] as ConfigChange[]
      expect(changes.length).toBeGreaterThan(0)
    })

    it('should throw when frozen', async () => {
      const frozenService = new ConfigService({ frozen: true })
      const source = createMockConfigSource({ test: 'data' })
      await frozenService.load(source)

      expect(() => frozenService.merge({ new: 'data' })).toThrow(ConfigReadOnlyException)
    })

    it('should throw when not loaded', () => {
      const unloadedService = new ConfigService()
      expect(() => unloadedService.merge({ any: 'data' })).toThrow(ConfigNotLoadedException)
    })
  })

  describe('watch', () => {
    beforeEach(async () => {
      const source = createMockConfigSource({ app: { name: 'test' } })
      await service.load(source)
    })

    it('should watch for global changes', () => {
      const callback = mock((changes: ConfigChange[]) => {})
      const unwatch = service.watch(callback)

      service.set('app.version', '2.0.0')

      expect(callback).toHaveBeenCalledTimes(1)
      expect(typeof unwatch).toBe('function')
    })

    it('should watch for path-specific changes', () => {
      const callback = mock((change: ConfigChange) => {})
      const unwatch = service.watch('app.name', callback)

      service.set('app.name', 'new-name')
      service.set('other.key', 'value')

      expect(callback).toHaveBeenCalledTimes(1)
      const change = callback.mock.calls[0]?.[0] as ConfigChange
      expect(change.path).toBe('app.name')
      expect(change.newValue).toBe('new-name')
    })

    it('should watch for nested path changes', () => {
      const callback = mock((change: ConfigChange) => {})
      service.watch('app', callback)

      service.set('app.version', '2.0.0')
      service.set('database.host', 'remote')

      expect(callback).toHaveBeenCalledTimes(1)
      const change = callback.mock.calls[0]?.[0] as ConfigChange
      expect(change.path).toBe('app.version')
    })

    it('should allow unwatching', () => {
      const callback = mock((changes: ConfigChange[]) => {})
      const unwatch = service.watch(callback)

      service.set('test1', 'value1')
      expect(callback).toHaveBeenCalledTimes(1)

      unwatch()
      service.set('test2', 'value2')
      expect(callback).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should handle multiple watchers', () => {
      const callback1 = mock((changes: ConfigChange[]) => {})
      const callback2 = mock((changes: ConfigChange[]) => {})

      service.watch(callback1)
      service.watch(callback2)

      service.set('test', 'value')

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const source = createMockConfigSource({ test: 'data' }, true)
      const watchableService = new ConfigService({ reloadOnChange: true })
      
      await watchableService.load(source)
      
      const callback = mock((changes: ConfigChange[]) => {})
      watchableService.watch(callback)

      watchableService.dispose()

      expect(watchableService.isLoaded()).toBe(false)
      expect(watchableService.getAll()).toEqual({})
    })

    it('should stop notifying watchers after dispose', async () => {
      const source = createMockConfigSource({ test: 'data' })
      await service.load(source)

      const callback = mock((changes: ConfigChange[]) => {})
      service.watch(callback)

      service.dispose()
      
      // This should not trigger the callback since service is disposed
      // and not loaded anymore
      expect(() => service.set('test', 'new-value')).toThrow(ConfigNotLoadedException)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle source load errors gracefully', async () => {
      const errorSource = createMockConfigSource()
      errorSource.resolve = mock(async () => {
        throw new Error('Load failed')
      })

      await expect(service.load(errorSource)).rejects.toThrow('Load failed')
      expect(service.isLoaded()).toBe(false)
    })

    it('should handle watcher callback errors gracefully', async () => {
      const source = createMockConfigSource({ test: 'data' })
      await service.load(source)

      const errorCallback = mock(() => {
        throw new Error('Callback error')
      })
      const goodCallback = mock(() => {})

      service.watch(errorCallback)
      service.watch(goodCallback)

      // Setting a value should trigger callbacks and throw ConfigNotLoadedException
      expect(() => {
        service.set('test', 'new-value')
      }).toThrow(ConfigNotLoadedException)

      // Both callbacks should have been called before the exception was thrown
      expect(errorCallback).toHaveBeenCalled()
      expect(goodCallback).toHaveBeenCalled()
    })
  })
})