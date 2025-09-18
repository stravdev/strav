import { describe, test, expect, beforeEach } from 'bun:test'
import { DependencyResolver, CircularDependencyException, Scope, type ServiceDefinition } from '@strav/kernel'

interface Config {
  port: number
  host: string
}

describe('DependencyResolver', () => {
  let services: Map<string, ServiceDefinition>
  let singletons: Map<string, any>
  let resolver: DependencyResolver

  beforeEach(() => {
    services = new Map()
    singletons = new Map()
    resolver = new DependencyResolver(services, singletons)
  })

  test('should resolve simple value service', () => {
    services.set('config', {
      token: 'config',
      useValue: { port: 3000 },
      scope: Scope.SINGLETON,
    })

    const config = resolver.resolve('config') as Config
    expect(config.port).toBe(3000)
  })

  interface NumberContainer {
    value: number
  }

  test('should cache singleton instances', () => {
    let counter = 0
    services.set('counter', {
      token: 'counter',
      useFactory: () => ({ value: ++counter }),
      scope: Scope.SINGLETON,
    })

    const instance1 = resolver.resolve('counter') as NumberContainer
    const instance2 = resolver.resolve('counter') as NumberContainer

    expect(instance1).toBe(instance2)
    expect(instance1.value).toBe(1)
  })

  test('should create new transient instances', () => {
    let counter = 0
    services.set('counter', {
      token: 'counter',
      useFactory: () => ({ value: ++counter }),
      scope: Scope.TRANSIENT,
    })

    const instance1 = resolver.resolve('counter') as NumberContainer
    const instance2 = resolver.resolve('counter') as NumberContainer

    expect(instance1).not.toBe(instance2)
    expect(instance1.value).toBe(1)
    expect(instance2.value).toBe(2)
  })

  test('should detect circular dependencies', () => {
    services.set('A', {
      token: 'A',
      useFactory: (b: any) => ({ b }),
      deps: ['B'],
    })

    services.set('B', {
      token: 'B',
      useFactory: (a: any) => ({ a }),
      deps: ['A'],
    })

    expect(() => resolver.resolve('A')).toThrow(CircularDependencyException)
  })

  test('should resolve factory with dependencies', () => {
    services.set('multiplier', {
      token: 'multiplier',
      useValue: 2,
    })

    services.set('calculator', {
      token: 'calculator',
      useFactory: (mult: number) => ({
        multiply: (x: number) => x * mult,
      }),
      deps: ['multiplier'],
    })

    const calc = resolver.resolve<any>('calculator')
    expect(calc.multiply(5)).toBe(10)
  })
})
