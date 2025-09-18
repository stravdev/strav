import { Container } from '../Container/Container'
import type { Token } from '../Types'

/**
 * Interface defining the contract for service providers in the dependency injection system.
 *
 * Service providers are modular components that encapsulate the registration and lifecycle
 * management of related services. They provide a structured way to organize service
 * registration, handle initialization logic, and manage dependencies between different
 * parts of an application.
 *
 * Service providers enable:
 * - Modular service organization
 * - Controlled initialization order through dependencies
 * - Lifecycle management (boot, shutdown)
 * - Service discovery and introspection
 * - Clean separation of concerns
 */
export interface ServiceProvider {
  /**
   * Registers services with the dependency injection container.
   *
   * This is the core method where the provider defines which services it provides
   * and how they should be created. This method is called during the service
   * registration phase, before any services are resolved or used.
   *
   * The method can be synchronous or asynchronous, allowing for complex
   * registration logic that might involve async operations like loading
   * configuration files or connecting to external services.
   *
   * @param container - The DI container instance to register services with
   * @returns Promise<void> for async registration, or void for synchronous
   */
  register(container: Container): Promise<void> | void

  /**
   * Optional lifecycle method called after all service providers have registered their services.
   *
   * The boot phase happens after the registration phase is complete, meaning all
   * services are registered and can be resolved. This is where you perform
   * initialization logic that requires other services to be available, such as:
   * - Database connections and migrations
   * - Cache warming
   * - External service health checks
   * - Background job initialization
   *
   * Boot methods are called in dependency order, ensuring that providers boot
   * after their dependencies have been booted.
   */
  boot?(container: Container): Promise<void> | void

  /**
   * Optional lifecycle method called during application shutdown.
   *
   * This method provides a clean shutdown hook for releasing resources,
   * closing connections, and performing cleanup operations. Shutdown methods
   * are called in reverse dependency order to ensure proper cleanup sequence.
   *
   * Common shutdown tasks include:
   * - Closing database connections
   * - Stopping background jobs
   * - Flushing logs and metrics
   * - Cleaning up temporary resources
   */
  shutdown?(container: Container): Promise<void> | void

  /**
   * Returns a unique identifier for this service provider.
   *
   * The provider name is used for:
   * - Logging and debugging
   * - Dependency resolution order
   * - Error reporting and diagnostics
   * - Service provider discovery and introspection
   *
   * Provider names should be descriptive and unique within the application.
   * Consider using a consistent naming convention like "XxxServiceProvider".
   *
   * @returns A unique string identifier for this provider
   */
  getProviderName(): string

  /**
   * Optional method to declare dependencies on other service providers or services.
   *
   * Dependencies define the order in which providers are booted and shut down.
   * A provider will only be booted after all its dependencies have been booted.
   * During shutdown, providers are shut down in reverse dependency order.
   *
   * Dependencies can be:
   * - Other service provider names
   * - Service tokens that must be available
   * - Interface tokens this provider depends on
   *
   * @returns Array of service tokens this provider depends on
   */
  getDependencies?(): Array<Token<any>>

  /**
   * Optional method to declare what services this provider makes available.
   *
   * This method enables service discovery and validation, allowing the
   * dependency injection system to:
   * - Verify all declared services are actually registered
   * - Generate service maps and documentation
   * - Detect service conflicts between providers
   * - Optimize container initialization
   *
   * @returns Array of service tokens this provider registers
   */
  getProvidedServices?(): Array<Token<any>>
}
