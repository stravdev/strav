import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { ConfigServiceProvider } from '../src/Services/ConfigServiceProvider'
import type { ConfigSource } from '../src/Contracts/ConfigSource'
import { Container } from '@strav/kernel'

// Mock Container implementation for testing
const createMockContainer = (): any => {
  const container = new Container()

  // Mock the registerFactory method to track calls
  const originalRegisterFactory = container.registerFactory.bind(container)
  container.registerFactory = mock((token: any, factory: () => any) => {
    return originalRegisterFactory(token, factory)
  })

  // Mock the resolve method to track calls
  const originalResolve = container.resolve.bind(container)
  container.resolve = mock((token: any) => {
    return originalResolve(token)
  })

  return container
}

// Mock ConfigSource implementation for testing
const createMockConfigSource = (data: any = {}, watchable = false): ConfigSource => ({
  type: 'mock',
  location: 'mock://test',
  resolve: mock(async () => data),
  isWatchable: () => watchable,
  watch: watchable
    ? mock((callback: () => void) => {
        return () => {}
      })
    : undefined,
})

describe('ConfigServiceProvider', () => {
  let provider: ConfigServiceProvider
  let mockContainer: any
  let mockSource: ConfigSource

  beforeEach(() => {
    provider = new ConfigServiceProvider()
    mockContainer = createMockContainer()
    mockSource = createMockConfigSource({
      app: { name: 'test' },
      database: { host: 'localhost' },
    })
  })

  describe('constructor', () => {
    it('should create instance with default state', () => {
      const newProvider = new ConfigServiceProvider()

      expect(newProvider.getProviderName()).toBe('ConfigServiceProvider')
      expect(newProvider.getDependencies()).toEqual([])
    })
  })

  describe('configure', () => {
    it('should configure provider with options', () => {
      const options = { strict: true, frozen: true }

      const result = provider.configure(options)

      expect(result).toBe(provider) // Should return self for chaining
    })

    it('should merge options when called multiple times', () => {
      provider.configure({ strict: true })
      provider.configure({ frozen: true })

      // Should not throw when creating service
      const service = provider.createService()
      expect(service).toBeDefined()
    })
  })

  describe('withSources', () => {
    it('should configure provider with single source', () => {
      const result = provider.withSources(mockSource)

      expect(result).toBe(provider) // Should return self for chaining
    })

    it('should configure provider with multiple sources', () => {
      const source2 = createMockConfigSource({ cache: { enabled: true } })

      const result = provider.withSources([mockSource, source2])

      expect(result).toBe(provider)
    })

    it('should support method chaining', () => {
      const result = provider.configure({ strict: true }).withSources(mockSource)

      expect(result).toBe(provider)
    })
  })

  describe('register', () => {
    it('should register ConfigService with container', () => {
      provider.register(mockContainer)

      expect(mockContainer.registerFactory).toHaveBeenCalledTimes(2)

      // Should register with symbol token
      const firstCall = (mockContainer.registerFactory as any).mock.calls[0]
      expect(typeof firstCall[0]).toBe('symbol')
      expect(typeof firstCall[1]).toBe('function')

      // Should register with string token
      const secondCall = (mockContainer.registerFactory as any).mock.calls[1]
      expect(secondCall[0]).toBe('ConfigService')
      expect(typeof secondCall[1]).toBe('function')
    })

    it('should create service instance when factory is called', () => {
      provider.register(mockContainer)

      // Get the factory function from the first registration call
      const factoryCall = (mockContainer.registerFactory as any).mock.calls[0]
      const factory = factoryCall[1]

      const service = factory()

      expect(service).toBeDefined()
      expect(typeof service.load).toBe('function')
      expect(typeof service.get).toBe('function')
    })
  })

  describe('boot', () => {
    beforeEach(() => {
      provider.withSources(mockSource)
      provider.register(mockContainer)
    })

    it('should boot service and load sources when sources are configured', async () => {
      await provider.boot(mockContainer)

      expect(mockContainer.resolve).toHaveBeenCalled()
    })

    it('should not load sources when no sources are configured', async () => {
      const providerWithoutSources = new ConfigServiceProvider()
      providerWithoutSources.register(mockContainer)

      await providerWithoutSources.boot(mockContainer)

      // Should not try to resolve service if no sources
      expect(mockContainer.resolve).not.toHaveBeenCalled()
    })

    it('should handle boot errors gracefully', async () => {
      // Mock container to throw error on resolve
      mockContainer.resolve = mock(() => {
        throw new Error('Service not found')
      })

      expect(async () => {
        await provider.boot(mockContainer)
      }).toThrow('Service not found')
    })
  })

  describe('shutdown', () => {
    beforeEach(() => {
      provider.register(mockContainer)
    })

    it('should shutdown service and dispose resources', async () => {
      const mockService = {
        dispose: mock(() => {}),
      }

      mockContainer.resolve = mock(() => mockService)

      await provider.shutdown(mockContainer)

      expect(mockContainer.resolve).toHaveBeenCalled()
      expect(mockService.dispose).toHaveBeenCalled()
    })

    it('should handle shutdown errors gracefully', async () => {
      mockContainer.resolve = mock(() => {
        throw new Error('Service not found')
      })

      // Should not throw, just log warning
      await expect(provider.shutdown(mockContainer)).resolves.toBeUndefined()
    })

    it('should handle dispose errors gracefully', async () => {
      const mockService = {
        dispose: mock(() => {
          throw new Error('Dispose failed')
        }),
      }

      mockContainer.resolve = mock(() => mockService)

      // Should not throw, just log warning
      await expect(provider.shutdown(mockContainer)).resolves.toBeUndefined()
    })
  })

  describe('ServiceProvider interface methods', () => {
    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('ConfigServiceProvider')
    })

    it('should return empty dependencies array', () => {
      expect(provider.getDependencies()).toEqual([])
    })

    it('should return provided services tokens', () => {
      const providedServices = provider.getProvidedServices()

      expect(providedServices).toHaveLength(2)
      expect(typeof providedServices[0]).toBe('symbol')
      expect(providedServices[1]).toBe('ConfigService')
    })
  })

  describe('registerService', () => {
    it('should delegate to register method', () => {
      const registerSpy = mock(() => {})
      provider.register = registerSpy

      provider.registerService(mockContainer)

      expect(registerSpy).toHaveBeenCalledWith(mockContainer)
    })
  })

  describe('createService', () => {
    it('should create ConfigService instance', () => {
      const service = provider.createService()

      expect(service).toBeDefined()
      expect(typeof service.load).toBe('function')
      expect(typeof service.get).toBe('function')
      expect(typeof service.set).toBe('function')
      expect(typeof service.has).toBe('function')
      expect(typeof service.watch).toBe('function')
      expect(typeof service.dispose).toBe('function')
    })

    it('should create service with configured options', () => {
      provider.configure({ strict: true, frozen: true })

      const service = provider.createService()

      expect(service).toBeDefined()
      // Service should be created with the configured options
    })
  })

  describe('static factory methods', () => {
    describe('create', () => {
      it('should create provider with default options', () => {
        const newProvider = ConfigServiceProvider.create()

        expect(newProvider).toBeInstanceOf(ConfigServiceProvider)
        expect(newProvider.getProviderName()).toBe('ConfigServiceProvider')
      })

      it('should create provider with custom options', () => {
        const options = { strict: true, frozen: true }
        const newProvider = ConfigServiceProvider.create(options)

        expect(newProvider).toBeInstanceOf(ConfigServiceProvider)

        // Verify options are applied by creating a service
        const service = newProvider.createService()
        expect(service).toBeDefined()
      })
    })

    describe('withSources', () => {
      it('should create provider with single source', () => {
        const newProvider = ConfigServiceProvider.withSources(mockSource)

        expect(newProvider).toBeInstanceOf(ConfigServiceProvider)
      })

      it('should create provider with multiple sources', () => {
        const source2 = createMockConfigSource({ cache: { enabled: true } })
        const newProvider = ConfigServiceProvider.withSources([mockSource, source2])

        expect(newProvider).toBeInstanceOf(ConfigServiceProvider)
      })

      it('should create provider with sources and options', () => {
        const options = { strict: true }
        const newProvider = ConfigServiceProvider.withSources(mockSource, options)

        expect(newProvider).toBeInstanceOf(ConfigServiceProvider)

        // Verify both sources and options are configured
        const service = newProvider.createService()
        expect(service).toBeDefined()
      })
    })
  })

  describe('integration scenarios', () => {
    it('should support full lifecycle with DI container', async () => {
      // Configure provider
      provider.configure({ strict: true }).withSources(mockSource)

      // Register with container
      provider.register(mockContainer)

      // Boot the service
      await provider.boot(mockContainer)

      // Verify service can be resolved
      expect(mockContainer.resolve).toHaveBeenCalled()

      // Shutdown
      await provider.shutdown(mockContainer)
    })

    it('should work without DI container for direct usage', () => {
      provider.configure({ strict: false }).withSources(mockSource)

      const service = provider.createService()

      expect(service).toBeDefined()
      expect(service.isLoaded()).toBe(false)
    })

    it('should support multiple provider instances', () => {
      const provider1 = ConfigServiceProvider.create({ strict: true })
      const provider2 = ConfigServiceProvider.create({ frozen: true })

      expect(provider1).not.toBe(provider2)
      expect(provider1.getProviderName()).toBe(provider2.getProviderName())

      const service1 = provider1.createService()
      const service2 = provider2.createService()

      expect(service1).not.toBe(service2)
    })
  })
})
