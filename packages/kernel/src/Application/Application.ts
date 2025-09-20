import { Container } from '../Container/Container'
import { ServiceManager } from '../Services/ServiceManager'
import { type ServiceProvider } from '../Contracts/ServiceProvider'
import {
  ApplicationBootException,
  ApplicationBootstrapException,
  ApplicationShutdownException,
} from '../Exceptions/ApplicationExceptions'
import type {
  GroupedShutdownException,
  ServiceBootException,
} from '../Exceptions/ServiceExceptions'

/**
 * Main application class that orchestrates the complete application lifecycle.
 *
 * The Application class serves as the primary entry point for managing a dependency
 * injection-based application. It coordinates the lifecycle of service providers,
 * manages application state, and provides a clean interface for application
 * initialization, operation, and shutdown.
 *
 * ## Application Lifecycle
 *
 * The application follows a strict lifecycle with distinct phases:
 *
 * 1. **Creation**: Application instance is created with empty container
 * 2. **Registration**: Service providers are registered (queued for processing)
 * 3. **Bootstrap**: All service providers register their services with the container
 * 4. **Boot**: Service providers perform initialization logic in dependency order
 * 5. **Runtime**: Application is fully operational, services can be resolved
 * 6. **Shutdown**: Services are gracefully shut down in reverse dependency order
 *
 * ## State Management
 *
 * The application maintains two key state flags:
 * - `isBootstrapped`: Services are registered and available for resolution
 * - `isBooted`: Services have completed initialization and are ready for use
 *
 * ## Key Features
 *
 * - **Lifecycle Management**: Complete application lifecycle orchestration
 * - **State Validation**: Prevents invalid state transitions and operations
 * - **Error Handling**: Comprehensive error wrapping with proper exception types
 * - **Fluent Interface**: Method chaining support for clean configuration
 * - **Graceful Shutdown**: Proper resource cleanup with failure tolerance
 *
 * 
 * For comprehensive usage examples and patterns, see:
 * - {@link ../examples/application.ts} - Basic usage examples
 * - {@link ../examples/application-patterns.ts} - Advanced architectural patterns
 */
export class Application {
  /** The dependency injection container that manages service instances */
  private readonly container: Container

  /** The service manager that handles provider lifecycle orchestration */
  private readonly serviceManager: ServiceManager

  /** Flag indicating whether service providers have completed registration */
  private isBootstrapped = false

  /** Flag indicating whether service providers have completed initialization */
  private isBooted = false

  /**
   * Creates a new Application instance.
   * 
   * For usage examples, see {@link ../examples/application.ts#constructor-usage}
   */
  constructor() {
    this.container = new Container()
    this.serviceManager = new ServiceManager(this.container)
  }

  /**
   * Gets the dependency injection container.
   * 
   * For usage examples, see {@link ../examples/application.ts#container-usage}
   */
  public getContainer(): Container {
    return this.container
  }

  /**
   * Gets the service manager for lifecycle management.
   * 
   * For usage examples, see {@link ../examples/application.ts#service-manager-usage}
   */
  public getServiceManager(): ServiceManager {
    return this.serviceManager
  }

  /**
   * Registers a service provider with the application.
   * 
   * For usage examples, see {@link ../examples/application.ts#service-provider-registration}
   */
  public register(serviceProvider: ServiceProvider): this {
    this.serviceManager.register(serviceProvider)
    return this
  }

  /**
   * Bootstraps the application by registering all queued service providers.
   * 
   * For usage examples, see {@link ../examples/application.ts#bootstrap-phase}
   */
  public async bootstrap(): Promise<this> {
    if (this.isBootstrapped) {
      throw new ApplicationBootstrapException('Application is already bootstrapped')
    }

    await this.serviceManager.registerAll()
    this.isBootstrapped = true
    return this
  }

  /**
   * Boots the application by starting all registered services.
   * 
   * For usage examples, see {@link ../examples/application.ts#boot-phase}
   */
  public async boot(): Promise<this> {
    if (!this.isBootstrapped) {
      throw new ApplicationBootException('Application must be bootstrapped before booting')
    }

    if (this.isBooted) {
      throw new ApplicationBootException('Application is already booted')
    }

    try {
      await this.serviceManager.bootAll()
    } catch (error) {
      throw new ApplicationBootException(
        'Failed to boot all services',
        error as ServiceBootException
      )
    }

    this.isBooted = true
    return this
  }

  /**
   * Gracefully shuts down the application and all services.
   * 
   * For usage examples, see {@link ../examples/application.ts#shutdown-phase}
   */
  public async shutdown(): Promise<void> {
    if (!this.isBooted) {
      return
    }

    try {
      await this.serviceManager.shutdownAll()
    } catch (error) {
      throw new ApplicationShutdownException(
        'Failed to pre-shutdown all services',
        error as GroupedShutdownException
      )
    }

    this.isBooted = false
    this.isBootstrapped = false
  }

  /**
   * Checks if the application is fully operational.
   * 
   * For usage examples, see {@link ../examples/application.ts#running-status-check}
   */
  public isRunning(): boolean {
    return this.isBootstrapped && this.isBooted
  }

  /**
   * Runs the complete application lifecycle in a single call.
   * 
   * For usage examples, see {@link ../examples/application.ts#complete-lifecycle}
   */
  public async run(): Promise<void> {
    await this.bootstrap()
    await this.boot()
  }
}
