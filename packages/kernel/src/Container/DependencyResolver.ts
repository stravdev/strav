import {
  CircularDependencyException,
  ServiceNotFoundException,
} from '../Exceptions/ContainerExceptions'
import type { Token, ServiceDefinition } from '../Types'

/**
 * Handles the resolution of services and their dependencies with lifecycle management.
 *
 * The DependencyResolver is responsible for the core dependency injection logic,
 * including circular dependency detection, singleton caching, and recursive
 * dependency resolution. It maintains a resolution stack to detect circular
 * dependencies and manages the singleton cache for performance optimization.
 *
 * @example
 * ```typescript
 * const services = new Map();
 * const singletons = new Map();
 * const resolver = new DependencyResolver(services, singletons);
 *
 * // Resolver is typically used internally by Container
 * const instance = resolver.resolve('myService');
 * ```
 */
export class DependencyResolver {
  /**
   * Stack of tokens currently being resolved, used for circular dependency detection.
   * When a token appears twice in the stack, it indicates a circular dependency.
   */
  private resolutionStack = new Set<Token>()

  /**
   * Creates a new DependencyResolver instance.
   *
   * @param services - Map of service definitions indexed by token
   * @param singletons - Map of cached singleton instances indexed by token
   */
  constructor(
    private services: Map<Token, ServiceDefinition>,
    private singletons: Map<Token, any>
  ) {}

  /**
   * Resolves a service by its token, handling dependencies and lifecycle management.
   *
   * This method orchestrates the complete service resolution process:
   * 1. Checks for circular dependencies using the resolution stack
   * 2. Validates the service is registered
   * 3. Returns cached singleton instances when available
   * 4. Creates new instances with dependency injection
   * 5. Caches singleton instances for future use
   *
   * @param token - The service token to resolve
   * @returns The resolved service instance with all dependencies injected
   *
   * @throws {DICircularDependencyException} When circular dependencies are detected
   * @throws {DIServiceNotFoundException} When the service token is not registered
   *
   * @example
   * ```typescript
   * // Resolve a service (typically called by Container)
   * const userService = resolver.resolve<UserService>('userService');
   *
   * // The resolver handles complex dependency chains automatically:
   * // UserService -> DatabaseService -> ConfigService
   * ```
   */
  resolve<T>(token: Token<T>): T {
    // Detect circular dependencies by checking if token is already in resolution stack
    if (this.resolutionStack.has(token)) {
      throw new CircularDependencyException([...this.resolutionStack, token])
    }

    // Ensure the service is registered
    const definition = this.services.get(token)
    if (!definition) {
      throw new ServiceNotFoundException(token)
    }

    // Return cached singleton instance if available
    if (definition.scope === 'singleton' && this.singletons.has(token)) {
      return this.singletons.get(token)
    }

    // Add token to resolution stack for circular dependency detection
    this.resolutionStack.add(token)

    try {
      // Create the service instance with dependency injection
      const instance = this.createInstance(definition)

      // Cache singleton instances for future resolutions
      if (definition.scope === 'singleton') {
        this.singletons.set(token, instance)
      }

      return instance
    } finally {
      // Always remove token from resolution stack when done
      this.resolutionStack.delete(token)
    }
  }

  /**
   * Creates a service instance based on its definition type.
   *
   * This method handles the three different service definition types:
   * - Value: Returns the static value directly
   * - Factory: Calls the factory function with resolved dependencies
   * - Class: Instantiates the class constructor with resolved dependencies
   *
   * @param definition - The service definition containing creation instructions
   * @returns The created service instance
   *
   * @throws {Error} When the service definition is invalid or incomplete
   *
   * @example
   * ```typescript
   * // For a class definition:
   * // new UserService(databaseService, loggerService)
   *
   * // For a factory definition:
   * // emailFactory(configService, loggerService)
   *
   * // For a value definition:
   * // { apiKey: 'secret', port: 3000 }
   * ```
   */
  private createInstance<T>(definition: ServiceDefinition<T>): T {
    // Handle static value definitions
    if (definition.useValue !== undefined) {
      return definition.useValue
    }

    // Handle factory function definitions
    if (definition.useFactory) {
      const deps = this.resolveDependencies(definition.deps || [])
      return definition.useFactory(...deps)
    }

    // Handle class constructor definitions
    if (definition.useClass) {
      const deps = this.resolveDependencies(definition.deps || [])
      return new definition.useClass(...deps)
    }

    // Invalid service definition - should not happen with proper registration
    throw new Error(`Invalid service definition for: ${String(definition.token)}`)
  }

  /**
   * Recursively resolves an array of dependency tokens.
   *
   * This method processes all dependencies for a service by recursively
   * calling resolve() for each dependency token. The resolved dependencies
   * are returned in the same order as the input tokens, ensuring correct
   * parameter order for constructors and factory functions.
   *
   * @param tokens - Array of dependency tokens to resolve
   * @returns Array of resolved dependency instances in the same order
   *
   * @example
   * ```typescript
   * // If tokens = ['database', 'logger', 'config']
   * // Returns = [DatabaseService, LoggerService, ConfigService]
   *
   * // These dependencies are then passed to:
   * // new UserService(DatabaseService, LoggerService, ConfigService)
   * // or factory(DatabaseService, LoggerService, ConfigService)
   * ```
   */
  private resolveDependencies(tokens: Token[]): any[] {
    return tokens.map((token) => this.resolve(token))
  }
}
