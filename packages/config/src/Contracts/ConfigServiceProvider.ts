import type { ConfigServiceOptions } from '../Types/ConfigServiceOptions'
import type { ConfigService } from './ConfigService'
import type { ConfigSource } from './ConfigSource'

/**
 * Service provider contract for dependency injection framework integration.
 * 
 * The ConfigServiceProvider serves as the bridge between the configuration system
 * and dependency injection containers, implementing the Service Provider pattern
 * to encapsulate service registration, lifecycle management, and configuration.
 * 
 * This interface defines the contract for providers that:
 * - Register ConfigService instances with DI containers
 * - Manage configuration sources and service options
 * - Provide factory methods for service instantiation
 * - Support both container-managed and direct service creation
 * - Enable fluent configuration through method chaining
 * 
 * The provider pattern allows for clean separation between service definition
 * and service registration, enabling modular configuration management and
 * supporting various DI frameworks through a consistent interface.
 * 
 * Key responsibilities include service lifecycle management, dependency
 * resolution coordination, and providing both programmatic and container-based
 * service access patterns for maximum flexibility in different application
 * architectures.
 */
export interface ConfigServiceProvider {
  /**
   * Configure the service provider with options that control ConfigService behavior.
   * 
   * This method allows setting various configuration options such as strict mode,
   * frozen state, validation rules, and other behavioral parameters that will
   * be applied to the ConfigService instance when created.
   * 
   * @param options - Configuration options object containing service behavior settings
   * @returns The same provider instance for method chaining
   * @throws ConfigurationError when invalid options are provided
   */
  configure(options: ConfigServiceOptions): ConfigServiceProvider

  /**
   * Set configuration sources that the ConfigService will load data from.
   * 
   * Accepts either a single configuration source or an array of sources that
   * will be processed in order. Sources can include file-based, environment,
   * remote, or custom source implementations.
   * 
   * @param sources - Single source or array of ConfigSource instances to load from
   * @returns The same provider instance for method chaining
   * @throws ConfigurationError when invalid or incompatible sources are provided
   */
  withSources(sources: ConfigSource | ConfigSource[]): ConfigServiceProvider

  /**
   * Register the ConfigService with a dependency injection container.
   * 
   * This method handles the registration of the ConfigService as a managed
   * service within the DI container, typically as a singleton. The registration
   * includes proper token binding and factory setup for service resolution.
   * 
   * @param container - The dependency injection container to register the service with
   * @throws RegistrationError when service registration fails or conflicts occur
   */
  registerService(container: any): void

  /**
   * Create a ConfigService instance directly without container management.
   * 
   * This factory method provides direct instantiation of ConfigService for
   * scenarios where dependency injection is not used, such as testing,
   * standalone usage, or manual service management.
   * 
   * @returns A new ConfigService instance configured with the provider's settings
   * @throws ConfigurationError when service creation fails due to invalid configuration
   */
  createService(): ConfigService
}
