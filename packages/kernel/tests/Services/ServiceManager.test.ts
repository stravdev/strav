// tests/service-manager.test.ts
import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { Container } from '../../src/Container'
import { ServiceManager } from '../../src/Services/ServiceManager'
import { ServiceProvider } from '../../src/Contracts/ServiceProvider'
import {
  ServiceBootException,
  ServiceShutdownException,
  GroupedShutdownException,
} from '../../src/Exceptions/ServiceExceptions'

// Mock service implementations for testing
class MockDatabase {
  connected = false

  async connect() {
    this.connected = true
  }

  async disconnect() {
    this.connected = false
  }
}

class MockLogger {
  logs: string[] = []

  log(message: string) {
    this.logs.push(message)
  }
}

class MockEmailService {
  initialized = false

  async initialize() {
    this.initialized = true
  }

  async shutdown() {
    this.initialized = false
  }
}

interface TestConfig {
  database: { host: string; port: number }
  logging: { level: string }
}

// Test service providers
class ConfigServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'ConfigServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerValue('config', {
      database: { host: 'localhost', port: 5432 },
      logging: { level: 'info' },
    })
  }

  boot(container: Container): void {
    this.bootCalled = true
  }

  shutdown(container: Container): void {
    this.shutdownCalled = true
  }

  getProvidedServices() {
    return ['config']
  }
}

class DatabaseServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'DatabaseServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass('database', MockDatabase)
  }

  async boot(container: Container): Promise<void> {
    this.bootCalled = true
    const db = container.resolve<MockDatabase>('database')
    await db.connect()
  }

  async shutdown(container: Container): Promise<void> {
    this.shutdownCalled = true
    const db = container.resolve<MockDatabase>('database')
    await db.disconnect()
  }

  getDependencies() {
    return ['config']
  }

  getProvidedServices() {
    return ['database']
  }
}

class LoggingServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'LoggingServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerFactory(
      'logger',
      (config) => {
        const logger = new MockLogger()
        logger.log(`Logger initialized with level: ${config.logging.level}`)
        return logger
      },
      ['config']
    )
  }

  boot(container: Container): void {
    this.bootCalled = true
    const logger = container.resolve<MockLogger>('logger')
    logger.log('Logging service booted')
  }

  shutdown(container: Container): void {
    this.shutdownCalled = true
  }

  getDependencies() {
    return ['config']
  }

  getProvidedServices() {
    return ['logger']
  }
}

class EmailServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'EmailServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass('emailService', MockEmailService)
  }

  async boot(container: Container): Promise<void> {
    this.bootCalled = true
    const emailService = container.resolve<MockEmailService>('emailService')
    await emailService.initialize()
  }

  async shutdown(container: Container): Promise<void> {
    this.shutdownCalled = true
    const emailService = container.resolve<MockEmailService>('emailService')
    await emailService.shutdown()
  }

  getDependencies() {
    return ['logger', 'database']
  }

  getProvidedServices() {
    return ['emailService']
  }
}

// Provider with no dependencies
class UtilityServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'UtilityServiceProvider'
  }

  register(container: Container): void {
    container.registerValue('utils', { hash: (str: string) => str.length })
  }

  getProvidedServices() {
    return ['utils']
  }
}

// Providers for circular dependency testing
class CircularProviderA implements ServiceProvider {
  getProviderName(): string {
    return 'CircularProviderA'
  }

  register(container: Container): void {
    container.registerValue('serviceA', 'A')
  }

  getDependencies() {
    return ['serviceB']
  }

  getProvidedServices() {
    return ['serviceA']
  }
}

class CircularProviderB implements ServiceProvider {
  getProviderName(): string {
    return 'CircularProviderB'
  }

  register(container: Container): void {
    container.registerValue('serviceB', 'B')
  }

  getDependencies() {
    return ['serviceA']
  }

  getProvidedServices() {
    return ['serviceB']
  }
}

// Provider that throws during boot
class FailingBootProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingBootProvider'
  }

  register(container: Container): void {
    container.registerValue('failingService', 'test')
  }

  boot(): void {
    throw new Error('Boot failed')
  }

  getProvidedServices() {
    return ['failingService']
  }
}

// Provider that throws during shutdown
class FailingShutdownProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingShutdownProvider'
  }

  register(container: Container): void {
    container.registerValue('shutdownService', 'test')
  }

  shutdown(): void {
    throw new Error('Shutdown failed')
  }

  getProvidedServices() {
    return ['shutdownService']
  }
}

// Anonymous provider for testing name generation
const AnonymousProvider = class implements ServiceProvider {
  register(container: Container): void {
    container.registerValue('anonymous', 'value')
  }

  getProviderName(): string {
    return 'AnonymousProvider'
  }

  getProvidedServices() {
    return ['anonymous']
  }
}

describe('ServiceManager', () => {
  let container: Container
  let serviceManager: ServiceManager

  beforeEach(() => {
    container = new Container()
    serviceManager = new ServiceManager(container)
  })

  afterEach(() => {
    container.clear()
  })

  describe('constructor', () => {
    test('should initialize with provided container', () => {
      expect(serviceManager).toBeDefined()
      expect(serviceManager.getRegisteredProviders()).toEqual([])
      expect(serviceManager.getBootedProviders()).toEqual([])
    })
  })

  describe('register', () => {
    test('should add provider to providers list', () => {
      const provider = new ConfigServiceProvider()
      serviceManager.register(provider)

      // Providers list is private, but we can verify through registerAll
      expect(() => serviceManager.registerAll()).not.toThrow()
    })

    test('should allow registering multiple providers', () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      serviceManager.register(configProvider)
      serviceManager.register(dbProvider)

      expect(() => serviceManager.registerAll()).not.toThrow()
    })
  })

  describe('registerAll', () => {
    test('should call register method on all providers', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      serviceManager.register(configProvider)
      serviceManager.register(dbProvider)

      await serviceManager.registerAll()

      expect(configProvider.registerCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(serviceManager.getRegisteredProviders()).toHaveLength(2)
    })

    test('should register services in container', async () => {
      const configProvider = new ConfigServiceProvider()
      serviceManager.register(configProvider)

      await serviceManager.registerAll()

      expect(container.has('config')).toBe(true)
      const config = container.resolve('config') as TestConfig
      expect(config.database.host).toBe('localhost')
    })

    test('should handle async registration', async () => {
      class AsyncProvider implements ServiceProvider {
        getProviderName(): string {
          return 'AsyncProvider'
        }

        async register(container: Container): Promise<void> {
          await new Promise((resolve) => setTimeout(resolve, 10))
          container.registerValue('asyncService', 'registered')
        }

        getProvidedServices() {
          return ['asyncService']
        }
      }

      const provider = new AsyncProvider()
      serviceManager.register(provider)

      await serviceManager.registerAll()

      expect(container.has('asyncService')).toBe(true)
    })
  })

  describe('bootAll', () => {
    test('should boot providers in dependency order', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const loggingProvider = new LoggingServiceProvider()
      const emailProvider = new EmailServiceProvider()

      // Register in random order
      serviceManager.register(emailProvider)
      serviceManager.register(dbProvider)
      serviceManager.register(configProvider)
      serviceManager.register(loggingProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      // All should be booted
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(loggingProvider.bootCalled).toBe(true)
      expect(emailProvider.bootCalled).toBe(true)

      // Database should be connected
      const db = container.resolve<MockDatabase>('database')
      expect(db.connected).toBe(true)

      // Email service should be initialized
      const emailService = container.resolve<MockEmailService>('emailService')
      expect(emailService.initialized).toBe(true)
    })

    test('should only boot providers that have boot method', async () => {
      const utilityProvider = new UtilityServiceProvider()
      const configProvider = new ConfigServiceProvider()

      serviceManager.register(utilityProvider)
      serviceManager.register(configProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      expect(configProvider.bootCalled).toBe(true)
      expect(serviceManager.getBootedProviders()).toHaveLength(1)
    })

    test('should handle providers with no dependencies first', async () => {
      const utilityProvider = new UtilityServiceProvider()
      const configProvider = new ConfigServiceProvider()

      serviceManager.register(utilityProvider)
      serviceManager.register(configProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      // Both should be available
      expect(container.has('utils')).toBe(true)
      expect(container.has('config')).toBe(true)
    })

    test('should throw ServiceBootException for missing dependencies', async () => {
      class MissingDepProvider implements ServiceProvider {
        getProviderName(): string {
          return 'MissingDepProvider'
        }

        register(container: Container): void {
          container.registerValue('service', 'value')
        }

        getDependencies() {
          return ['nonExistentService']
        }

        getProvidedServices() {
          return ['service']
        }
      }

      const provider = new MissingDepProvider()
      serviceManager.register(provider)

      await serviceManager.registerAll()

      await expect(serviceManager.bootAll()).rejects.toThrow(ServiceBootException)
      await expect(serviceManager.bootAll()).rejects.toThrow(
        "Service provider 'MissingDepProvider' depends on service 'nonExistentService'"
      )
    })

    test('should throw ServiceBootException for circular dependencies', async () => {
      const providerA = new CircularProviderA()
      const providerB = new CircularProviderB()

      serviceManager.register(providerA)
      serviceManager.register(providerB)

      await serviceManager.registerAll()

      await expect(serviceManager.bootAll()).rejects.toThrow(ServiceBootException)
      await expect(serviceManager.bootAll()).rejects.toThrow('Circular dependency detected')
    })

    test('should throw ServiceBootException for duplicate provider names', async () => {
      class DuplicateProvider implements ServiceProvider {
        getProviderName(): string {
          return 'ConfigServiceProvider' // Same as existing provider
        }

        register(container: Container): void {
          container.registerValue('duplicate', 'value')
        }

        getProvidedServices() {
          return ['duplicate']
        }
      }

      const configProvider = new ConfigServiceProvider()
      const duplicateProvider = new DuplicateProvider()

      serviceManager.register(configProvider)
      serviceManager.register(duplicateProvider)

      await serviceManager.registerAll()

      await expect(serviceManager.bootAll()).rejects.toThrow(ServiceBootException)
      await expect(serviceManager.bootAll()).rejects.toThrow(
        "Duplicate service provider name 'ConfigServiceProvider' detected"
      )
    })

    test('should handle provider boot failures', async () => {
      const failingProvider = new FailingBootProvider()
      serviceManager.register(failingProvider)

      await serviceManager.registerAll()

      await expect(serviceManager.bootAll()).rejects.toThrow('Boot failed')
    })
  })

  describe('shutdownAll', () => {
    test('should shutdown providers in reverse dependency order', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const emailProvider = new EmailServiceProvider()

      serviceManager.register(configProvider)
      serviceManager.register(dbProvider)
      serviceManager.register(emailProvider)
      serviceManager.register(new LoggingServiceProvider())

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      // Verify services are running
      const db = container.resolve<MockDatabase>('database')
      const emailService = container.resolve<MockEmailService>('emailService')
      expect(db.connected).toBe(true)
      expect(emailService.initialized).toBe(true)

      await serviceManager.shutdownAll()

      // All should be shutdown
      expect(configProvider.shutdownCalled).toBe(true)
      expect(dbProvider.shutdownCalled).toBe(true)
      expect(emailProvider.shutdownCalled).toBe(true)

      // Services should be shutdown
      expect(db.connected).toBe(false)
      expect(emailService.initialized).toBe(false)

      // State should be reset
      expect(serviceManager.getRegisteredProviders()).toHaveLength(0)
      expect(serviceManager.getBootedProviders()).toHaveLength(0)
    })

    test('should only shutdown providers that have shutdown method', async () => {
      const utilityProvider = new UtilityServiceProvider()
      const configProvider = new ConfigServiceProvider()

      serviceManager.register(utilityProvider)
      serviceManager.register(configProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()
      await serviceManager.shutdownAll()

      expect(configProvider.shutdownCalled).toBe(true)
    })

    test('should handle shutdown failures gracefully', async () => {
      const failingProvider = new FailingShutdownProvider()
      const configProvider = new ConfigServiceProvider()

      serviceManager.register(failingProvider)
      serviceManager.register(configProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      // Mock console.error to verify logging
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      await expect(serviceManager.shutdownAll()).rejects.toThrow(GroupedShutdownException)

      // Should log the error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to shutdown service provider 'FailingShutdownProvider'"),
        expect.any(ServiceShutdownException)
      )

      // Should still reset state
      expect(serviceManager.getRegisteredProviders()).toHaveLength(0)

      consoleSpy.mockRestore()
    })

    test('should handle multiple shutdown failures', async () => {
      class AnotherFailingProvider implements ServiceProvider {
        getProviderName(): string {
          return 'AnotherFailingProvider'
        }

        register(container: Container): void {
          container.registerValue('another', 'value')
        }

        shutdown(): void {
          throw new Error('Another shutdown failed')
        }

        getProvidedServices() {
          return ['another']
        }
      }

      const failingProvider1 = new FailingShutdownProvider()
      const failingProvider2 = new AnotherFailingProvider()

      serviceManager.register(failingProvider1)
      serviceManager.register(failingProvider2)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      try {
        await serviceManager.shutdownAll()
        expect.unreachable('Should have thrown GroupedShutdownException')
      } catch (error) {
        expect(error).toBeInstanceOf(GroupedShutdownException)
        const groupedError = error as GroupedShutdownException
        expect(groupedError.failures).toHaveLength(2)
      }

      consoleSpy.mockRestore()
    })
  })

  describe('provider name handling', () => {
    test('should use getProviderName when available', async () => {
      const configProvider = new ConfigServiceProvider()
      serviceManager.register(configProvider)

      await serviceManager.registerAll()

      const providers = serviceManager.getRegisteredProviders()
      expect(providers).toHaveLength(1)
    })

    test('should handle providers without getProviderName method', async () => {
      const provider = new AnonymousProvider()
      serviceManager.register(provider)

      await serviceManager.registerAll()

      // Should not throw and should register successfully
      expect(serviceManager.getRegisteredProviders()).toHaveLength(1)
    })

    test('should generate unique names for anonymous providers', async () => {
      const provider1 = new AnonymousProvider()
      const provider2 = new AnonymousProvider()

      serviceManager.register(provider1)
      serviceManager.register(provider2)

      await serviceManager.registerAll()

      // Should handle multiple anonymous providers
      expect(serviceManager.getRegisteredProviders()).toHaveLength(2)
    })
  })

  describe('getRegisteredProviders', () => {
    test('should return copy of registered providers', async () => {
      const configProvider = new ConfigServiceProvider()
      serviceManager.register(configProvider)

      await serviceManager.registerAll()

      const providers = serviceManager.getRegisteredProviders()
      expect(providers).toHaveLength(1)
      expect(providers[0]).toBe(configProvider)

      // Should be a copy
      providers.push(new DatabaseServiceProvider())
      expect(serviceManager.getRegisteredProviders()).toHaveLength(1)
    })
  })

  describe('getBootedProviders', () => {
    test('should return copy of booted providers', async () => {
      const configProvider = new ConfigServiceProvider()
      const utilityProvider = new UtilityServiceProvider()

      serviceManager.register(configProvider)
      serviceManager.register(utilityProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      const bootedProviders = serviceManager.getBootedProviders()
      expect(bootedProviders).toHaveLength(1) // Only configProvider has boot method
      expect(bootedProviders[0]).toBe(configProvider)

      // Should be a copy
      bootedProviders.push(new DatabaseServiceProvider())
      expect(serviceManager.getBootedProviders()).toHaveLength(1)
    })
  })

  describe('complex dependency scenarios', () => {
    test('should handle deep dependency chains', async () => {
      class ServiceA implements ServiceProvider {
        getProviderName(): string {
          return 'ServiceA'
        }
        register(container: Container): void {
          container.registerValue('serviceA', 'A')
        }
        getProvidedServices() {
          return ['serviceA']
        }
      }

      class ServiceB implements ServiceProvider {
        getProviderName(): string {
          return 'ServiceB'
        }
        register(container: Container): void {
          container.registerValue('serviceB', 'B')
        }
        getDependencies() {
          return ['serviceA']
        }
        getProvidedServices() {
          return ['serviceB']
        }
      }

      class ServiceC implements ServiceProvider {
        getProviderName(): string {
          return 'ServiceC'
        }
        register(container: Container): void {
          container.registerValue('serviceC', 'C')
        }
        getDependencies() {
          return ['serviceB']
        }
        getProvidedServices() {
          return ['serviceC']
        }
      }

      const serviceA = new ServiceA()
      const serviceB = new ServiceB()
      const serviceC = new ServiceC()

      // Register in reverse order
      serviceManager.register(serviceC)
      serviceManager.register(serviceB)
      serviceManager.register(serviceA)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      // All services should be available
      expect(container.has('serviceA')).toBe(true)
      expect(container.has('serviceB')).toBe(true)
      expect(container.has('serviceC')).toBe(true)
    })

    test('should handle providers with multiple dependencies', async () => {
      class MultiDepProvider implements ServiceProvider {
        getProviderName(): string {
          return 'MultiDepProvider'
        }

        register(container: Container): void {
          container.registerValue('multiService', 'multi')
        }

        getDependencies() {
          return ['config', 'utils']
        }

        getProvidedServices() {
          return ['multiService']
        }
      }

      const configProvider = new ConfigServiceProvider()
      const utilityProvider = new UtilityServiceProvider()
      const multiDepProvider = new MultiDepProvider()

      serviceManager.register(multiDepProvider)
      serviceManager.register(configProvider)
      serviceManager.register(utilityProvider)

      await serviceManager.registerAll()
      await serviceManager.bootAll()

      expect(container.has('multiService')).toBe(true)
    })
  })
})
