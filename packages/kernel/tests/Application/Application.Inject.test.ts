import 'reflect-metadata'
import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { Application, Container, Inject, ServiceProvider, ApplicationBootException } from '@strav/kernel'

// @Inject decorated services for testing
@Inject()
class ConfigurationService {
  constructor(private environment = 'test') {}

  getDatabaseUrl() {
    return `postgresql://localhost:5432/app_${this.environment}`
  }

  getAppConfig() {
    return {
      name: 'TestApplication',
      version: '2.0.0',
      port: 3000,
    }
  }

  getEnvironment() {
    return this.environment
  }
}

@Inject()
class LoggerService {
  private logs: string[] = []

  constructor(
    private config: ConfigurationService,
    private level = 'info'
  ) {}

  log(message: string) {
    const timestamp = new Date().toISOString()
    const appName = this.config.getAppConfig().name
    const logEntry = `[${timestamp}] [${this.level}] [${appName}] ${message}`
    this.logs.push(logEntry)
    return logEntry
  }

  error(message: string) {
    return this.log(`ERROR: ${message}`)
  }

  getLogs() {
    return [...this.logs]
  }

  clear() {
    this.logs = []
  }
}

@Inject()
class DatabaseService {
  private connected = false
  private initialized = false

  constructor(
    private config: ConfigurationService,
    private logger: LoggerService,
    private poolSize = 10
  ) {}

  async connect() {
    const url = this.config.getDatabaseUrl()
    this.logger.log(`Connecting to database: ${url}`)
    this.connected = true
    this.logger.log('Database connected successfully')
  }

  async initialize() {
    if (!this.connected) {
      throw new Error('Cannot initialize database: not connected')
    }
    this.logger.log('Initializing database schema')
    this.initialized = true
    this.logger.log('Database initialization complete')
  }

  async disconnect() {
    this.logger.log('Disconnecting from database')
    this.connected = false
    this.initialized = false
    this.logger.log('Database disconnected')
  }

  isConnected() {
    return this.connected
  }

  isInitialized() {
    return this.initialized
  }

  getPoolSize() {
    return this.poolSize
  }
}

@Inject()
class CacheService {
  private cache = new Map<string, any>()
  private connected = false

  constructor(
    private config: ConfigurationService,
    private logger: LoggerService,
    private ttl = 3600
  ) {}

  async connect() {
    this.logger.log('Connecting to Redis cache')
    this.connected = true
    this.logger.log('Cache service connected')
  }

  async disconnect() {
    this.logger.log('Disconnecting from cache')
    this.cache.clear()
    this.connected = false
    this.logger.log('Cache service disconnected')
  }

  set(key: string, value: any) {
    if (!this.connected) throw new Error('Cache not connected')
    this.cache.set(key, value)
    this.logger.log(`Cache set: ${key}`)
  }

  get(key: string) {
    if (!this.connected) throw new Error('Cache not connected')
    const value = this.cache.get(key)
    this.logger.log(`Cache get: ${key} ${value ? 'HIT' : 'MISS'}`)
    return value
  }

  isConnected() {
    return this.connected
  }

  getTTL() {
    return this.ttl
  }
}

@Inject()
class UserService {
  constructor(
    private database: DatabaseService,
    private cache: CacheService,
    private logger: LoggerService,
    private maxUsers = 10000
  ) {}

  async createUser(userData: { name: string; email: string }) {
    if (!this.database.isConnected()) {
      throw new Error('Database not available')
    }

    this.logger.log(`Creating user: ${userData.name}`)

    const user = {
      id: Date.now(),
      ...userData,
      createdAt: new Date(),
    }

    // Cache the user
    if (this.cache.isConnected()) {
      this.cache.set(`user:${user.id}`, user)
    }

    this.logger.log(`User created successfully: ${user.id}`)
    return user
  }

  async getUser(id: number) {
    // Try cache first
    if (this.cache.isConnected()) {
      const cached = this.cache.get(`user:${id}`)
      if (cached) {
        this.logger.log(`User ${id} found in cache`)
        return cached
      }
    }

    if (!this.database.isConnected()) {
      throw new Error('Database not available')
    }

    this.logger.log(`Fetching user ${id} from database`)
    // Simulate database fetch
    return { id, name: `User ${id}`, email: `user${id}@example.com` }
  }

  getMaxUsers() {
    return this.maxUsers
  }
}

@Inject()
class NotificationService {
  constructor(
    private userService: UserService,
    private logger: LoggerService,
    private config: ConfigurationService,
    private retryAttempts = 3
  ) {}

  async sendWelcomeEmail(userId: number) {
    const user = await this.userService.getUser(userId)
    const appName = this.config.getAppConfig().name

    this.logger.log(`Sending welcome email to user ${userId}`)

    const emailContent = `Welcome to ${appName}, ${user.name}!`

    this.logger.log(`Email sent successfully to ${user.email}`)
    return {
      to: user.email,
      subject: `Welcome to ${appName}`,
      content: emailContent,
      sentAt: new Date(),
    }
  }

  getRetryAttempts() {
    return this.retryAttempts
  }
}

// Service providers that use @Inject decorated services
class InjectableConfigProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'InjectableConfigProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass(ConfigurationService)
  }

  boot(): void {
    this.bootCalled = true
  }

  shutdown(): void {
    this.shutdownCalled = true
  }

  getProvidedServices() {
    return [ConfigurationService]
  }
}

class InjectableLoggerProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'InjectableLoggerProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass(LoggerService)
  }

  boot(): void {
    this.bootCalled = true
  }

  shutdown(): void {
    this.shutdownCalled = true
  }

  getDependencies() {
    return [ConfigurationService]
  }

  getProvidedServices() {
    return [LoggerService]
  }
}

class InjectableDatabaseProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'InjectableDatabaseProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass(DatabaseService)
  }

  async boot(container: Container): Promise<void> {
    this.bootCalled = true
    const db = container.resolve(DatabaseService)
    await db.connect()
    await db.initialize()
  }

  async shutdown(container: Container): Promise<void> {
    this.shutdownCalled = true
    const db = container.resolve(DatabaseService)
    await db.disconnect()
  }

  getDependencies() {
    return [ConfigurationService, LoggerService]
  }

  getProvidedServices() {
    return [DatabaseService]
  }
}

class InjectableCacheProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'InjectableCacheProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    container.registerClass(CacheService)
  }

  async boot(container: Container): Promise<void> {
    this.bootCalled = true
    const cache = container.resolve(CacheService)
    await cache.connect()
  }

  async shutdown(container: Container): Promise<void> {
    this.shutdownCalled = true
    const cache = container.resolve(CacheService)
    await cache.disconnect()
  }

  getDependencies() {
    return [ConfigurationService, LoggerService]
  }

  getProvidedServices() {
    return [CacheService]
  }
}

class InjectableApplicationServicesProvider implements ServiceProvider {
  registerCalled = false
  bootCalled = false
  shutdownCalled = false

  getProviderName(): string {
    return 'InjectableApplicationServicesProvider'
  }

  register(container: Container): void {
    this.registerCalled = true
    // Register multiple services at once
    container.registerInjectables([UserService, NotificationService])
  }

  boot(): void {
    this.bootCalled = true
    // Application services don't need explicit boot logic
  }

  shutdown(): void {
    this.shutdownCalled = true
  }

  getDependencies() {
    return [DatabaseService, CacheService, LoggerService]
  }

  getProvidedServices() {
    return [UserService, NotificationService]
  }
}

// Provider that demonstrates mixed registration styles
class MixedRegistrationProvider implements ServiceProvider {
  getProviderName(): string {
    return 'MixedRegistrationProvider'
  }

  register(container: Container): void {
    // Mix of registration styles in one provider
    container.registerClass(ConfigurationService) // Auto-detected dependencies
    container.registerValue('apiKey', 'test-api-key-123')
    container.registerFactory('timestamp', () => Date.now())
    container.registerInjectables([LoggerService]) // Batch registration
  }

  getProvidedServices() {
    return [ConfigurationService, LoggerService, 'apiKey', 'timestamp']
  }
}

// Provider that fails during boot with decorated service
class FailingInjectableProvider implements ServiceProvider {
  getProviderName(): string {
    return 'FailingInjectableProvider'
  }

  register(container: Container): void {
    container.registerClass(ConfigurationService)
  }

  boot(): void {
    throw new Error('Injectable service boot failed')
  }

  getProvidedServices() {
    return [ConfigurationService]
  }
}

describe('Application with @Inject Decorator', () => {
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
      // Ignore cleanup errors
    }
  })

  describe('Basic @Inject integration', () => {
    test('should register and resolve @Inject decorated services', async () => {
      const configProvider = new InjectableConfigProvider()
      const loggerProvider = new InjectableLoggerProvider()

      app.register(configProvider).register(loggerProvider)

      await app.bootstrap()

      // Services should be registered
      expect(app.getContainer().has(ConfigurationService)).toBe(true)
      expect(app.getContainer().has(LoggerService)).toBe(true)

      // Should resolve with proper dependency injection
      const logger = app.getContainer().resolve(LoggerService)
      expect(logger).toBeInstanceOf(LoggerService)

      const logMessage = logger.log('Test message')
      expect(logMessage).toContain('[TestApplication]')
      expect(logMessage).toContain('Test message')
    })

    test('should handle complex dependency chains in application lifecycle', async () => {
      app
        .register(new InjectableConfigProvider())
        .register(new InjectableLoggerProvider())
        .register(new InjectableDatabaseProvider())
        .register(new InjectableCacheProvider())
        .register(new InjectableApplicationServicesProvider())

      await app.run()
      expect(app.isRunning()).toBe(true)

      // Test the complete dependency chain
      const notificationService = app.getContainer().resolve(NotificationService)
      const userService = app.getContainer().resolve(UserService)
      const database = app.getContainer().resolve(DatabaseService)
      const cache = app.getContainer().resolve(CacheService)
      const logger = app.getContainer().resolve(LoggerService)

      // Verify all services are properly initialized
      expect(database.isConnected()).toBe(true)
      expect(database.isInitialized()).toBe(true)
      expect(cache.isConnected()).toBe(true)

      // Test the complete workflow
      const user = await userService.createUser({
        name: 'John Doe',
        email: 'john@example.com',
      })
      expect(user.id).toBeDefined()
      expect(user.name).toBe('John Doe')

      // Test notification service using user service
      const notification = await notificationService.sendWelcomeEmail(user.id)
      expect(notification.to).toBe('john@example.com')
      expect(notification.subject).toContain('TestApplication')

      // Verify logging happened
      const logs = logger.getLogs()
      expect(logs.length).toBeGreaterThan(0)
      expect(logs.some((log) => log.includes('Database connected'))).toBe(true)
      expect(logs.some((log) => log.includes('Cache service connected'))).toBe(true)
      expect(logs.some((log) => log.includes('Creating user: John Doe'))).toBe(true)
    })
  })

  describe('Application lifecycle with @Inject', () => {
    test('should boot services in correct dependency order', async () => {
      const configProvider = new InjectableConfigProvider()
      const loggerProvider = new InjectableLoggerProvider()
      const dbProvider = new InjectableDatabaseProvider()
      const cacheProvider = new InjectableCacheProvider()

      // Register in random order to test dependency sorting
      app
        .register(dbProvider)
        .register(cacheProvider)
        .register(configProvider)
        .register(loggerProvider)

      await app.run()

      // All should have booted successfully despite registration order
      expect(configProvider.bootCalled).toBe(true)
      expect(loggerProvider.bootCalled).toBe(true)
      expect(dbProvider.bootCalled).toBe(true)
      expect(cacheProvider.bootCalled).toBe(true)

      // Verify services are operational
      const database = app.getContainer().resolve(DatabaseService)
      const cache = app.getContainer().resolve(CacheService)

      expect(database.isConnected()).toBe(true)
      expect(cache.isConnected()).toBe(true)
    })

    test('should shutdown services in reverse dependency order', async () => {
      const providers = [
        new InjectableConfigProvider(),
        new InjectableLoggerProvider(),
        new InjectableDatabaseProvider(),
        new InjectableCacheProvider(),
      ]

      app
        .register(providers[0])
        .register(providers[1])
        .register(providers[2])
        .register(providers[3])

      await app.run()

      const database = app.getContainer().resolve(DatabaseService)
      const cache = app.getContainer().resolve(CacheService)
      const logger = app.getContainer().resolve(LoggerService)

      expect(database.isConnected()).toBe(true)
      expect(cache.isConnected()).toBe(true)

      await app.shutdown()

      // Services should be shutdown
      expect(database.isConnected()).toBe(false)
      expect(cache.isConnected()).toBe(false)

      // All providers should have been shutdown
      providers.forEach((provider) => {
        expect(provider.shutdownCalled).toBe(true)
      })

      expect(app.isRunning()).toBe(false)
    })
  })

  describe('Advanced @Inject features', () => {
    test('should handle mixed registration styles in same application', async () => {
      app.register(new MixedRegistrationProvider())

      await app.bootstrap()

      // Should have all different types of services
      expect(app.getContainer().has(ConfigurationService)).toBe(true)
      expect(app.getContainer().has(LoggerService)).toBe(true)
      expect(app.getContainer().has('apiKey')).toBe(true)
      expect(app.getContainer().has('timestamp')).toBe(true)

      // Verify they work correctly
      const config = app.getContainer().resolve(ConfigurationService)
      const logger = app.getContainer().resolve(LoggerService)
      const apiKey = app.getContainer().resolve<string>('apiKey')
      const timestamp = app.getContainer().resolve<number>('timestamp')

      expect(config.getEnvironment()).toBe('test')
      expect(typeof logger.log('test')).toBe('string')
      expect(apiKey).toBe('test-api-key-123')
      expect(typeof timestamp).toBe('number')
    })

    test('should maintain singleton behavior across application lifecycle', async () => {
      app.register(new InjectableConfigProvider())
      app.register(new InjectableLoggerProvider())

      await app.run()

      // Resolve same services multiple times
      const config1 = app.getContainer().resolve(ConfigurationService)
      const config2 = app.getContainer().resolve(ConfigurationService)
      const logger1 = app.getContainer().resolve(LoggerService)
      const logger2 = app.getContainer().resolve(LoggerService)

      // Should be same instances
      expect(config1).toBe(config2)
      expect(logger1).toBe(logger2)

      // Verify state is shared
      logger1.log('First message')
      logger2.log('Second message')

      expect(logger1.getLogs()).toEqual(logger2.getLogs())
      expect(logger1.getLogs().length).toBe(2)
    })

    test('should work with batch registration via registerInjectables', async () => {
      app.register(new InjectableConfigProvider())
      app.register(new InjectableLoggerProvider())
      app.register(new InjectableDatabaseProvider())
      app.register(new InjectableCacheProvider())
      app.register(new InjectableApplicationServicesProvider())

      await app.run()

      // Services registered via registerInjectables should work
      const userService = app.getContainer().resolve(UserService)
      const notificationService = app.getContainer().resolve(NotificationService)

      expect(userService).toBeInstanceOf(UserService)
      expect(notificationService).toBeInstanceOf(NotificationService)

      // Test cross-service functionality
      const user = await userService.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
      })

      const notification = await notificationService.sendWelcomeEmail(user.id)
      expect(notification.to).toBe('jane@example.com')
    })

    test('should validate primitive parameters with defaults are preserved', async () => {
      app.register(new InjectableConfigProvider())
      app.register(new InjectableLoggerProvider())
      app.register(new InjectableDatabaseProvider())
      app.register(new InjectableCacheProvider())
      app.register(new InjectableApplicationServicesProvider())

      await app.run()

      // Check that default values are preserved
      const database = app.getContainer().resolve(DatabaseService)
      const cache = app.getContainer().resolve(CacheService)
      const userService = app.getContainer().resolve(UserService)
      const notificationService = app.getContainer().resolve(NotificationService)

      expect(database.getPoolSize()).toBe(10) // Default parameter
      expect(cache.getTTL()).toBe(3600) // Default parameter
      expect(userService.getMaxUsers()).toBe(10000) // Default parameter
      expect(notificationService.getRetryAttempts()).toBe(3) // Default parameter
    })
  })

  describe('Error handling with @Inject', () => {
    test('should handle boot failures with @Inject services', async () => {
      app.register(new FailingInjectableProvider())

      await app.bootstrap()

      await expect(app.boot()).rejects.toThrow(ApplicationBootException)
      expect(app.isRunning()).toBe(false)
    })

    test('should maintain state consistency on failure with @Inject services', async () => {
      const failingProvider = new FailingInjectableProvider()
      app.register(failingProvider)

      await app.bootstrap()
      expect(app.getContainer().has(ConfigurationService)).toBe(true)

      await expect(app.boot()).rejects.toThrow()
      expect(app.isRunning()).toBe(false)

      // Should be able to create a new app and try again
      const newApp = new Application()
      newApp.register(new InjectableConfigProvider())

      await expect(newApp.bootstrap()).resolves.toBe(newApp)
      await expect(newApp.boot()).resolves.toBe(newApp)
      expect(newApp.isRunning()).toBe(true)

      await newApp.shutdown()
    })
  })

  describe('Service introspection with @Inject', () => {
    test('should provide correct service information for @Inject services', async () => {
      app.register(new InjectableConfigProvider())
      app.register(new InjectableLoggerProvider())

      await app.bootstrap()

      const configInfo = app.getContainer().getServiceInfo(ConfigurationService)
      expect(configInfo?.useClass).toBe(ConfigurationService)
      expect(configInfo?.deps).toEqual([]) // No dependencies

      const loggerInfo = app.getContainer().getServiceInfo(LoggerService)
      expect(loggerInfo?.useClass).toBe(LoggerService)
      expect(loggerInfo?.deps).toContain(ConfigurationService) // Auto-detected dependency
    })

    test('should list all registered tokens including @Inject services', async () => {
      app.register(new InjectableConfigProvider())
      app.register(new InjectableLoggerProvider())

      await app.bootstrap()

      const tokens = app.getContainer().getRegisteredTokens()
      expect(tokens).toContain(ConfigurationService)
      expect(tokens).toContain(LoggerService)
      expect(tokens).toHaveLength(2)
    })
  })

  describe('Real-world scenarios with @Inject', () => {
    test('should simulate complete web application startup', async () => {
      // Simulate a typical web application setup
      app
        .register(new InjectableConfigProvider())
        .register(new InjectableLoggerProvider())
        .register(new InjectableDatabaseProvider())
        .register(new InjectableCacheProvider())
        .register(new InjectableApplicationServicesProvider())

      const startTime = Date.now()
      await app.run()
      const endTime = Date.now()

      expect(app.isRunning()).toBe(true)

      // Simulate user registration flow
      const userService = app.getContainer().resolve(UserService)
      const notificationService = app.getContainer().resolve(NotificationService)
      const logger = app.getContainer().resolve(LoggerService)

      const user = await userService.createUser({
        name: 'Application User',
        email: 'user@webapp.com',
      })

      await notificationService.sendWelcomeEmail(user.id)

      // Verify application flow
      const logs = logger.getLogs()
      expect(logs.some((log) => log.includes('Database connected'))).toBe(true)
      expect(logs.some((log) => log.includes('Creating user: Application User'))).toBe(true)
      expect(logs.some((log) => log.includes('Sending welcome email'))).toBe(true)

      // Simulate graceful shutdown
      await app.shutdown()
      expect(app.isRunning()).toBe(false)

      // Verify cleanup
      const database = app.getContainer().resolve(DatabaseService)
      const cache = app.getContainer().resolve(CacheService)
      expect(database.isConnected()).toBe(false)
      expect(cache.isConnected()).toBe(false)
    })

    test('should handle application restart cycle', async () => {
      // First startup
      app.register(new InjectableConfigProvider()).register(new InjectableLoggerProvider())

      await app.run()
      expect(app.isRunning()).toBe(true)

      const logger1 = app.getContainer().resolve(LoggerService)
      logger1.log('First session message')

      await app.shutdown()
      expect(app.isRunning()).toBe(false)

      // Second startup (new application instance)
      const newApp = new Application()
      newApp.register(new InjectableConfigProvider()).register(new InjectableLoggerProvider())

      await newApp.run()
      expect(newApp.isRunning()).toBe(true)

      const logger2 = newApp.getContainer().resolve(LoggerService)
      logger2.log('Second session message')

      // Should be different instances
      expect(logger1).not.toBe(logger2)
      expect(logger1.getLogs()).not.toEqual(logger2.getLogs())

      await newApp.shutdown()
    })
  })
})
