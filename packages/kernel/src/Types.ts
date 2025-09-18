/**
 * @fileoverview
 * Core type definitions for the dependency injection container system.
 *
 * This file contains the fundamental types and interfaces that define how services
 * are registered, resolved, and managed within the dependency injection container.
 * These types support multiple registration patterns including classes, factories,
 * and static values, along with automatic dependency detection via decorators.
 */

/**
 * Represents a constructor function that can be instantiated to create service instances.
 *
 * This type is used for class-based service registration where the container will
 * call `new Constructor(...resolvedDependencies)` to create service instances.
 * The constructor parameters are automatically resolved from the dependency injection
 * container based on their types (when using @Inject decorator) or explicit dependency declarations.
 *
 * @template T - The type of instance that the constructor creates
 */
export type Constructor<T = any> = new (...args: any[]) => T

/**
 * Represents a unique identifier for a service within the dependency injection container.
 *
 * Tokens are used to register and resolve services from the container. Different token
 * types provide different benefits:
 * - **String tokens**: Simple, human-readable identifiers ('userService', 'database')
 * - **Symbol tokens**: Guaranteed unique identifiers that prevent naming conflicts
 * - **Constructor tokens**: Use the class itself as the token for type-safe resolution
 *
 * @template T - The type of service that this token represents
 */
export type Token<T = any> = string | symbol | Constructor<T>

/**
 * Represents a factory function that creates and returns service instances.
 *
 * Factory functions provide maximum flexibility for service creation, allowing for:
 * - Complex initialization logic
 * - Conditional service creation
 * - Integration with external libraries
 * - Dynamic configuration based on runtime conditions
 *
 * The factory receives resolved dependencies as arguments in the order specified
 * in the dependency array during registration.
 *
 * @template T - The type of service instance that the factory creates
 */
export type Factory<T = any> = (...args: any[]) => T

/**
 * Defines the lifecycle scope of a service instance within the container.
 *
 * The scope determines how many instances of a service the container will create
 * and when those instances are created:
 *
 * - **SINGLETON**: One instance per container, created on first resolution and reused
 * - **TRANSIENT**: New instance created every time the service is resolved
 */
export enum Scope {
  /**
   * Creates a single instance that is shared across all resolutions.
   * The instance is created lazily on first resolution and cached for subsequent requests.
   */
  SINGLETON = 'singleton',

  /**
   * Creates a new instance every time the service is resolved.
   * No caching occurs, each resolution results in a fresh instance.
   */
  TRANSIENT = 'transient',
}

/**
 * Defines how a service should be registered and instantiated by the container.
 *
 * A ServiceDefinition specifies all the information needed to create service instances:
 * - **token**: Unique identifier for the service
 * - **implementation**: How to create instances (class, factory, or static value)
 * - **dependencies**: Other services this service depends on
 * - **scope**: Lifecycle management (singleton vs transient)
 *
 * Only one of `useClass`, `useFactory`, or `useValue` should be specified per definition.
 *
 * @template T - The type of service instance this definition creates
 */
export interface ServiceDefinition<T = any> {
  /**
   * Unique identifier used to register and resolve this service.
   * Can be a string, symbol, or constructor function.
   */
  token: Token<T>

  /**
   * Constructor function to instantiate for class-based services.
   * The container will call `new useClass(...resolvedDeps)` to create instances.
   * Mutually exclusive with `useFactory` and `useValue`.
   */
  useClass?: Constructor<T>

  /**
   * Factory function to call for factory-based services.
   * The container will call `useFactory(...resolvedDeps)` to create instances.
   * Mutually exclusive with `useClass` and `useValue`.
   */
  useFactory?: Factory<T>

  /**
   * Static value to return for value-based services.
   * The same instance is always returned (effectively singleton).
   * Mutually exclusive with `useClass` and `useFactory`.
   */
  useValue?: T

  /**
   * Lifecycle scope for this service (defaults to SINGLETON).
   * Controls whether instances are shared or created fresh each time.
   */
  scope?: Scope

  /**
   * Array of dependency tokens that should be resolved and injected.
   * Dependencies are resolved in order and passed as arguments to the constructor or factory.
   * Optional when using @Inject decorator for automatic dependency detection.
   */
  deps?: Token[]
}
