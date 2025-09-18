// tests/kernel.test.ts
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { Kernel } from '../../src/Application/Kernel'
import { Application } from '../../src/Application/Application'
import { Container } from '../../src/Container'
import { ServiceProvider } from '../../src/Contracts/ServiceProvider'
import {
  ApplicationBootException,
  ApplicationBootstrapException,
  ApplicationShutdownException,
} from '../../src/Exceptions/ApplicationExceptions'

// Mock service implementations
class MockService {
  initialized = false
  stopped = false

  async initialize() {
    this.initialized = true
  }

  async stop() {
    this.stopped = true
    this.initialized = false
  }
}

class MockDatabase {
  connected = false

  async connect() {
    this.connected = true
  }

  async disconnect() {
    this.connected = false
  }
}

class MockHttpServer {
  listening = false
  port?: number

  listen(port: number) {
    this.listening = true
    this.port = port
  }

  close() {
    this.listening = false
    this.port = undefined
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
      app: { name: 'TestApp', port: 3000 },
    })
  }

  boot(): void {
    this.bootCalled = true
  }

  shutdown(): void {
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

class HttpServiceProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'HttpServiceProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass('httpServer', MockHttpServer)
  }

  boot(container: Container): void {
    this.bootCalled = true
    const server = container.resolve<MockHttpServer>('httpServer')
    const config = container.resolve<any>('config')
    server.listen(config.app.port)
  }

  shutdown(container: Container): void {
    this.shutdownCalled = true
    const server = container.resolve<MockHttpServer>('httpServer')
    server.close()
  }

  getDependencies() {
    return ['config']
  }

  getProvidedServices() {
    return ['httpServer']
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
    await service.stop()
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
    throw new Error('Boot failed')
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

describe('Kernel', () => {
  let kernel: Kernel

  beforeEach(() => {
    kernel = new Kernel()
  })

  afterEach(async () => {
    try {
      await kernel.stop()
    } catch (error) {
      // Ignore shutdown errors in cleanup
    }
  })

  describe('constructor', () => {
    test('should initialize with empty providers array', () => {
      const kernel = new Kernel()

      expect(kernel.getApplication()).toBeInstanceOf(Application)
      expect(kernel.getApplication().isRunning()).toBe(false)
    })

    test('should initialize with provided service providers', () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      const kernel = new Kernel([configProvider, dbProvider])

      expect(kernel.getApplication()).toBeInstanceOf(Application)
      expect(kernel.getApplication().isRunning()).toBe(false)
    })

    test('should create isolated kernel instances', () => {
      const kernel1 = new Kernel()
      const kernel2 = new Kernel()

      expect(kernel1.getApplication()).not.toBe(kernel2.getApplication())
      expect(kernel1.getApplication().getContainer()).not.toBe(
        kernel2.getApplication().getContainer()
      )
    })
  })

  describe('getApplication', () => {
    test('should return the underlying application instance', () => {
      const app = kernel.getApplication()

      expect(app).toBeInstanceOf(Application)

      // Should return the same instance on multiple calls
      expect(kernel.getApplication()).toBe(app)
    })

    test('should provide access to application features', () => {
      const app = kernel.getApplication()

      expect(app.getContainer()).toBeInstanceOf(Container)
      expect(typeof app.isRunning).toBe('function')
      expect(typeof app.register).toBe('function')
    })
  })

  describe('registerServiceProvider', () => {
    test('should register a service provider and return this for chaining', () => {
      const provider = new ConfigServiceProvider()

      const result = kernel.registerServiceProvider(provider)

      expect(result).toBe(kernel)
    })

    test('should allow registering multiple providers', () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const httpProvider = new HttpServiceProvider()

      kernel
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)
        .registerServiceProvider(httpProvider)

      // Providers should not be registered with application yet
      expect(kernel.getApplication().getServiceManager().getRegisteredProviders()).toHaveLength(0)
    })

    test('should support method chaining', () => {
      const result = kernel
        .registerServiceProvider(new ConfigServiceProvider())
        .registerServiceProvider(new DatabaseServiceProvider())
        .registerServiceProvider(new HttpServiceProvider())

      expect(result).toBe(kernel)
    })
  })

  describe('start', () => {
    test('should start application with no providers', async () => {
      const app = await kernel.start()

      expect(app).toBeInstanceOf(Application)
      expect(app.isRunning()).toBe(true)
      expect(app.getServiceManager().getRegisteredProviders()).toHaveLength(0)
    })

    test('should start application with constructor providers', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()

      const kernel = new Kernel([configProvider, dbProvider])
      const app = await kernel.start()

      expect(app.isRunning()).toBe(true)
      expect(configProvider.registerCalled).toBe(true)
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)

      // Services should be available
      expect(app.getContainer().has('config')).toBe(true)
      expect(app.getContainer().has('database')).toBe(true)

      // Database should be connected
      const database = app.getContainer().resolve<MockDatabase>('database')
      expect(database.connected).toBe(true)
    })

    test('should start application with registered providers', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      kernel
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)
        .registerServiceProvider(serviceProvider)

      const app = await kernel.start()

      expect(app.isRunning()).toBe(true)
      expect(configProvider.registerCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(serviceProvider.registerCalled).toBe(true)

      // Check boot order and service initialization
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')

      expect(database.connected).toBe(true)
      expect(service.initialized).toBe(true)
    })

    test('should start application with mixed provider sources', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const httpProvider = new HttpServiceProvider()
      const utilityProvider = new UtilityServiceProvider()

      // Mix constructor and registered providers
      const kernel = new Kernel([configProvider, dbProvider])
      kernel.registerServiceProvider(httpProvider).registerServiceProvider(utilityProvider)

      const app = await kernel.start()

      expect(app.isRunning()).toBe(true)

      // All providers should be processed
      expect(configProvider.registerCalled).toBe(true)
      expect(dbProvider.registerCalled).toBe(true)
      expect(httpProvider.registerCalled).toBe(true)
      expect(utilityProvider.registerCalled).toBe(true)

      // HTTP server should be listening
      const httpServer = app.getContainer().resolve<MockHttpServer>('httpServer')
      expect(httpServer.listening).toBe(true)
      expect(httpServer.port).toBe(3000)
    })

    test('should handle registration failures', async () => {
      const failingProvider = new FailingRegistrationProvider()
      kernel.registerServiceProvider(failingProvider)

      await expect(kernel.start()).rejects.toThrow('Registration failed')
    })

    test('should handle boot failures', async () => {
      const failingProvider = new FailingBootProvider()
      kernel.registerServiceProvider(failingProvider)

      await expect(kernel.start()).rejects.toThrow(ApplicationBootException)
    })

    test('should start providers in dependency order', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()
      const httpProvider = new HttpServiceProvider()

      // Register in random order
      kernel
        .registerServiceProvider(serviceProvider)
        .registerServiceProvider(httpProvider)
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)

      const app = await kernel.start()

      // All should be started successfully despite registration order
      expect(app.isRunning()).toBe(true)
      expect(configProvider.bootCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(serviceProvider.bootCalled).toBe(true)
      expect(httpProvider.bootCalled).toBe(true)
    })

    test('should return the same application instance', async () => {
      const app1 = kernel.getApplication()
      const app2 = await kernel.start()

      expect(app1).toBe(app2)
    })
  })

  describe('stop', () => {
    test('should stop application gracefully', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()
      const httpProvider = new HttpServiceProvider()

      kernel
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)
        .registerServiceProvider(serviceProvider)
        .registerServiceProvider(httpProvider)

      const app = await kernel.start()
      expect(app.isRunning()).toBe(true)

      await kernel.stop()

      expect(app.isRunning()).toBe(false)
      expect(configProvider.shutdownCalled).toBe(true)
      expect(dbProvider.shutdownCalled).toBe(true)
      expect(serviceProvider.shutdownCalled).toBe(true)
      expect(httpProvider.shutdownCalled).toBe(true)

      // Services should be stopped
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')
      const httpServer = app.getContainer().resolve<MockHttpServer>('httpServer')

      expect(database.connected).toBe(false)
      expect(service.stopped).toBe(true)
      expect(httpServer.listening).toBe(false)
    })

    test('should handle stop when not started', async () => {
      // Should not throw
      await expect(kernel.stop()).resolves.toBeUndefined()
    })

    test('should handle shutdown failures', async () => {
      const failingProvider = new FailingShutdownProvider()
      kernel.registerServiceProvider(failingProvider)

      await kernel.start()

      // Mock console.error to verify logging
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      try {
        await kernel.stop()
        expect.unreachable('Should have thrown ApplicationShutdownException')
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationShutdownException)
        expect((error as Error).message).toBe('Failed to pre-shutdown all services')

        // Verify console logging occurred
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to shutdown service provider 'FailingShutdownProvider'"),
          expect.any(Object)
        )
      }

      consoleSpy.mockRestore()
    })

    test('should stop providers in reverse dependency order', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()

      kernel
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)
        .registerServiceProvider(serviceProvider)

      await kernel.start()
      await kernel.stop()

      // All should be shutdown
      expect(configProvider.shutdownCalled).toBe(true)
      expect(dbProvider.shutdownCalled).toBe(true)
      expect(serviceProvider.shutdownCalled).toBe(true)
    })
  })

  describe('complete lifecycle', () => {
    test('should handle complete kernel lifecycle', async () => {
      const configProvider = new ConfigServiceProvider()
      const dbProvider = new DatabaseServiceProvider()
      const serviceProvider = new MockServiceProvider()
      const utilityProvider = new UtilityServiceProvider()

      // Register providers
      kernel
        .registerServiceProvider(configProvider)
        .registerServiceProvider(dbProvider)
        .registerServiceProvider(serviceProvider)
        .registerServiceProvider(utilityProvider)

      // Start
      const app = await kernel.start()
      expect(app.isRunning()).toBe(true)

      // Verify services are available and initialized
      const config = app.getContainer().resolve('config') as TestConfig
      const database = app.getContainer().resolve<MockDatabase>('database')
      const service = app.getContainer().resolve<MockService>('service')
      const utils = app.getContainer().resolve('utils') as TestUtils

      expect(config.app.name).toBe('TestApp')
      expect(database.connected).toBe(true)
      expect(service.initialized).toBe(true)
      expect(utils.hash('test')).toBe(4)

      // Stop
      await kernel.stop()
      expect(app.isRunning()).toBe(false)

      // Verify cleanup
      expect(database.connected).toBe(false)
      expect(service.stopped).toBe(true)
    })

    test('should support multiple start/stop cycles', async () => {
      const configProvider = new ConfigServiceProvider()

      // First cycle
      kernel.registerServiceProvider(configProvider)
      let app = await kernel.start()
      expect(app.isRunning()).toBe(true)
      await kernel.stop()
      expect(app.isRunning()).toBe(false)

      // Second cycle with new kernel
      const newKernel = new Kernel([new ConfigServiceProvider()])
      app = await newKernel.start()
      expect(app.isRunning()).toBe(true)
      await newKernel.stop()
      expect(app.isRunning()).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    test('should work with web application pattern', async () => {
      class WebKernel extends Kernel {
        constructor() {
          super([
            new ConfigServiceProvider(),
            new DatabaseServiceProvider(),
            new HttpServiceProvider(),
          ])
        }

        async startWebServer() {
          const app = await this.start()
          const httpServer = app.getContainer().resolve<MockHttpServer>('httpServer')
          expect(httpServer.listening).toBe(true)
          return app
        }
      }

      const webKernel = new WebKernel()
      const app = await webKernel.startWebServer()

      expect(app.isRunning()).toBe(true)

      const httpServer = app.getContainer().resolve<MockHttpServer>('httpServer')
      expect(httpServer.port).toBe(3000)

      await webKernel.stop()
    })

    test('should work with CLI application pattern', async () => {
      class CLIKernel extends Kernel {
        constructor(command: string) {
          const providers: Array<ServiceProvider> = [new ConfigServiceProvider()]

          if (command === 'database') {
            providers.push(new DatabaseServiceProvider())
          }

          super(providers)
        }

        async executeCommand(command: string) {
          const app = await this.start()

          if (command === 'database') {
            const db = app.getContainer().resolve<MockDatabase>('database')
            return `Database connected: ${db.connected}`
          }

          return 'Command executed'
        }
      }

      const cliKernel = new CLIKernel('database')
      const result = await cliKernel.executeCommand('database')

      expect(result).toBe('Database connected: true')

      await cliKernel.stop()
    })

    test('should work with test application pattern', async () => {
      class TestKernel extends Kernel {
        constructor() {
          super([new ConfigServiceProvider(), new UtilityServiceProvider()])
        }

        static async createForTest() {
          const kernel = new TestKernel()
          const app = await kernel.start()
          return { kernel, app }
        }

        async reset() {
          // Reset logic would go here
          const app = this.getApplication()
          const utils = app.getContainer().resolve<any>('utils')
          // Mock reset operation
          utils.resetCalled = true
        }
      }

      const { kernel: testKernel, app } = await TestKernel.createForTest()

      expect(app.isRunning()).toBe(true)

      await testKernel.reset()
      const utils = app.getContainer().resolve<any>('utils')
      expect(utils.resetCalled).toBe(true)

      await testKernel.stop()
    })

    test('should handle conditional provider registration', async () => {
      const isProduction = false
      const enableMetrics = true

      kernel.registerServiceProvider(new ConfigServiceProvider())

      if (isProduction) {
        kernel.registerServiceProvider(new DatabaseServiceProvider())
      } else {
        kernel.registerServiceProvider(new UtilityServiceProvider())
      }

      if (enableMetrics) {
        kernel.registerServiceProvider(new HttpServiceProvider())
      }

      const app = await kernel.start()

      expect(app.getContainer().has('config')).toBe(true)
      expect(app.getContainer().has('database')).toBe(false)
      expect(app.getContainer().has('utils')).toBe(true)
      expect(app.getContainer().has('httpServer')).toBe(true)
    })
  })

  describe('error scenarios', () => {
    test('should maintain state consistency on start failure', async () => {
      const failingProvider = new FailingRegistrationProvider()
      kernel.registerServiceProvider(failingProvider)

      await expect(kernel.start()).rejects.toThrow()

      const app = kernel.getApplication()
      expect(app.isRunning()).toBe(false)
    })

    test('should handle mixed success and failure scenarios', async () => {
      const configProvider = new ConfigServiceProvider()
      const failingProvider = new FailingBootProvider()

      kernel.registerServiceProvider(configProvider).registerServiceProvider(failingProvider)

      await expect(kernel.start()).rejects.toThrow()

      const app = kernel.getApplication()
      expect(app.isRunning()).toBe(false)

      // Config should be registered but app shouldn't be running
      expect(configProvider.registerCalled).toBe(true)
    })

    test('should handle providers without lifecycle methods', async () => {
      const configProvider = new ConfigServiceProvider()
      const utilityProvider = new UtilityServiceProvider() // No boot/shutdown

      kernel.registerServiceProvider(configProvider).registerServiceProvider(utilityProvider)

      const app = await kernel.start()
      expect(app.isRunning()).toBe(true)

      expect(configProvider.bootCalled).toBe(true)
      expect(utilityProvider.registerCalled).toBe(true)

      await kernel.stop()
      expect(app.isRunning()).toBe(false)
      expect(configProvider.shutdownCalled).toBe(true)
    })
  })
})
