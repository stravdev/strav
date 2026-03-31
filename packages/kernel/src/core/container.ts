import 'reflect-metadata'
import { INJECTABLE } from './inject.ts'

/** Constructor type for injectable classes. */
type Constructor<T = any> = new (...args: any[]) => T

/** A factory function that receives the container and returns a service instance. */
type Factory<T = any> = (container: Container) => T

/**
 * A lightweight dependency injection container.
 *
 * Services are registered as factory functions or `@inject`-decorated classes
 * and resolved by string name or class constructor.
 *
 * @example
 * const app = new Container()
 *   .singleton(Database)
 *   .singleton(UserService)              // @inject decorated
 *   .singleton('logger', () => new Logger())
 *
 * const svc = app.resolve(UserService)   // Database auto-injected
 */
export default class Container {
  private factories = new Map<any, { factory: Factory; singleton: boolean }>()
  private instances = new Map<any, any>()

  /** Create a factory from a class constructor, resolving `design:paramtypes` metadata. */
  private classToFactory<T>(Cls: Constructor<T>): Factory<T> {
    const paramTypes: Constructor[] = Reflect.getMetadata('design:paramtypes', Cls) ?? []
    return (c: Container) => new Cls(...paramTypes.map(dep => c.resolve(dep)))
  }

  /** Wrap an `@inject`-decorated class in a factory, or return a plain factory as-is. */
  private toFactory<T>(factoryOrClass: Factory<T> | Constructor<T>): Factory<T> {
    if (INJECTABLE in factoryOrClass) {
      return this.classToFactory(factoryOrClass as Constructor<T>)
    }
    return factoryOrClass as Factory<T>
  }

  /** Register an `@inject` class that creates a new instance on every {@link resolve} call. */
  register<T>(ctor: Constructor<T>): this
  /** Register a factory under a class constructor key. Creates a new instance on every {@link resolve} call. */
  register<T>(ctor: Constructor<T>, factory: Factory<T>): this
  /** Register a factory or `@inject` class under a string name. Creates a new instance on every {@link resolve} call. */
  register<T>(name: string, factory: Factory<T> | Constructor<T>): this
  register<T>(nameOrCtor: string | Constructor<T>, factory?: Factory<T> | Constructor<T>): this {
    if (typeof nameOrCtor === 'function') {
      const resolved = factory ? this.toFactory(factory) : this.classToFactory(nameOrCtor)
      this.factories.set(nameOrCtor, { factory: resolved, singleton: false })
    } else {
      this.factories.set(nameOrCtor, { factory: this.toFactory(factory!), singleton: false })
    }
    return this
  }

  /** Register an `@inject` class as a singleton by its constructor. */
  singleton<T>(ctor: Constructor<T>): this
  /** Register a factory under a class constructor key (resolved by constructor). */
  singleton<T>(ctor: Constructor<T>, factory: Factory<T>): this
  /** Register a factory or `@inject` class as a singleton under a string name. */
  singleton<T>(name: string, factory: Factory<T> | Constructor<T>): this
  singleton<T>(nameOrCtor: string | Constructor<T>, factory?: Factory<T> | Constructor<T>): this {
    if (typeof nameOrCtor === 'function') {
      const resolved = factory ? this.toFactory(factory) : this.classToFactory(nameOrCtor)
      this.factories.set(nameOrCtor, { factory: resolved, singleton: true })
    } else {
      this.factories.set(nameOrCtor, { factory: this.toFactory(factory!), singleton: true })
    }
    return this
  }

  /** Resolve a service by its class constructor. */
  resolve<T>(ctor: Constructor<T>): T
  /** Resolve a service by its string name. */
  resolve<T>(name: string): T
  resolve<T>(key: string | Constructor<T>): T {
    const entry = this.factories.get(key)
    if (!entry) {
      const label = typeof key === 'string' ? `"${key}"` : key.name
      throw new Error(`Service ${label} is not registered`)
    }

    if (entry.singleton) {
      if (!this.instances.has(key)) {
        this.instances.set(key, entry.factory(this))
      }
      return this.instances.get(key)
    }

    return entry.factory(this)
  }

  /** Check whether a service has been registered under the given name or constructor. */
  has(key: string | Constructor): boolean {
    return this.factories.has(key)
  }

  /**
   * Instantiate a class with automatic dependency injection.
   *
   * Unlike {@link resolve}, this does not require prior registration.
   * Constructor dependencies are resolved recursively: registered services
   * are pulled from the container, unregistered `@inject` classes are
   * instantiated via `make()` as well.
   */
  make<T>(ctor: Constructor<T>): T {
    const paramTypes: Constructor[] = Reflect.getMetadata('design:paramtypes', ctor) ?? []
    const deps = paramTypes.map(dep => (this.has(dep) ? this.resolve(dep) : this.make(dep)))
    return new ctor(...deps)
  }
}
