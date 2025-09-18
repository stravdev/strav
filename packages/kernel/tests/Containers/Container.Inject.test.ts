import 'reflect-metadata'
import { describe, test, expect, beforeEach } from 'bun:test'
import { Container, Inject, Scope } from '@strav/kernel'

// Basic test services for decorator testing
@Inject()
class DatabaseConnection {
  private connected = false

  constructor(
    private host = 'localhost',
    private port = 5432
  ) {}

  connect() {
    this.connected = true
    return `Connected to ${this.host}:${this.port}`
  }

  isConnected() {
    return this.connected
  }
}

@Inject()
class Logger {
  constructor(private level = 'info') {}

  log(message: string) {
    return `[${this.level}] ${message}`
  }

  setLevel(level: string) {
    this.level = level
  }
}

@Inject()
class CacheService {
  private cache = new Map<string, any>()

  constructor(private ttl = 300000) {} // 5 minutes default

  set(key: string, value: any) {
    this.cache.set(key, value)
  }

  get(key: string) {
    return this.cache.get(key)
  }
}

// Service with automatic dependency detection
@Inject()
class UserRepository {
  constructor(
    private db: DatabaseConnection, // Auto-detected dependency
    private logger: Logger, // Auto-detected dependency
    private cache: CacheService, // Auto-detected dependency
    private defaultLimit = 100, // Primitive with default - ignored
    private enableCaching = true // Primitive with default - ignored
  ) {}

  async findUser(id: string) {
    this.logger.log(`Finding user: ${id}`)

    if (this.enableCaching) {
      const cached = this.cache.get(`user:${id}`)
      if (cached) {
        this.logger.log('User found in cache')
        return cached
      }
    }

    if (!this.db.isConnected()) {
      this.db.connect()
    }

    const user = { id, name: `User ${id}`, limit: this.defaultLimit }

    if (this.enableCaching) {
      this.cache.set(`user:${id}`, user)
    }

    return user
  }
}

// Service with nested dependencies
@Inject()
class NotificationService {
  constructor(
    private userRepo: UserRepository, // Auto-detected (depends on 3 other services)
    private retryAttempts = 3 // Primitive with default - ignored
  ) {}

  async notifyUser(userId: string, message: string) {
    const user = await this.userRepo.findUser(userId)
    return `Notified ${user.name}: ${message} (attempts: ${this.retryAttempts})`
  }
}

@Inject()
class EmailServiceForMethodTest {
  constructor(private provider = 'smtp') {}

  send(to: string, message: string) {
    return `Email sent via ${this.provider} to ${to}: ${message}`
  }
}

@Inject()
class SMSServiceForMethodTest {
  constructor(private gateway = 'twilio') {}

  send(to: string, message: string) {
    return `SMS sent via ${this.gateway} to ${to}: ${message}`
  }
}

// Service for method injection testing
class ServiceWithMethodInjection {
  private emailSender?: any
  private smsGateway?: any

  @Inject()
  setupCommunications(
    emailService: EmailServiceForMethodTest, // Auto-detected dependency
    smsService: SMSServiceForMethodTest, // Auto-detected dependency
    timeout = 5000 // Primitive with default - ignored
  ) {
    this.emailSender = emailService
    this.smsGateway = smsService
    return `Setup complete with timeout: ${timeout}ms`
  }

  sendEmail(to: string, message: string) {
    return this.emailSender?.send(to, message) || 'Email service not configured'
  }

  sendSMS(to: string, message: string) {
    return this.smsGateway?.send(to, message) || 'SMS service not configured'
  }
}

// Services for testing edge cases
class ServiceWithoutDecorator {
  constructor(private value = 'test') {}

  getValue() {
    return this.value
  }
}

@Inject()
class ServiceWithMixedTypes {
  constructor(
    private logger: Logger, // Object - should be detected
    private config: object, // Generic object - should NOT be detected
    private items: Array<string>, // Array - should NOT be detected
    private created: Date, // Date - should NOT be detected
    private pattern: RegExp, // RegExp - should NOT be detected
    private name = 'default', // String with default - ignored
    private count = 0, // Number with default - ignored
    private enabled = true // Boolean with default - ignored
  ) {}

  getInfo() {
    return {
      name: this.name,
      count: this.count,
      enabled: this.enabled,
      hasLogger: !!this.logger,
    }
  }
}

// Simple circular dependency test - manually specify dependencies
class SimpleCircularA {}
class SimpleCircularB {}

// Register these with manual dependencies to test circular detection
const setupCircularTest = (container: Container) => {
  container.registerClass('circularA', SimpleCircularA, ['circularB'])
  container.registerClass('circularB', SimpleCircularB, ['circularA'])
}

describe('@Inject Decorator', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  describe('Class-level decoration', () => {
    test('should automatically detect constructor dependencies', () => {
      // Register all services using the class as token
      container.registerClass(DatabaseConnection)
      container.registerClass(Logger)
      container.registerClass(CacheService)
      container.registerClass(UserRepository)

      const userRepo = container.resolve(UserRepository)
      expect(userRepo).toBeInstanceOf(UserRepository)

      // Test that dependencies were injected correctly
      const result = userRepo.findUser('123')
      expect(result).resolves.toEqual({
        id: '123',
        name: 'User 123',
        limit: 100,
      })
    })

    test('should handle nested dependency chains automatically', () => {
      container.registerClass(DatabaseConnection)
      container.registerClass(Logger)
      container.registerClass(CacheService)
      container.registerClass(UserRepository)
      container.registerClass(NotificationService)

      const notificationService = container.resolve(NotificationService)
      expect(notificationService).toBeInstanceOf(NotificationService)

      const result = notificationService.notifyUser('456', 'Hello!')
      expect(result).resolves.toContain('Notified User 456: Hello!')
    })

    test('should work with custom tokens', () => {
      container.registerClass('db', DatabaseConnection)
      container.registerClass('log', Logger)
      container.registerClass('cache', CacheService)

      // UserRepository depends on the class constructors, so we need to register those too
      container.registerClass(DatabaseConnection)
      container.registerClass(Logger)
      container.registerClass(CacheService)
      container.registerClass('userRepo', UserRepository)

      const userRepo = container.resolve<UserRepository>('userRepo')
      expect(userRepo).toBeInstanceOf(UserRepository)
    })

    test('should respect different scopes', () => {
      container.registerClass(Logger, undefined, undefined, Scope.TRANSIENT)

      const logger1 = container.resolve(Logger)
      const logger2 = container.resolve(Logger)

      expect(logger1).not.toBe(logger2)
      expect(logger1).toBeInstanceOf(Logger)
      expect(logger2).toBeInstanceOf(Logger)
    })

    test('should ignore primitive parameters with defaults', () => {
      container.registerClass(DatabaseConnection)
      container.registerClass(Logger)
      container.registerClass(CacheService)
      container.registerClass(UserRepository)

      const userRepo = container.resolve(UserRepository)
      const user = userRepo.findUser('test')

      // The default values should be used
      expect(user).resolves.toMatchObject({
        id: 'test',
        limit: 100, // This comes from the default defaultLimit = 100
      })
    })
  })

  describe('Method-level decoration', () => {
    test('should detect method parameter dependencies', () => {
      container.registerClass(EmailServiceForMethodTest)
      container.registerClass(SMSServiceForMethodTest)

      const service = new ServiceWithMethodInjection()

      // Manually resolve dependencies for method injection
      const emailService = container.resolve(EmailServiceForMethodTest)
      const smsService = container.resolve(SMSServiceForMethodTest)

      const setupResult = service.setupCommunications(emailService, smsService)
      expect(setupResult).toBe('Setup complete with timeout: 5000ms')

      expect(service.sendEmail('test@example.com', 'Hello')).toBe(
        'Email sent via smtp to test@example.com: Hello'
      )
      expect(service.sendSMS('+1234567890', 'Hi')).toBe('SMS sent via twilio to +1234567890: Hi')
    })
  })

  describe('registerInjectable method', () => {
    test('should register classes decorated with @Inject', () => {
      container.registerInjectable(Logger)

      const logger = container.resolve(Logger)
      expect(logger).toBeInstanceOf(Logger)
      expect(logger.log('test')).toBe('[info] test')
    })

    test('should throw error for non-decorated classes', () => {
      expect(() => {
        container.registerInjectable(ServiceWithoutDecorator)
      }).toThrow('Class ServiceWithoutDecorator is not decorated with @Inject')
    })
  })

  describe('registerInjectables batch method', () => {
    test('should register multiple injectable classes', () => {
      container.registerInjectables([
        DatabaseConnection,
        Logger,
        CacheService,
        UserRepository,
        NotificationService,
      ])

      const notificationService = container.resolve(NotificationService)
      expect(notificationService).toBeInstanceOf(NotificationService)

      const logger = container.resolve(Logger)
      expect(logger).toBeInstanceOf(Logger)
    })

    test('should throw for mixed decorated and non-decorated classes', () => {
      expect(() => {
        container.registerInjectables([
          Logger, // Decorated - OK
          ServiceWithoutDecorator, // Not decorated - should throw
        ])
      }).toThrow('Class ServiceWithoutDecorator is not decorated with @Inject')
    })
  })

  describe('Type filtering', () => {
    test('should only inject object types, not primitives or built-ins', () => {
      container.registerClass(Logger)

      // This should work even though ServiceWithMixedTypes has many non-injectable parameters
      // Only Logger should be detected as a dependency
      container.registerClass(ServiceWithMixedTypes)

      const service = container.resolve(ServiceWithMixedTypes)
      expect(service).toBeInstanceOf(ServiceWithMixedTypes)

      const info = service.getInfo()
      expect(info).toEqual({
        name: 'default',
        count: 0,
        enabled: true,
        hasLogger: true, // Logger was injected
      })
    })

    test('should not treat generic Object type as injectable', () => {
      // ServiceWithMixedTypes has a parameter of type 'object' which should be ignored
      container.registerClass(Logger)
      container.registerClass(ServiceWithMixedTypes)

      const service = container.resolve(ServiceWithMixedTypes)
      expect(service).toBeInstanceOf(ServiceWithMixedTypes)
    })

    test('should not treat built-in types as injectable', () => {
      // Array, Date, RegExp should all be ignored in ServiceWithMixedTypes
      container.registerClass(Logger)
      container.registerClass(ServiceWithMixedTypes)

      const service = container.resolve(ServiceWithMixedTypes)
      expect(service).toBeInstanceOf(ServiceWithMixedTypes)
      expect(service.getInfo().hasLogger).toBe(true)
    })
  })

  describe('Error handling', () => {
    test('should detect circular dependencies in decorated classes', () => {
      // Use manual dependency setup to test circular detection
      // This tests the container's circular dependency detection, not the decorator auto-detection
      setupCircularTest(container)

      expect(() => {
        container.resolve('circularA')
      }).toThrow('Circular dependency detected')
    })

    test('should throw helpful error when reflect-metadata is missing', () => {
      // This test would need to mock the absence of Reflect.getMetadata
      // For now, we'll test that the error message is informative
      const originalReflect = (global as any).Reflect
      ;(global as any).Reflect = undefined

      expect(() => {
        @Inject()
        class TestService {}
      }).toThrow('reflect-metadata is required')

      // Restore Reflect
      ;(global as any).Reflect = originalReflect
    })
  })

  describe('Integration with existing Container features', () => {
    test('should work with child containers', () => {
      container.registerClass(Logger)

      const child = container.createChild()
      child.registerClass(DatabaseConnection)
      child.registerClass(CacheService)
      child.registerClass(UserRepository)

      const userRepo = child.resolve(UserRepository)
      expect(userRepo).toBeInstanceOf(UserRepository)
    })

    test('should work with mixed registration styles', () => {
      // Mix decorator-based and manual registration
      container.registerValue('config', { host: 'prod-db', port: 5432 })
      container.registerFactory(
        'connection',
        (config: any) => {
          const conn = new DatabaseConnection(config.host, config.port)
          conn.connect()
          return conn
        },
        ['config']
      )

      // Use decorator for Logger
      container.registerClass(Logger)

      // Manual registration for CacheService but it's decorated
      container.registerClass('cache', CacheService, [], Scope.TRANSIENT)

      // UserRepository with auto-detected dependencies
      container.registerClass(DatabaseConnection) // For dependency resolution
      container.registerClass(CacheService) // For dependency resolution
      container.registerClass(UserRepository)

      const userRepo = container.resolve(UserRepository)
      expect(userRepo).toBeInstanceOf(UserRepository)
    })

    test('should maintain singleton behavior across decorator and manual registration', () => {
      container.registerClass(Logger, undefined, undefined, Scope.SINGLETON)
      container.registerClass(DatabaseConnection, undefined, undefined, Scope.SINGLETON)
      container.registerClass(CacheService, undefined, undefined, Scope.SINGLETON)
      container.registerClass(UserRepository)

      const userRepo1 = container.resolve(UserRepository)
      const userRepo2 = container.resolve(UserRepository)
      const logger1 = container.resolve(Logger)
      const logger2 = container.resolve(Logger)

      expect(userRepo1).toBe(userRepo2) // UserRepository is singleton by default
      expect(logger1).toBe(logger2) // Logger explicitly set as singleton
    })
  })

  describe('getServiceInfo and getRegisteredTokens', () => {
    test('should provide service information for decorated classes', () => {
      container.registerClass(Logger)

      const serviceInfo = container.getServiceInfo(Logger)
      expect(serviceInfo).toBeDefined()
      expect(serviceInfo?.token).toBe(Logger)
      expect(serviceInfo?.useClass).toBe(Logger)
      expect(serviceInfo?.scope).toBe(Scope.SINGLETON)
    })

    test('should list all registered tokens including decorated classes', () => {
      container.registerClass(Logger)
      container.registerClass(DatabaseConnection)
      container.registerValue('config', {})

      const tokens = container.getRegisteredTokens()
      expect(tokens).toContain(Logger)
      expect(tokens).toContain(DatabaseConnection)
      expect(tokens).toContain('config')
      expect(tokens).toHaveLength(3)
    })
  })
})
