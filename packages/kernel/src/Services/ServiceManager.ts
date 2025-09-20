import type { Token } from '../Types'
import { Container } from '../Container/Container'
import { type ServiceProvider } from '../Contracts/ServiceProvider'
import {
  GroupedShutdownException,
  ServiceBootException,
  ServiceShutdownException,
} from '../Exceptions/ServiceExceptions'

/**
 * Service manager that orchestrates the complete lifecycle of service providers.
 *
 * The ServiceManager is responsible for coordinating service provider registration,
 * initialization (booting), and graceful shutdown in a dependency injection system.
 * It ensures that providers are initialized in the correct order based on their
 * dependencies and handles failures gracefully.
 *
 * ## Lifecycle Phases
 *
 * 1. **Registration Phase**: Providers register their services with the container
 * 2. **Boot Phase**: Providers perform initialization logic (connections, setup)
 * 3. **Runtime Phase**: Services are available for resolution and use
 * 4. **Shutdown Phase**: Providers cleanup resources in reverse dependency order
 *
 * ## Key Features
 *
 * - **Dependency Resolution**: Automatically determines boot order based on provider dependencies
 * - **Error Handling**: Graceful failure handling with detailed error reporting
 * - **Lifecycle Management**: Complete provider lifecycle from registration to shutdown
 * - **State Tracking**: Maintains separate tracking of registered and booted providers
 * - **Circular Dependency Detection**: Prevents infinite loops in dependency chains
 *
 * @example See {@link ../docs/service-manager-examples.md#basic-usage} for usage examples
 */
export class ServiceManager {
  /** The dependency injection container that services are registered with */
  private container: Container

  /** Queue of providers waiting to be registered */
  private providers: ServiceProvider[] = []

  /** Providers that have completed registration */
  private registeredProviders: ServiceProvider[] = []

  /** Providers that have completed the boot process */
  private bootedProviders: ServiceProvider[] = []

  /** Cache for provider names to avoid repeated name resolution */
  private providerNames = new WeakMap<ServiceProvider, string>()

  /** Counter for generating unique names for anonymous providers */
  private nameCounter = 0

  /** Map of service provider names to their instances (currently unused but reserved for future features) */
  private serviceProviders = new Map<string, ServiceProvider>()

  /**
   * Creates a new ServiceManager instance.
   *
   * @param container - The dependency injection container that providers will register services with
   *
   * @example
   * ```typescript
   * const container = new Container();
   * const serviceManager = new ServiceManager(container);
   * ```
   */
  constructor(container: Container) {
    this.container = container
  }

  /**
   * Registers a service provider for later initialization.
   *
   * This method adds a provider to the registration queue but does not
   * immediately call its register() method. Providers are processed during
   * the registerAll() phase to ensure proper dependency ordering.
   *
   * @param provider - The service provider to register
   *
   * @example See {@link ../docs/service-manager-examples.md#service-provider-registration} for registration examples
   */
  public register(provider: ServiceProvider): void {
    this.providers.push(provider)
  }

  /**
   * Registers all queued service providers with the container.
   *
   * This method processes all providers that have been added via register()
   * and calls their register() method to bind services to the container.
   * Registration happens before booting to ensure all services are available
   * for dependency injection during the boot phase.
   *
   * @throws {Error} If any provider's register() method throws an exception
   * @returns Promise that resolves when all providers have been registered
   *
   * @example See {@link ../docs/service-manager-examples.md#service-provider-registration} for registration examples
   */
  public async registerAll(): Promise<void> {
    for (const provider of this.providers) {
      await provider.register(this.container)
      this.registeredProviders.push(provider)
    }
  }

  /**
   * Boots all registered service providers in dependency order.
   *
   * This method calls the boot() method on providers that implement it,
   * ensuring that dependencies are booted before their dependents. Providers
   * without a boot() method are skipped but remain in the registered list.
   *
   * The boot phase is where providers can:
   * - Initialize services that depend on other services
   * - Set up event listeners
   * - Perform complex initialization logic
   * - Access services registered by other providers
   *
   * @throws {ServiceBootException} If dependency resolution fails or boot methods throw
   * @returns Promise that resolves when all providers have been booted
   *
   * @example See {@link ../docs/service-manager-examples.md#service-provider-booting} for booting examples
   */
  public async bootAll(): Promise<void> {
    const sortedProviders = this.topologicalSort(this.registeredProviders, false)

    for (const provider of sortedProviders) {
      if (provider.boot) {
        await provider.boot(this.container)
        this.bootedProviders.push(provider)
      }
    }
  }

  /**
   * Gracefully shuts down all providers and resets the manager state.
   *
   * Shutdown occurs in reverse dependency order to ensure that dependents
   * are shut down before their dependencies. This prevents errors during
   * cleanup when a service tries to use a dependency that has already been
   * shut down.
   *
   * The method continues shutting down providers even if individual providers
   * fail, collecting all failures and reporting them via a GroupedShutdownException.
   * This ensures maximum cleanup even in failure scenarios.
   *
   * After shutdown, the manager state is reset, clearing all provider arrays.
   *
   * @throws {GroupedShutdownException} If one or more providers fail to shutdown
   * @returns Promise that resolves when all providers have been shut down
   *
   * @example See {@link ../docs/service-manager-examples.md#graceful-shutdown} for shutdown examples
   */
  public async shutdownAll(): Promise<void> {
    // Shutdown all registered providers in reverse dependency order
    const sortedProviders = this.topologicalSort(this.registeredProviders, true)
    const shutdownFailures: Array<{ provider: string; error: ServiceShutdownException }> = []

    for (const provider of sortedProviders) {
      if (provider.shutdown) {
        try {
          await provider.shutdown(this.container)
        } catch (error) {
          const providerName = this.getProviderName(provider)
          const shutdownError =
            error instanceof ServiceShutdownException
              ? error
              : new ServiceShutdownException(String(error))

          shutdownFailures.push({
            provider: providerName,
            error: shutdownError,
          })

          // Log the individual failure but continue with other providers
          console.error(`Failed to shutdown service provider '${providerName}':`, shutdownError)
        }
      }
    }

    // Reset manager state regardless of shutdown failures
    this.bootedProviders = []
    this.registeredProviders = []
    this.providers = []

    // Throw grouped exception if any shutdowns failed
    if (shutdownFailures.length > 0) {
      throw new GroupedShutdownException(shutdownFailures)
    }
  }

  /**
   * Returns a copy of all registered service providers.
   *
   * This method returns providers that have completed the registration phase
   * (their `register()` method has been called). The returned array is a copy
   * to prevent external modification of the internal state.
   *
   * @returns Array containing copies of all registered service providers
   *
   * @example See {@link ../docs/service-manager-examples.md#provider-information} for provider information examples
   */
  public getRegisteredProviders(): Array<ServiceProvider> {
    return [...this.registeredProviders]
  }

  /**
   * Returns a copy of all booted service providers.
   *
   * This method returns providers that have completed both registration and
   * boot phases. Only providers that implement the `boot()` method and have
   * successfully completed booting are included.
   *
   * @returns Array containing copies of all booted service providers
   *
   * @example See {@link ../docs/service-manager-examples.md#provider-information} for provider information examples
   */
  public getBootedProviders(): Array<ServiceProvider> {
    return [...this.bootedProviders]
  }

  /**
   * Retrieves or generates a unique name for a service provider.
   *
   * Provider names are used for:
   * - Dependency resolution and sorting
   * - Error reporting and logging
   * - Duplicate detection
   * - Debugging and introspection
   *
   * Name resolution follows this priority:
   * 1. Use `getProviderName()` method if available
   * 2. Use constructor name if meaningful
   * 3. Generate unique anonymous name
   *
   * Names are cached using WeakMap to ensure consistency across calls.
   *
   * @param provider - The service provider to get a name for
   * @returns The provider's unique name
   *
   * @example See {@link ../docs/service-manager-examples.md#provider-naming} for provider naming examples
   */
  private getProviderName(provider: ServiceProvider): string {
    // Check if we already assigned a name to this provider
    if (this.providerNames.has(provider)) {
      return this.providerNames.get(provider)!
    }

    let name: string

    if (provider.getProviderName) {
      name = provider.getProviderName()
    } else {
      // Use constructor name, but handle anonymous classes
      const constructorName = provider.constructor.name
      if (constructorName && constructorName !== 'Object' && constructorName !== '') {
        name = constructorName
      } else {
        // For anonymous classes, generate a unique name
        name = `AnonymousProvider_${++this.nameCounter}`
      }
    }

    // Store the name for this provider instance
    this.providerNames.set(provider, name)
    return name
  }

  /**
   * Retrieves the dependency tokens for a service provider.
   *
   * Dependencies are used during the boot phase to determine the correct
   * initialization order. Providers are booted after all their dependencies
   * have been booted.
   *
   * @param provider - The service provider to get dependencies for
   * @returns Array of tokens this provider depends on (empty array if no dependencies)
   *
   * @example See {@link ../docs/service-manager-examples.md#provider-dependencies} for dependency examples
   */
  private getProviderDependencies(provider: ServiceProvider): Array<Token<any>> {
    return provider.getDependencies?.() || []
  }

  /**
   * Retrieves the service tokens that a provider makes available.
   *
   * This information is used to map services to their providers during
   * dependency resolution. When a provider declares dependencies, the
   * manager uses this mapping to determine which providers must be
   * booted first.
   *
   * @param provider - The service provider to get provided services for
   * @returns Array of service tokens this provider makes available (empty array if none declared)
   *
   * @example See {@link ../docs/service-manager-examples.md#provider-dependencies} for dependency examples
   */
  private getProvidedServices(provider: ServiceProvider): Array<Token<any>> {
    return provider.getProvidedServices?.() || []
  }

  /**
   * Performs topological sorting of providers based on their dependencies.
   *
   * Topological sorting ensures that providers are processed in dependency order:
   * - For booting: dependencies are processed before dependents
   * - For shutdown: dependents are processed before dependencies (reverse order)
   *
   * @param providers - List of service providers to sort
   * @param reverse - Whether to reverse the order (true for shutdown, false for boot)
   * @returns Array of service providers in the correct processing order
   *
   * @throws {ServiceBootException} If circular dependencies are detected
   *
   * @example See {@link ../docs/service-manager-examples.md#dependency-resolution} for dependency resolution examples
   */
  private topologicalSort(
    providers: Array<ServiceProvider>,
    reverse: boolean = false
  ): Array<ServiceProvider> {
    if (providers.length === 0) {
      return []
    }

    // Get normal boot order first
    const bootOrder = this.getBootOrder(providers)

    // Return normal order for boot, reverse for shutdown
    return reverse ? [...bootOrder].reverse() : bootOrder
  }

  /**
   * Calculates the boot order using Kahn's topological sorting algorithm.
   *
   * This method builds a dependency graph where:
   * - Nodes represent service providers
   * - Edges represent dependencies (dependency -> dependent)
   * - In-degree represents the number of unresolved dependencies
   *
   * The algorithm works by:
   * 1. Building the dependency graph and service-to-provider mapping
   * 2. Calculating in-degrees for each provider
   * 3. Processing providers with no dependencies first
   * 4. Removing processed providers and updating in-degrees
   * 5. Detecting circular dependencies if any providers remain unprocessed
   *
   * @param providers - List of service providers to determine boot order for
   * @returns Array of service providers in boot order
   *
   * @throws {ServiceBootException} For various dependency resolution errors:
   *   - Duplicate provider names
   *   - Missing service dependencies
   *   - Circular dependencies
   *
   * @example See {@link ../docs/service-manager-examples.md#dependency-resolution} for dependency resolution examples
   */
  private getBootOrder(providers: Array<ServiceProvider>): Array<ServiceProvider> {
    const graph = new Map<string, ServiceProvider>()
    const inDegree = new Map<string, number>()
    const adjList = new Map<string, string[]>()
    const serviceToProvider = new Map<string, string>()

    // Build the graph and service mapping
    for (const provider of providers) {
      const name = this.getProviderName(provider)
      // Check for duplicate provider names
      if (graph.has(name)) {
        throw new ServiceBootException(
          `Duplicate service provider name '${name}' detected. Each service provider must have a unique name.`
        )
      }

      graph.set(name, provider)
      inDegree.set(name, 0)
      adjList.set(name, [])

      // Map services to their providers
      const providedServices = this.getProvidedServices(provider)
      for (const service of providedServices) {
        const tokenKey = this.getTokenKey(service)
        serviceToProvider.set(tokenKey, name)
      }
    }

    // Build adjacency list and calculate in-degrees
    // For boot: dependency -> dependent (dependencies must be booted first)
    for (const provider of providers) {
      const providerName = this.getProviderName(provider)
      const dependencies = this.getProviderDependencies(provider)

      for (const depToken of dependencies) {
        const depTokenKey = this.getTokenKey(depToken)
        const depProviderName = serviceToProvider.get(depTokenKey)

        if (!depProviderName) {
          throw new ServiceBootException(
            `Service provider '${providerName}' depends on service '${depTokenKey}', but no provider provides this service`
          )
        }

        // Don't create self-dependencies
        if (depProviderName === providerName) {
          continue
        }

        // Dependency points to dependent
        adjList.get(depProviderName)!.push(providerName)
        inDegree.set(providerName, inDegree.get(providerName)! + 1)
      }
    }

    // Kahn's algorithm for topological sorting
    const queue: string[] = []
    const result: ServiceProvider[] = []

    // Find all nodes with no incoming edges (no dependencies)
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name)
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      const provider = graph.get(current)!
      result.push(provider)

      // Remove current node from the graph
      for (const neighbor of adjList.get(current)!) {
        const newDegree = inDegree.get(neighbor)! - 1
        inDegree.set(neighbor, newDegree)

        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }

    // Check for circular dependencies
    if (result.length !== providers.length) {
      const remaining = providers.filter((p) => !result.includes(p))
      const remainingNames = remaining.map((p) => this.getProviderName(p))
      throw new ServiceBootException(
        `Circular dependency detected among service providers: ${remainingNames.join(', ')}`
      )
    }

    return result
  }

  /**
   * Converts a token to a consistent string key for internal mapping.
   *
   * This method handles the conversion of various token types (strings, symbols,
   * constructors) to consistent string keys for use in internal data structures.
   * It attempts to use the token's description property for symbols before
   * falling back to toString().
   *
   * @param token - Token to convert to a string key
   * @returns String representation of the token for use as a map key
   *
   * @example See {@link ../docs/service-manager-examples.md#token-key-conversion} for token conversion examples
   */
  private getTokenKey(token: Token<any>): string {
    const description = (token as any)?.description
    return typeof description === 'string' ? description : token.toString()
  }
}

/**
 * @fileoverview
 *
 * ## ServiceManager Usage Patterns
 *
 * ### 1. Basic Application Setup
 * ```typescript
 * async function setupApplication() {
 *   const container = new Container();
 *   const serviceManager = new ServiceManager(container);
 *
 *   // Register all service providers
 *   serviceManager.register(new ConfigServiceProvider());
 *   serviceManager.register(new DatabaseServiceProvider());
 *   serviceManager.register(new AuthServiceProvider());
 *   serviceManager.register(new EmailServiceProvider());
 *   serviceManager.register(new ApServiceProvider());
 *
 *   try {
 *     // Registration phase
 *     await serviceManager.registerAll();
 *
 *     // Boot phase
 *     await serviceManager.bootAll();
 *
 *     console.log('Application started successfully');
 *     return { container, serviceManager };
 *   } catch (error) {
 *     console.error('Failed to start application:', error);
 *     throw error;
 *   }
 * }
 * ```
 *
 * ### 2. Graceful Shutdown Handler
 * ```typescript
 * async function setupGracefulShutdown(serviceManager: ServiceManager) {
 *   const shutdown = async (signal: string) => {
 *     console.log(`Received ${signal}, starting graceful shutdown...`);
 *
 *     try {
 *       await serviceManager.shutdownAll();
 *       console.log('Application shut down successfully');
 *       process.exit(0);
 *     } catch (error) {
 *       console.error('Error during shutdown:', error);
 *       process.exit(1);
 *     }
 *   };
 *
 *   process.on('SIGTERM', () => shutdown('SIGTERM'));
 *   process.on('SIGINT', () => shutdown('SIGINT'));
 * }
 * ```
 *
 * ### 3. Testing with ServiceManager
 * ```typescript
 * describe('Integration Tests', () => {
 *   let container: Container;
 *   let serviceManager: ServiceManager;
 *
 *   beforeEach(async () => {
 *     container = new Container();
 *     serviceManager = new ServiceManager(container);
 *
 *     // Register test-specific providers
 *     serviceManager.register(new TestConfigServiceProvider());
 *     serviceManager.register(new MockDatabaseServiceProvider());
 *     serviceManager.register(new TestEmailServiceProvider());
 *
 *     await serviceManager.registerAll();
 *     await serviceManager.bootAll();
 *   });
 *
 *   afterEach(async () => {
 *     await serviceManager.shutdownAll();
 *   });
 *
 *   test('should handle user registration flow', async () => {
 *     const userService = container.resolve<UserService>('userService');
 *     // Test with fully initialized services
 *   });
 * });
 * ```
 *
 * ### 4. Environment-Specific Provider Registration
 * ```typescript
 * function createServiceManager(environment: string): ServiceManager {
 *   const container = new Container();
 *   const serviceManager = new ServiceManager(container);
 *
 *   // Core providers (always registered)
 *   serviceManager.register(new ConfigServiceProvider());
 *   serviceManager.register(new LoggingServiceProvider());
 *
 *   // Environment-specific providers
 *   if (environment === 'production') {
 *     serviceManager.register(new ProductionDatabaseServiceProvider());
 *     serviceManager.register(new RedisServiceProvider());
 *     serviceManager.register(new MetricsServiceProvider());
 *   } else if (environment === 'test') {
 *     serviceManager.register(new InMemoryDatabaseServiceProvider());
 *     serviceManager.register(new MockEmailServiceProvider());
 *   } else {
 *     serviceManager.register(new DevelopmentDatabaseServiceProvider());
 *     serviceManager.register(new LocalEmailServiceProvider());
 *   }
 *
 *   return serviceManager;
 * }
 * ```
 *
 * ### 5. Error Handling and Recovery
 * ```typescript
 * async function startApplicationWithRetry(maxRetries = 3) {
 *   const container = new Container();
 *   const serviceManager = new ServiceManager(container);
 *
 *   // Register providers...
 *
 *   for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *     try {
 *       await serviceManager.registerAll();
 *       await serviceManager.bootAll();
 *       return { container, serviceManager };
 *     } catch (error) {
 *       console.error(`Startup attempt ${attempt} failed:`, error);
 *
 *       if (attempt < maxRetries) {
 *         console.log('Retrying in 5 seconds...');
 *         await new Promise(resolve => setTimeout(resolve, 5000));
 *
 *         // Reset state for retry
 *         try {
 *           await serviceManager.shutdownAll();
 *         } catch (shutdownError) {
 *           console.warn('Error during cleanup:', shutdownError);
 *         }
 *       } else {
 *         throw new Error(`Failed to start application after ${maxRetries} attempts`);
 *       }
 *     }
 *   }
 * }
 * ```
 */
