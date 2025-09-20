import { Application } from './Application'
import { type ServiceProvider } from '../Contracts/ServiceProvider'

/**
 * Application kernel that orchestrates the complete application startup process.
 *
 * The Kernel class serves as a high-level orchestrator that simplifies application
 * setup and management. It provides a clean interface for configuring service
 * providers and managing the application lifecycle, abstracting away the complexity
 * of the underlying Application class.
 *
 * ## Purpose and Benefits
 *
 * The Kernel acts as a facade over the Application class, providing:
 * - **Simplified Configuration**: Easy service provider registration and management
 * - **Lifecycle Orchestration**: Automated application startup and shutdown
 * - **Clean Separation**: Clear boundary between configuration and runtime
 * - **Reusability**: Kernels can be composed and reused across different contexts
 * - **Testing Support**: Easy mocking and testing of application configurations
 *
 * ## Design Pattern
 *
 * The Kernel follows the Facade pattern, providing a simplified interface to
 * the more complex Application subsystem. It also incorporates elements of the
 * Builder pattern for service provider configuration.
 *
 * ## Typical Usage Flow
 *
 * 1. **Creation**: Kernel is created with initial service providers
 * 2. **Configuration**: Additional providers are registered as needed
 * 3. **Startup**: Kernel starts the application with all registered providers
 * 4. **Runtime**: Application runs normally with full service availability
 * 5. **Shutdown**: Kernel stops the application gracefully
 *
 * 
 * For detailed usage examples and patterns, see:
 * - {@link ../examples/kernel.ts Basic Usage Examples}
 * - {@link ../examples/kernel-patterns.ts Advanced Kernel Patterns}
 */
export class Kernel {
  /** The underlying application instance that manages the actual lifecycle */
  private readonly application: Application

  /** Collection of service providers to be registered with the application */
  private readonly serviceProviders: Array<ServiceProvider> = []

  /**
   * Creates a new Kernel instance with optional initial service providers.
   *
   * The kernel creates a fresh Application instance and optionally accepts
   * an array of service providers to register. Additional providers can be
   * added later using the registerServiceProvider method.
   *
   * @param serviceProviders - Initial service providers to register (default: empty array)
   *
   * For detailed constructor usage examples, see:
   * {@link ../examples/kernel.ts Constructor Usage Examples}
   */
  constructor(serviceProviders: Array<ServiceProvider> = []) {
    this.application = new Application()
    this.serviceProviders = serviceProviders
  }

  /**
   * Returns the underlying Application instance for direct access.
   *
   * This method provides access to the Application instance managed by the kernel.
   * It's useful for accessing the container, service manager, or other application
   * features that aren't directly exposed by the kernel interface.
   *
   * Use this method when you need fine-grained control over the application
   * or need to access advanced features not available through the kernel.
   *
   * @returns The underlying Application instance
   *
   * For detailed application access examples, see:
   * {@link ../examples/kernel.ts Application Access Examples}
   */
  public getApplication(): Application {
    return this.application
  }

  /**
   * Registers a new service provider with the kernel.
   *
   * Service providers are added to the kernel's internal collection and will
   * be registered with the application during the startup process. Providers
   * can be added at any time before calling start().
   *
   * @param serviceProvider - The service provider to register
   * @returns The kernel instance for method chaining
   *
   * For detailed service provider registration examples, see:
   * {@link ../examples/kernel.ts Service Provider Registration Examples}
   */
  public registerServiceProvider(serviceProvider: ServiceProvider): this {
    this.serviceProviders.push(serviceProvider)
    return this
  }

  /**
   * Starts the application by registering all service providers and running the app.
   *
   * This method orchestrates the complete application startup process:
   * 1. Registers all collected service providers with the application
   * 2. Calls the application's run() method (bootstrap + boot)
   * 3. Returns the started application for further use
   *
   * The startup process handles service registration, dependency resolution,
   * and service initialization automatically. If any step fails, appropriate
   * exceptions are thrown.
   *
   * @throws {ApplicationBootstrapException} If service registration fails
   * @throws {ApplicationBootException} If service initialization fails
   * @returns Promise resolving to the started Application instance
   *
   * For detailed startup examples and patterns, see:
   * {@link ../examples/kernel.ts Kernel Startup Examples}
   */
  public async start(): Promise<Application> {
    for (const provider of this.serviceProviders) {
      this.application.register(provider)
    }

    await this.application.run()
    return this.application
  }

  /**
   * Stops the application gracefully by shutting down all services.
   *
   * This method delegates to the application's shutdown() method, which
   * handles graceful shutdown of all services in reverse dependency order.
   * The kernel ensures proper cleanup and resource deallocation.
   *
   * @throws {ApplicationShutdownException} If some services fail to shutdown cleanly
   * @returns Promise that resolves when shutdown is complete
   *
   * For detailed shutdown examples and patterns, see:
   * {@link ../examples/kernel.ts Kernel Shutdown Examples}
   */
  public async stop(): Promise<void> {
    await this.application.shutdown()
  }
}
