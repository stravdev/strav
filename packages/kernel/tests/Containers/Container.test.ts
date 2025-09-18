import { describe, test, expect, beforeEach } from 'bun:test'
import { Container, Scope, ServiceNotFoundException, CircularDependencyException } from '../../src'

// Test services
class DatabaseService {
  private connected = false

  connect() {
    this.connected = true
    return 'Connected to database'
  }

  isConnected() {
    return this.connected
  }

  query(sql: string) {
    if (!this.connected) throw new Error('Database not connected')
    return `Result for: ${sql}`
  }
}

class UserService {
  constructor(private db: DatabaseService) {}

  getUser(id: string) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`)
  }
}

class EmailService {
  constructor(private config: { apiKey: string }) {}

  send(to: string, message: string) {
    return `Sent "${message}" to ${to} using ${this.config.apiKey}`
  }
}

class NotificationService {
  constructor(
    private email: EmailService,
    private user: UserService
  ) {}

  notifyUser(userId: string, message: string) {
    const user = this.user.getUser(userId)
    return this.email.send('user@example.com', message)
  }
}

// Circular dependency test classes
class ServiceA {
  constructor(private serviceB: ServiceB) {}
  getValue() {
    return 'A'
  }
}

class ServiceB {
  constructor(private serviceA: ServiceA) {}
  getValue() {
    return 'B'
  }
}

interface Credentials {
  apiKey: string
  port: number
}

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  describe('registerValue', () => {
    test('should register and resolve static values', () => {
      const config = { apiKey: 'test-key', port: 3000 }
      container.registerValue('config', config)

      const resolved = container.resolve('config') as Credentials
      expect(resolved).toBe(config)
      expect(resolved.apiKey).toBe('test-key')
    })

    test('should register primitive values', () => {
      container.registerValue('string', 'hello')
      container.registerValue('number', 42)
      container.registerValue('boolean', true)

      expect(container.resolve<string>('string')).toBe('hello')
      expect(container.resolve<number>('number')).toBe(42)
      expect(container.resolve<boolean>('boolean')).toBe(true)
    })
  })

  describe('registerClass', () => {
    test('should register and resolve classes without dependencies', () => {
      container.registerClass('db', DatabaseService)

      const db = container.resolve<DatabaseService>('db')
      expect(db).toBeInstanceOf(DatabaseService)
      expect(db.connect()).toBe('Connected to database')
    })

    test('should register classes with dependencies', () => {
      container.registerClass('db', DatabaseService).registerClass('user', UserService, ['db'])

      const userService = container.resolve<UserService>('user')
      expect(userService).toBeInstanceOf(UserService)

      const db = container.resolve<DatabaseService>('db')
      db.connect()

      expect(userService.getUser('123')).toBe('Result for: SELECT * FROM users WHERE id = 123')
    })

    test('should handle complex dependency chains', () => {
      container
        .registerValue('config', { apiKey: 'test-key' })
        .registerClass('db', DatabaseService)
        .registerClass('email', EmailService, ['config'])
        .registerClass('user', UserService, ['db'])
        .registerClass('notification', NotificationService, ['email', 'user'])

      const notification = container.resolve<NotificationService>('notification')
      const db = container.resolve<DatabaseService>('db')
      db.connect()

      const result = notification.notifyUser('123', 'Hello World')
      expect(result).toBe('Sent "Hello World" to user@example.com using test-key')
    })

    test('should respect singleton scope by default', () => {
      container.registerClass('db', DatabaseService)

      const db1 = container.resolve<DatabaseService>('db')
      const db2 = container.resolve<DatabaseService>('db')

      expect(db1).toBe(db2)
      expect(db1).toBeInstanceOf(DatabaseService)
    })

    test('should create new instances for transient scope', () => {
      container.registerClass('db', DatabaseService, [], Scope.TRANSIENT)

      const db1 = container.resolve<DatabaseService>('db')
      const db2 = container.resolve<DatabaseService>('db')

      expect(db1).not.toBe(db2)
      expect(db1).toBeInstanceOf(DatabaseService)
      expect(db2).toBeInstanceOf(DatabaseService)
    })
  })

  describe('registerFactory', () => {
    test('should register and resolve factories without dependencies', () => {
      container.registerFactory('logger', () => ({
        log: (msg: string) => `LOG: ${msg}`,
        error: (msg: string) => `ERROR: ${msg}`,
      }))

      const logger = container.resolve<any>('logger')
      expect(logger.log('test')).toBe('LOG: test')
      expect(logger.error('error')).toBe('ERROR: error')
    })

    test('should register factories with dependencies', () => {
      container.registerValue('env', 'development').registerFactory(
        'logger',
        (env: string) => ({
          log: (msg: string) => `[${env}] ${msg}`,
        }),
        ['env']
      )

      const logger = container.resolve<any>('logger')
      expect(logger.log('test')).toBe('[development] test')
    })

    test('should respect factory scopes', () => {
      let counter = 0
      container.registerFactory(
        'counter',
        () => ({
          value: ++counter,
        }),
        [],
        Scope.TRANSIENT
      )

      const counter1 = container.resolve<any>('counter')
      const counter2 = container.resolve<any>('counter')

      expect(counter1.value).toBe(1)
      expect(counter2.value).toBe(2)
    })

    test('should cache singleton factories', () => {
      let counter = 0
      container.registerFactory(
        'counter',
        () => ({
          value: ++counter,
        }),
        [],
        Scope.SINGLETON
      )

      const counter1 = container.resolve<any>('counter')
      const counter2 = container.resolve<any>('counter')

      expect(counter1.value).toBe(1)
      expect(counter2.value).toBe(1)
      expect(counter1).toBe(counter2)
    })
  })

  describe('register (generic)', () => {
    test('should register using generic register method', () => {
      container.register({
        token: 'custom',
        useClass: DatabaseService,
        deps: [],
        scope: Scope.SINGLETON,
      })

      const service = container.resolve<DatabaseService>('custom')
      expect(service).toBeInstanceOf(DatabaseService)
    })

    test('should register factory using generic register', () => {
      container.register({
        token: 'factory',
        useFactory: (x: number) => ({ result: x * 2 }),
        deps: ['number'],
      })

      container.registerValue('number', 5)
      const result = container.resolve<any>('factory')
      expect(result.result).toBe(10)
    })
  })

  describe('error handling', () => {
    test('should throw ServiceNotFoundError for unregistered services', () => {
      expect(() => {
        container.resolve('nonexistent')
      }).toThrow(ServiceNotFoundException)

      expect(() => {
        container.resolve('nonexistent')
      }).toThrow('Service not found: nonexistent')
    })

    test('should throw CircularDependencyError for circular dependencies', () => {
      container
        .registerClass('serviceA', ServiceA, ['serviceB'])
        .registerClass('serviceB', ServiceB, ['serviceA'])

      expect(() => {
        container.resolve('serviceA')
      }).toThrow(CircularDependencyException)

      expect(() => {
        container.resolve('serviceA')
      }).toThrow('Circular dependency detected')
    })

    test('should throw error for invalid service definitions', () => {
      container.register({
        token: 'invalid',
        // No useClass, useFactory, or useValue
        deps: [],
      })

      expect(() => {
        container.resolve('invalid')
      }).toThrow('Invalid service definition for: invalid')
    })
  })

  describe('token types', () => {
    test('should work with string tokens', () => {
      container.registerClass('database', DatabaseService)
      const db = container.resolve<DatabaseService>('database')
      expect(db).toBeInstanceOf(DatabaseService)
    })

    test('should work with symbol tokens', () => {
      const DB_TOKEN = Symbol('database')
      container.registerClass(DB_TOKEN, DatabaseService)
      const db = container.resolve<DatabaseService>(DB_TOKEN)
      expect(db).toBeInstanceOf(DatabaseService)
    })

    test('should work with constructor tokens', () => {
      container.registerClass(DatabaseService, DatabaseService)
      const db = container.resolve(DatabaseService)
      expect(db).toBeInstanceOf(DatabaseService)
    })
  })

  describe('utility methods', () => {
    test('has() should return true for registered services', () => {
      container.registerClass('db', DatabaseService)
      expect(container.has('db')).toBe(true)
      expect(container.has('nonexistent')).toBe(false)
    })

    test('clear() should remove all services and singletons', () => {
      container.registerClass('db', DatabaseService).registerValue('config', { key: 'value' })

      expect(container.has('db')).toBe(true)
      expect(container.has('config')).toBe(true)

      container.clear()

      expect(container.has('db')).toBe(false)
      expect(container.has('config')).toBe(false)
      expect(() => container.resolve('db')).toThrow(ServiceNotFoundException)
    })

    test('createChild() should create container with parent services', () => {
      container.registerClass('db', DatabaseService).registerValue('config', { key: 'parent' })

      const child = container.createChild()

      // Child should have access to parent services
      expect(child.has('db')).toBe(true)
      expect(child.has('config')).toBe(true)

      const db = child.resolve<DatabaseService>('db')
      expect(db).toBeInstanceOf(DatabaseService)

      // Child can override parent services
      child.registerValue('config', { key: 'child' })
      expect(child.resolve<any>('config').key).toBe('child')
      expect(container.resolve<any>('config').key).toBe('parent')
    })
  })

  describe('complex scenarios', () => {
    test('should handle mixed registration types in dependency chain', () => {
      // Value -> Factory -> Class -> Class chain
      container
        .registerValue('apiKey', 'secret-key')
        .registerFactory(
          'config',
          (key: string) => ({
            apiKey: key,
            db: { host: 'localhost' },
          }),
          ['apiKey']
        )
        .registerClass('db', DatabaseService, [])
        .registerClass('email', EmailService, ['config'])
        .registerClass('user', UserService, ['db'])
        .registerClass('notification', NotificationService, ['email', 'user'])

      const notification = container.resolve<NotificationService>('notification')
      const db = container.resolve<DatabaseService>('db')
      db.connect()

      const result = notification.notifyUser('123', 'Test message')
      expect(result).toContain('secret-key')
    })

    test('should maintain singleton instances across complex dependencies', () => {
      container
        .registerClass('db', DatabaseService, [], Scope.SINGLETON)
        .registerClass('user1', UserService, ['db'])
        .registerClass('user2', UserService, ['db'])

      const user1 = container.resolve<UserService>('user1')
      const user2 = container.resolve<UserService>('user2')
      const db1 = container.resolve<DatabaseService>('db')
      const db2 = container.resolve<DatabaseService>('db')

      expect(db1).toBe(db2)
      // Different UserService instances but same DatabaseService
      expect(user1).not.toBe(user2)
    })

    test('should resolve deep dependency trees', () => {
      // Create a deep dependency chain: A -> B -> C -> D -> E
      class ServiceE {
        getValue() {
          return 'E'
        }
      }

      class ServiceD {
        constructor(private e: ServiceE) {}
        getValue() {
          return `D(${this.e.getValue()})`
        }
      }

      class ServiceC {
        constructor(private d: ServiceD) {}
        getValue() {
          return `C(${this.d.getValue()})`
        }
      }

      class ServiceB {
        constructor(private c: ServiceC) {}
        getValue() {
          return `B(${this.c.getValue()})`
        }
      }

      class ServiceA {
        constructor(private b: ServiceB) {}
        getValue() {
          return `A(${this.b.getValue()})`
        }
      }

      container
        .registerClass('E', ServiceE, [])
        .registerClass('D', ServiceD, ['E'])
        .registerClass('C', ServiceC, ['D'])
        .registerClass('B', ServiceB, ['C'])
        .registerClass('A', ServiceA, ['B'])

      const serviceA = container.resolve<ServiceA>('A')
      expect(serviceA.getValue()).toBe('A(B(C(D(E))))')
    })
  })
})
