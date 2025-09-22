import { describe, test, expect, beforeEach } from 'bun:test'
import { LoggerServiceProvider } from '../../src/Providers/LoggerServiceProvider'
import { LoggerService } from '../../src/Services/LoggerService'
import { ConsoleHandler } from '../../src/Handlers/ConsoleHandler'
import type { LoggerManager } from '../../src/Contracts/LoggerManager'
import type { ServiceProvider, Container, Token, Constructor, Factory, ServiceDefinition } from '@strav/kernel'
import { Scope } from '@strav/kernel'

/**
 * Mock Container class for testing
 */
class MockContainer {
  private mockServices = new Map<Token, ServiceDefinition>()
  private singletons = new Map<Token, any>()

  register<T>(definition: ServiceDefinition<T>): this {
    this.mockServices.set(definition.token, definition)
    return this
  }

  registerClass<T>(
    token: Token<T> | Constructor<T>,
    target?: Constructor<T>,
    deps?: Token[],
    scope = Scope.SINGLETON
  ): this {
    let resolvedToken: Token<T>
    let resolvedTarget: Constructor<T>

    if (typeof token === 'function' && !target) {
      resolvedToken = token as Token<T>
      resolvedTarget = token as Constructor<T>
    } else {
      resolvedToken = token as Token<T>
      resolvedTarget = target!
    }

    const resolvedDeps = deps || []

    return this.register({
      token: resolvedToken,
      useClass: resolvedTarget,
      deps: resolvedDeps,
      scope,
    })
  }

  registerFactory<T>(
    token: Token<T>,
    factory: Factory<T>,
    deps: Token[] = [],
    scope = Scope.SINGLETON
  ): this {
    return this.register({
      token,
      useFactory: factory,
      deps,
      scope,
    })
  }

  registerValue<T>(token: Token<T>, value: T): this {
    return this.register({
      token,
      useValue: value,
      scope: Scope.SINGLETON,
    })
  }

  registerInjectable(target: Constructor<any>, scope = Scope.SINGLETON): this {
    return this.registerClass(target, undefined, undefined, scope)
  }

  registerInjectables(targets: Constructor<any>[], scope = Scope.SINGLETON): this {
    for (const target of targets) {
      this.registerInjectable(target, scope)
    }
    return this
  }

  resolve<T>(token: Token<T>): T {
    const definition = this.mockServices.get(token)
    if (!definition) {
      throw new Error(`Service not found: ${String(token)}`)
    }

    // Check if it's a singleton and already instantiated
    if (definition.scope === Scope.SINGLETON && this.singletons.has(token)) {
      return this.singletons.get(token)
    }

    let instance: T

    if (definition.useValue !== undefined) {
      instance = definition.useValue
    } else if (definition.useFactory) {
      const deps = definition.deps?.map(dep => this.resolve(dep)) || []
      instance = definition.useFactory(...deps)
    } else if (definition.useClass) {
      const deps = definition.deps?.map(dep => this.resolve(dep)) || []
      instance = new definition.useClass(...deps)
    } else {
      throw new Error(`Invalid service definition for token: ${String(token)}`)
    }

    // Cache singleton instances
    if (definition.scope === Scope.SINGLETON) {
      this.singletons.set(token, instance)
    }

    return instance
  }

  has(token: Token): boolean {
    return this.mockServices.has(token)
  }

  clear(): void {
    this.mockServices.clear()
    this.singletons.clear()
  }

  createChild(): MockContainer {
    const child = new MockContainer()
    // Copy parent services to child
    this.mockServices.forEach((definition, token) => {
      child.mockServices.set(token, definition)
    })
    return child
  }

  getServiceInfo<T>(token: Token<T>): ServiceDefinition<T> | undefined {
    return this.mockServices.get(token) as ServiceDefinition<T> | undefined
  }

  getRegisteredTokens(): Token[] {
    return Array.from(this.mockServices.keys())
  }

  // Mock-specific methods for testing
  getRegisteredServices(): Token[] {
    return this.getRegisteredTokens()
  }

  getFactory(token: Token<any>): Factory<any> | undefined {
    const definition = this.mockServices.get(token)
    return definition?.useFactory
  }
}

describe('LoggerServiceProvider', () => {
  let provider: LoggerServiceProvider
  let container: MockContainer

  beforeEach(() => {
    provider = new LoggerServiceProvider()
    container = new MockContainer()
  })

  describe('Constructor', () => {
    test('should create a new LoggerServiceProvider instance', () => {
      expect(provider).toBeInstanceOf(LoggerServiceProvider)
    })
  })

  describe('getProviderName', () => {
    test('should return the correct provider name', () => {
      expect(provider.getProviderName()).toBe('LoggerServiceProvider')
    })
  })

  describe('register', () => {
    test('should register logger service with container', () => {
      provider.register(container as unknown as Container)

      // Check that services were registered
      const registeredServices = container.getRegisteredServices()
      expect(registeredServices.length).toBeGreaterThan(0)

      // Check that logger service can be resolved by string token
      const logger = container.resolve<LoggerService>('logger')
      expect(logger).toBeInstanceOf(LoggerService)
    })

    test('should register logger service with symbol token', () => {
      provider.register(container as unknown as Container)

      // The provider should register with both symbol and string tokens
      const registeredServices = container.getRegisteredServices()
      expect(registeredServices.length).toBe(2) // Symbol token + string token
    })

    test('should create logger service with default console handler', () => {
      provider.register(container as unknown as Container)

      const logger = container.resolve<LoggerService>('logger')
      expect(logger).toBeInstanceOf(LoggerService)

      // Verify it has handlers by checking the channel
      const channel = logger.channel('test')
      expect(channel).toBeDefined()
    })

    test('should register factory that returns LoggerService instance', () => {
      provider.register(container as unknown as Container)

      const factory = container.getFactory('logger')
      expect(factory).toBeDefined()
      expect(typeof factory).toBe('function')

      const logger = factory!()
      expect(logger).toBeInstanceOf(LoggerService)
    })
  })

  describe('boot', () => {
    test('should complete without errors', () => {
      provider.register(container as unknown as Container)
      
      expect(() => {
        provider.boot(container as unknown as Container)
      }).not.toThrow()
    })

    test('should not affect registered services', () => {
      provider.register(container as unknown as Container)
      const servicesBefore = container.getRegisteredServices().length

      provider.boot(container as unknown as Container)
      const servicesAfter = container.getRegisteredServices().length

      expect(servicesAfter).toBe(servicesBefore)
    })
  })

  describe('getProvidedServices', () => {
    test('should return array of provided service tokens', () => {
      const services = provider.getProvidedServices()
      
      expect(Array.isArray(services)).toBe(true)
      expect(services.length).toBeGreaterThan(0)
    })

    test('should include logger service token', () => {
      const services = provider.getProvidedServices()
      
      // Should include the string token 'logger'
      expect(services).toContain('logger')
    })

    test('should include symbol token for logger service', () => {
      const services = provider.getProvidedServices()
      
      // Should include a symbol token (the private loggerServiceToken)
      const hasSymbolToken = services.some(token => typeof token === 'symbol')
      expect(hasSymbolToken).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    test('should work with complete registration and resolution flow', () => {
      // Register services
      provider.register(container as unknown as Container)
      
      // Boot services
      provider.boot(container as unknown as Container)
      
      // Resolve logger service
      const logger = container.resolve<LoggerService>('logger')
      
      expect(logger).toBeInstanceOf(LoggerService)
      expect(logger).toBeDefined()
    })

    test('should create logger with working channel methods', () => {
      provider.register(container as unknown as Container)
      
      const logger = container.resolve<LoggerService>('logger')
      
      // Test that logger channel method exists and works
      expect(typeof logger.channel).toBe('function')
      
      const channel = logger.channel('test')
      expect(channel).toBeDefined()
      expect(typeof channel.info).toBe('function')
      expect(typeof channel.error).toBe('function')
      expect(typeof channel.warning).toBe('function')
      expect(typeof channel.debug).toBe('function')
      
      // Test that methods can be called without throwing
      expect(() => {
        channel.info('Test message')
        channel.error('Test error')
        channel.warning('Test warning')
        channel.debug('Test debug')
      }).not.toThrow()
    })

    test('should resolve same instance for singleton scope', () => {
      provider.register(container as unknown as Container)
      
      const logger1 = container.resolve<LoggerService>('logger')
      const logger2 = container.resolve<LoggerService>('logger')
      
      expect(logger1).toBe(logger2)
    })

    test('should work with child containers', () => {
      provider.register(container as unknown as Container)
      
      const childContainer = container.createChild()
      const logger = childContainer.resolve<LoggerService>('logger')
      
      expect(logger).toBeInstanceOf(LoggerService)
    })
  })
})

// Additional test suite for edge cases and contract compliance
describe('LoggerServiceProvider - Edge Cases and Contract Compliance', () => {
  let provider: LoggerServiceProvider
  let container: MockContainer

  beforeEach(() => {
    provider = new LoggerServiceProvider()
    container = new MockContainer()
  })

  describe('Edge Cases and Contract Compliance', () => {
    test('should handle multiple register calls gracefully', () => {
      expect(() => {
        provider.register(container as unknown as Container)
        provider.register(container as unknown as Container)
        provider.register(container as unknown as Container)
      }).not.toThrow()
      
      // Should still be able to resolve logger
      const logger = container.resolve<LoggerManager>('logger')
      expect(logger).toBeInstanceOf(LoggerService)
    })

    test('should handle boot being called before register', () => {
      expect(() => {
        provider.boot(container as unknown as Container)
      }).not.toThrow()
    })

    test('should handle boot being called multiple times', () => {
      provider.register(container as unknown as Container)
      
      expect(() => {
        provider.boot(container as unknown as Container)
        provider.boot(container as unknown as Container)
        provider.boot(container as unknown as Container)
      }).not.toThrow()
    })

    test('should maintain ServiceProvider contract', () => {
      // Verify it implements ServiceProvider interface
      expect(typeof provider.register).toBe('function')
      expect(typeof provider.boot).toBe('function')
      expect(typeof provider.getProviderName).toBe('function')
      expect(typeof provider.getProvidedServices).toBe('function')
    })

    test('should provide consistent service tokens', () => {
      const services1 = provider.getProvidedServices()
      const services2 = provider.getProvidedServices()
      
      expect(services1).toEqual(services2)
    })

    test('should handle container service info queries', () => {
      provider.register(container as unknown as Container)
      
      const serviceInfo = container.getServiceInfo('logger')
      expect(serviceInfo).toBeDefined()
      expect(serviceInfo?.token).toBe('logger')
      expect(serviceInfo?.useFactory).toBeDefined()
    })
  })
})