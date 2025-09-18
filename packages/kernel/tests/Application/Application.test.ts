// tests/application.test.ts
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { Application } from '../../src/Application/Application'
import { Container } from '../../src/Container'
import { ServiceManager } from '../../src/Services/ServiceManager'
import { ServiceProvider } from '../../src/Contracts/ServiceProvider'
import {
  ApplicationBootException,
  ApplicationBootstrapException,
  ApplicationShutdownException,
} from '../../src/Exceptions/ApplicationExceptions'
import {
  ServiceBootException,
  GroupedShutdownException,
  ServiceShutdownException,
} from '../../src/Exceptions/ServiceExceptions'

// Mock service implementations
class MockService {
  initialized = false
  shutdown = false

  async initialize() {
    this.initialized = true
  }

  async close() {
    this.shutdown = true
    this.initialized = false
  }
}

class MockDatabase {
  connected = false
  migrated = false

  async connect() {
    this.connected = true
  }

  async migrate() {
    if (!this.connected) throw new Error('Database not connected')
    this.migrated = true
  }

  async disconnect() {
    this.connected = false
    this.migrated = false
  }
}

interface TestConfig {
  database: { host: string; port: number }
  app: { name: string; version: string }
}

interface TestUtils {
  hash: (str: string) => number
  uuid: () => string
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
      app: { name: 'TestApp', version: '1.0.0' },
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
    await db.migrate()
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

class MockServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'ServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass('service', MockService)
  }

  async boot(container: Container): Promise<void> {
    this.bootCalled = true
    const service = container.resolve<MockService>('service')
    await service.initialize()
  }

  async shutdown(container: Container): Promise<void> {
    this.shutdownCalled = true
    const service = container.resolve<MockService>('service')
    await service.close()
  }

  getDependencies() {
    return ['database']
  }

  getProvidedServices() {
    return ['service']
  }
}

// Provider without boot/shutdown methods
class UtilityServiceProvider implements ServiceProvider {
  registerCalled = false

  getProviderName(): string {
    return 'UtilityServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerValue('utils', {
      hash: (str: string) => str.length,
      uuid: () => 'test-uuid-123',
    })
  }

  getProvidedServices() {
    return ['utils']
  }
}

// Provider that fails during registration
class FailingRegistrationProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingRegistrationProvider'
  }

  register(): void {
    throw new Error('Registration failed')
  }

  getProvidedServices() {
    return ['failingService']
  }
}

// Provider that fails during boot
class FailingBootProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingBootProvider'
  }

  register(container: Container): void {
    container.registerValue('bootFailService', 'test')
  }

  boot(): void {
    throw new ServiceBootException('Boot failed for test')
  }

  getProvidedServices() {
    return ['bootFailService']
  }
}

// Provider that fails during shutdown
class FailingShutdownProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingShutdownProvider'
  }

  register(container: Container): void {
    container.registerValue('shutdownFailService', 'test')
  }

  boot(): void {
    // Boot successfully
  }

  shutdown(): void {
    throw new Error('Shutdown failed')
  }

  getProvidedServices() {
    return ['shutdownFailService']
  }
}

describe('Application', () => {
  let app: Application

  beforeEach(() => {
    app = new Application()
  })

  afterEach(async () => {
    try {
      if (app.isRunning()) {
        await app.shutdown()
      }
    } catch (error) {
      // Ignore shutdown errors in cleanup
    }
  })

  describe('constructor', () => {
    test('should initialize with new container and service manager', () => {
      expect(app.getContainer()).toBeInstanceOf(Container)
      expect(app.getServiceManager()).toBeInstanceOf(ServiceManager)
      expect(app.isRunning()).toBe(false)
    })

    test('should have separate instances for different applications', () => {
      const app2 = new Application()

      expect(app.getContainer()).not.toBe(app2.getContainer())
      expect(app.getServiceManager()).not.toBe(app2.getServiceManager())
    })
  })

  describe('getContainer', () => {
    test('should return the DI container instance', () => {
      const container = app.getContainer()

      expect(container).toBeInstanceOf(Container)

      // Should return the same instance on multiple calls
      expect(app.getContainer()).toBe(container)
    })
  })

  describe('getServiceManager', () => {
    test('should return the service manager instance', () => {
      const serviceManager = app.getServiceManager()

      expect(serviceManager).toBeInstanceOf(ServiceManager)

      // Should return the same instance on multiple calls
      expect(app.getServiceManager()).toBe(serviceManager)
    })
  })

  describe('register', () => {
    test('should register a service provider and return this for chaining', () => {
      const provider = new ConfigServiceProvider()

      const result = app.register(provider)

      expect(result).toBe(app)
      expect(app.getServiceManager().getRegisteredProviders()).toHaveLength(0) // Not registered until bootstrap
    })

    test('should allow registering multiple providers', () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      app.register(configProvider).register(dbProvider).register(serviceProvider)

      // Providers should be queued but not registered yet
      expect(app.getServiceManager().getRegisteredProviders()).toHaveLength(0)
    })

    test('should support method chaining', () => {
      const result = app
        .register(new ConfigServiceProvider())
        .register(new DatabaseServiceProvider())
        .register(new MockServiceProvider())

      expect(result).toBe(app)
    })
  })

  describe('bootstrap', () => {
    test('should bootstrap application and register all providers', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      app.register(configProvider).register(dbProvider)

      const result = await app.bootstrap()

      expect(result).toBe(app)
      expect(configProvider.registerCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(app.getServiceManager().getRegisteredProviders()).toHaveLength(2)

      // Services should be available in container
      expect(app.getContainer().has('config')).toBe(true)
      expect(app.getContainer().has('database')).toBe(true)
    })

    test('should throw ApplicationBootstrapException if already bootstrapped', async () => {
      app.register(new ConfigServiceProvider())

      await app.bootstrap()

      await expect(app.bootstrap()).rejects.toThrow(ApplicationBootstrapException)
      await expect(app.bootstrap()).rejects.toThrow('Application is already bootstrapped')
    })

    test('should handle registration failures', async () => {
      const failingProvider = new FailingRegistrationProvider()
      app.register(failingProvider)

      await expect(app.bootstrap()).rejects.toThrow('Registration failed')
    })

    test('should support method chaining after successful bootstrap', async () => {
      app.register(new ConfigServiceProvider())

      const result = await app.bootstrap()
      expect(result).toBe(app)
    })
  })

  describe('boot', () => {
    test('should boot application and call provider boot methods', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      app.register(configProvider).register(dbProvider).register(serviceProvider)

      await app.bootstrap()

      const result = await app.boot()

      expect(result).toBe(app)
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(serviceProvider.bootCalled).toBe(true)

      // Services should be initialized
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')

      expect(database.connected).toBe(true)
      expect(database.migrated).toBe(true)
      expect(service.initialized).toBe(true)

      expect(app.isRunning()).toBe(true)
    })

    test('should throw ApplicationBootException if not bootstrapped', async () => {
      await expect(app.boot()).rejects.toThrow(ApplicationBootException)
      await expect(app.boot()).rejects.toThrow('Application must be bootstrapped before booting')
    })

    test('should throw ApplicationBootException if already booted', async () => {
      app.register(new ConfigServiceProvider())

      await app.bootstrap()
      await app.boot()

      await expect(app.boot()).rejects.toThrow(ApplicationBootException)
      await expect(app.boot()).rejects.toThrow('Application is already booted')
    })

    test('should throw ApplicationBootException if boot fails', async () => {
      const failingProvider = new FailingBootProvider()
      app.register(failingProvider)

      await app.bootstrap()

      await expect(app.boot()).rejects.toThrow(ApplicationBootException)
      await expect(app.boot()).rejects.toThrow('Failed to boot all services')
    })

    test('should boot providers in dependency order', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      // Register in random order
      app.register(serviceProvider).register(configProvider).register(dbProvider)

      await app.bootstrap()
      await app.boot()

      // All should be booted successfully despite registration order
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(serviceProvider.bootCalled).toBe(true)
    })

    test('should only boot providers that have boot method', async () => {
      const configProvider = new ConfigServiceProvider()
      const utilityProvider = new UtilityServiceProvider()

      app.register(configProvider).register(utilityProvider)

      await app.bootstrap()
      await app.boot()

      expect(configProvider.bootCalled).toBe(true)
      expect(utilityProvider.registerCalled).toBe(true)

      // Utility provider should be registered but not in booted list
      expect(app.getServiceManager().getBootedProviders()).toHaveLength(1)
    })
  })

  describe('shutdown', () => {
    test('should shutdown application gracefully', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      app.register(configProvider).register(dbProvider).register(serviceProvider)

      await app.bootstrap()
      await app.boot()

      expect(app.isRunning()).toBe(true)

      await app.shutdown()

      expect(app.isRunning()).toBe(false)
      expect(configProvider.shutdownCalled).toBe(true)
      expect(dbProvider.shutdownCalled).toBe(true)
      expect(serviceProvider.shutdownCalled).toBe(true)

      // Services should be shutdown
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')

      expect(database.connected).toBe(false)
      expect(service.shutdown).toBe(true)
    })

    test('should handle shutdown when not booted', async () => {
      // Should not throw and should complete successfully
      expect(app.shutdown()).resolves.toBeUndefined()
      expect(app.isRunning()).toBe(false)
    })

    test('should handle shutdown when only bootstrapped', async () => {
      app.register(new ConfigServiceProvider())
      await app.bootstrap()

      // Should not throw
      expect(app.shutdown()).resolves.toBeUndefined()
      expect(app.isRunning()).toBe(false)
    })

    test('should throw ApplicationShutdownException on shutdown failures', async () => {
      const failingProvider = new FailingShutdownProvider()
      app.register(failingProvider)

      await app.bootstrap()
      await app.boot()

      // Mock console.error to verify logging
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      try {
        await app.shutdown()
        expect.unreachable('Should have thrown ApplicationShutdownException')
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationShutdownException)
        expect((error as Error).message).toBe('Failed to pre-shutdown all services')

        // Verify the underlying cause is GroupedShutdownException
        expect((error as Error).cause).toBeInstanceOf(GroupedShutdownException)

        // Verify console logging occurred
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to shutdown service provider 'FailingShutdownProvider'"),
          expect.any(ServiceShutdownException)
        )
      }

      consoleSpy.mockRestore()
    })

    test('should reset application state after shutdown', async () => {
      app.register(new ConfigServiceProvider())

      await app.bootstrap()
      await app.boot()

      expect(app.isRunning()).toBe(true)

      await app.shutdown()

      expect(app.isRunning()).toBe(false)

      // Should be able to bootstrap and boot again
      app.register(new ConfigServiceProvider())
      await expect(app.bootstrap()).resolves.toBe(app)
      await expect(app.boot()).resolves.toBe(app)
    })
  })

  describe('isRunning', () => {
    test('should return false for new application', () => {
      expect(app.isRunning()).toBe(false)
    })

    test('should return false after bootstrap only', async () => {
      app.register(new ConfigServiceProvider())
      await app.bootstrap()

      expect(app.isRunning()).toBe(false)
    })

    test('should return true after bootstrap and boot', async () => {
      app.register(new ConfigServiceProvider())

      await app.bootstrap()
      await app.boot()

      expect(app.isRunning()).toBe(true)
    })

    test('should return false after shutdown', async () => {
      app.register(new ConfigServiceProvider())

      await app.bootstrap()
      await app.boot()
      expect(app.isRunning()).toBe(true)

      await app.shutdown()
      expect(app.isRunning()).toBe(false)
    })
  })

  describe('run', () => {
    test('should bootstrap and boot application in one call', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      app.register(configProvider).register(dbProvider)

      await app.run()

      expect(configProvider.registerCalled).toBe(true)
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(app.isRunning()).toBe(true)
    })

    test('should handle bootstrap failures in run', async () => {
      const failingProvider = new FailingRegistrationProvider()
      app.register(failingProvider)

      await expect(app.run()).rejects.toThrow('Registration failed')
      expect(app.isRunning()).toBe(false)
    })

    test('should handle boot failures in run', async () => {
      const failingProvider = new FailingBootProvider()
      app.register(failingProvider)

      await expect(app.run()).rejects.toThrow(ApplicationBootException)
      expect(app.isRunning()).toBe(false)
    })

    test('should throw if already bootstrapped', async () => {
      app.register(new ConfigServiceProvider())
      await app.bootstrap()

      await expect(app.run()).rejects.toThrow(ApplicationBootstrapException)
    })
  })

  describe('complete lifecycle', () => {
    test('should handle complete application lifecycle', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()
      const utilityProvider = new UtilityServiceProvider()

      // Registration
      app
        .register(configProvider)
        .register(dbProvider)
        .register(serviceProvider)
        .register(utilityProvider)

      expect(app.isRunning()).toBe(false)

      // Bootstrap
      await app.bootstrap()
      expect(app.isRunning()).toBe(false)
      expect(app.getServiceManager().getRegisteredProviders()).toHaveLength(4)

      // Boot
      await app.boot()
      expect(app.isRunning()).toBe(true)

      // Verify services are available and initialized
      const config = app.getContainer().resolve('config') as TestConfig
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')
      const utils = app.getContainer().resolve('utils') as TestUtils

      expect(config.app.name).toBe('TestApp')
      expect(database.connected).toBe(true)
      expect(database.migrated).toBe(true)
      expect(service.initialized).toBe(true)
      expect(utils.hash('test')).toBe(4)

      // Shutdown
      await app.shutdown()
      expect(app.isRunning()).toBe(false)

      // Verify cleanup
      expect(database.connected).toBe(false)
      expect(service.shutdown).toBe(true)
    })

    test('should handle multiple startup and shutdown cycles', async () => {
      const configProvider = new ConfigServiceProvider()

      // First cycle
      app.register(configProvider)
      await app.run()
      expect(app.isRunning()).toBe(true)
      await app.shutdown()
      expect(app.isRunning()).toBe(false)

      // Second cycle
      app.register(new ConfigServiceProvider()) // New instance
      await app.run()
      expect(app.isRunning()).toBe(true)
      await app.shutdown()
      expect(app.isRunning()).toBe(false)
    })
  })

  describe('error scenarios', () => {
    test('should maintain consistent state on bootstrap failure', async () => {
      const failingProvider = new FailingRegistrationProvider()
      app.register(failingProvider)

      await expect(app.bootstrap()).rejects.toThrow()

      expect(app.isRunning()).toBe(false)

      // Should be able to register a working provider and try again
      const newApp = new Application()
      newApp.register(new ConfigServiceProvider())
      await expect(newApp.bootstrap()).resolves.toBe(newApp)
    })

    test('should maintain consistent state on boot failure', async () => {
      const failingProvider = new FailingBootProvider()
      app.register(failingProvider)

      await app.bootstrap()
      await expect(app.boot()).rejects.toThrow()

      expect(app.isRunning()).toBe(false)
    })

    test('should handle mixed provider types', async () => {
      const normalProvider = new ConfigServiceProvider()
      const utilityProvider = new UtilityServiceProvider() // No boot/shutdown
      const dbProvider = new DatabaseServiceProvider()

      app.register(normalProvider).register(utilityProvider).register(dbProvider)

      await app.run()

      expect(app.isRunning()).toBe(true)
      expect(normalProvider.bootCalled).toBe(true)
      expect(utilityProvider.registerCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)

      await app.shutdown()

      expect(app.isRunning()).toBe(false)
      expect(normalProvider.shutdownCalled).toBe(true)
      expect(dbProvider.shutdownCalled).toBe(true)
    })
  })
})
