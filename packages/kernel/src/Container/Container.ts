import 'reflect-metadata'
import { DependencyResolver } from './DependencyResolver'
import { Scope } from '../Types'
import type { Constructor, Token, ServiceDefinition, Factory } from '../Types'
import { MetadataManager, type DependencyMetadata } from '../Utils/MetadataManager'

/**
 * Dependency injection container for managing service registration and resolution.
 *
 * The Container class provides a centralized registry for services and their dependencies,
 * supporting multiple registration patterns (classes, factories, values) and lifecycle
 * management (singleton/transient scopes). Now supports automatic dependency detection
 * through a single @Inject decorator with zero configuration.
 *
 * @example
 * ```typescript
 * @Inject() // Automatically detects DatabaseService and Logger as dependencies
 * class UserService {
 *   constructor(
 *     private db: DatabaseService,
 *     private logger: Logger,
 *     private retryCount = 3 // Non-object with default value
 *   ) {}
 * }
 *
 * const container = new Container();
 * container.registerClass(UserService); // Uses class as token, auto-detects dependencies
 * const userService = container.resolve(UserService);
 * ```
 */
export class Container {
  /** Internal registry of service definitions indexed by token */
  private services = new Map<Token, ServiceDefinition>()

  /** Cache for singleton instances to ensure single instance per token */
  private singletons = new Map<Token, any>()

  /**
   * Registers a service using a complete service definition object.
   *
   * This is the most flexible registration method that accepts a full
   * ServiceDefinition with all configuration options.
   *
   * @param definition - Complete service definition with token, implementation, dependencies and scope
   * @returns The container instance for method chaining
   */
  register<T>(definition: ServiceDefinition<T>): this {
    this.services.set(definition.token, definition)
    return this
  }

  /**
   * Registers a class constructor as a service.
   *
   * The container will automatically detect dependencies from @Inject decorator
   * if no dependencies are explicitly provided. Object parameters are treated as
   * dependencies, while primitive parameters must have default values.
   *
   * @param token - Unique identifier for the service (defaults to the class constructor)
   * @param target - Constructor function to instantiate (optional if token is a constructor)
   * @param deps - Array of dependency tokens to inject (optional, auto-detected from @Inject)
   * @param scope - Service lifecycle scope (default: Scope.SINGLETON)
   * @returns The container instance for method chaining
   *
   * @example
   * ```typescript
   * // Auto-detection with @Inject
   * @Inject()
   * class UserService {
   *   constructor(private db: DatabaseService, private maxRetries = 3) {}
   * }
   * container.registerClass(UserService); // Uses class as token, auto-detects DatabaseService
   *
   * // Explicit registration
   * container.registerClass('userService', UserService);
   *
   * // Manual dependencies (overrides auto-detection)
   * container.registerClass('userService', UserService, ['database', 'logger']);
   * ```
   */
  registerClass<T>(
    token: Token<T> | Constructor<T>,
    target?: Constructor<T>,
    deps?: Token[],
    scope = Scope.SINGLETON
  ): this {
    // Handle overloaded signatures
    let resolvedToken: Token<T>
    let resolvedTarget: Constructor<T>

    if (typeof token === 'function' && !target) {
      // registerClass(UserService) - use class as both token and target
      resolvedToken = token as Token<T>
      resolvedTarget = token as Constructor<T>
    } else {
      // registerClass('userService', UserService) - explicit token and target
      resolvedToken = token as Token<T>
      resolvedTarget = target!
    }

    // Try to get dependencies from decorator if not explicitly provided
    const resolvedDeps = deps || this.extractDependencies(resolvedTarget) || []

    return this.register({
      token: resolvedToken,
      useClass: resolvedTarget,
      deps: resolvedDeps,
      scope,
    })
  }

  /**
   * Registers a factory function as a service with automatic dependency detection.
   *
   * @param token - Unique identifier for the service
   * @param factory - Function that creates and returns the service instance
   * @param deps - Array of dependency tokens (optional, can be auto-detected with @Inject on factory)
   * @param scope - Service lifecycle scope (default: Scope.SINGLETON)
   * @returns The container instance for method chaining
   *
   * @example
   * ```typescript
   * // Manual dependencies
   * container.registerFactory('emailService', (config: Config, logger: Logger) => {
   *   return new EmailService(config.smtp);
   * }, [Config, Logger]);
   *
   * // With method decorated for auto-detection (if using a class method as factory)
   * class ServiceFactory {
   *   @Inject()
   *   createEmailService(config: Config, logger: Logger, retries = 3) {
   *     return new EmailService(config.smtp);
   *   }
   * }
   * ```
   */
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

  /**
   * Registers a static value as a service.
   *
   * @param token - Unique identifier for the service
   * @param value - The static value to register
   * @returns The container instance for method chaining
   */
  registerValue<T>(token: Token<T>, value: T): this {
    return this.register({
      token,
      useValue: value,
      scope: Scope.SINGLETON,
    })
  }

  /**
   * Auto-registers a class that has been decorated with @Inject.
   * Uses the class constructor as the token and automatically detects dependencies.
   *
   * @param target - Constructor function decorated with @Inject
   * @param scope - Service lifecycle scope (default: Scope.SINGLETON)
   * @returns The container instance for method chaining
   *
   * @example
   * ```typescript
   * @Inject()
   * class UserService {
   *   constructor(private db: DatabaseService) {} // Auto-detected
   * }
   *
   * container.registerInjectable(UserService);
   * const service = container.resolve(UserService);
   * ```
   */
  registerInjectable(target: Constructor<any>, scope = Scope.SINGLETON): this {
    if (!this.isInjectable(target)) {
      throw new Error(`Class ${target.name} is not decorated with @Inject`)
    }

    return this.registerClass(target, undefined, undefined, scope)
  }

  /**
   * Batch registers multiple injectable classes at once.
   *
   * @param targets - Array of constructor functions decorated with @Inject
   * @param scope - Service lifecycle scope for all services (default: Scope.SINGLETON)
   * @returns The container instance for method chaining
   *
   * @example
   * ```typescript
   * @Inject()
   * class UserService {}
   *
   * @Inject()
   * class EmailService {}
   *
   * container.registerInjectables([UserService, EmailService]);
   * ```
   */
  registerInjectables(targets: Constructor<any>[], scope = Scope.SINGLETON): this {
    for (const target of targets) {
      this.registerInjectable(target, scope)
    }
    return this
  }

  /**
   * Resolves and returns a service instance by its token.
   *
   * @param token - The service token to resolve
   * @returns The resolved service instance
   * @throws {ServiceNotFoundError} When the token is not registered
   * @throws {CircularDependencyError} When circular dependencies are detected
   */
  resolve<T>(token: Token<T>): T {
    const resolver = new DependencyResolver(this.services, this.singletons)
    return resolver.resolve(token)
  }

  /**
   * Checks if a service is registered with the given token.
   *
   * @param token - The service token to check
   * @returns True if the service is registered, false otherwise
   */
  has(token: Token): boolean {
    return this.services.has(token)
  }

  /**
   * Clears all registered services and cached singleton instances.
   */
  clear(): void {
    this.services.clear()
    this.singletons.clear()
  }

  /**
   * Creates a child container that inherits all parent service definitions.
   *
   * @returns A new Container instance with inherited service definitions
   */
  createChild(): Container {
    const child = new Container()
    for (const [token, definition] of this.services) {
      child.services.set(token, definition)
    }
    return child
  }

  /**
   * Gets detailed information about a registered service.
   *
   * @param token - The service token to inspect
   * @returns Service definition information or undefined if not found
   */
  getServiceInfo<T>(token: Token<T>): ServiceDefinition<T> | undefined {
    return this.services.get(token) as ServiceDefinition<T>
  }

  /**
   * Lists all registered service tokens.
   *
   * @returns Array of all registered tokens
   */
  getRegisteredTokens(): Token[] {
    return Array.from(this.services.keys())
  }

  /**
   * Extracts dependency tokens from a class decorated with @Inject
   *
   * @private
   */
  private extractDependencies(target: Constructor): Token[] | undefined {
    return MetadataManager.getDependencies(target)
  }

  /**
   * Checks if a class is decorated with @Inject
   *
   * @private
   */
  private isInjectable(target: Constructor): boolean {
    return MetadataManager.isInjectable(target)
  }

  /**
   * Extracts method-specific dependencies from @Inject decorators
   *
   * @private
   */
  private getMethodDependencies(
    target: Constructor,
    methodName: string | symbol
  ): DependencyMetadata | undefined {
    return MetadataManager.getMethodDependencies(target, methodName)
  }
}
