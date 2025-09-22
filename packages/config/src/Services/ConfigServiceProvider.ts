import type { Container, ServiceProvider, Token } from '@strav/kernel'
import type { ConfigService as ConfigServiceContract } from '../Contracts/ConfigService'
import type { ConfigServiceProvider as ConfigServiceProviderContract } from '../Contracts/ConfigServiceProvider'
import type { ConfigServiceOptions } from '../Types/ConfigServiceOptions'
import type { ConfigSource } from '../Contracts/ConfigSource'

import { ConfigService } from './ConfigService'

/**
 * Service provider for the configuration system.
 *
 * This provider implements both the ConfigServiceProvider contract for configuration-specific
 * functionality and the ServiceProvider contract from the kernel for DI integration.
 *
 * The ConfigServiceProvider is responsible for:
 * - Registering the ConfigService with the dependency injection container
 * - Managing configuration sources and options
 * - Handling service lifecycle (boot, shutdown)
 * - Providing factory methods for easy instantiation
 *
 * @implements {ConfigServiceProviderContract}
 * @implements {ServiceProvider}
 */
export class ConfigServiceProvider implements ConfigServiceProviderContract, ServiceProvider {
  /**
   * Configuration options for the ConfigService instance.
   * @private
   */
  private options: ConfigServiceOptions = {}

  /**
   * Array of configuration sources to load data from.
   * @private
   */
  private sources: ConfigSource[] = []

  /**
   * Dependency injection token for the ConfigService.
   * @private
   */
  private configServiceToken: Token<ConfigServiceContract> = Symbol('ConfigService')

  /**
   * Configure the service provider with options.
   *
   * Merges the provided options with existing options, allowing for
   * incremental configuration of the service provider.
   *
   * @param options - Configuration options to merge with existing options
   * @returns This ConfigServiceProvider instance for method chaining
   */
  configure(options: ConfigServiceOptions): ConfigServiceProvider {
    this.options = { ...this.options, ...options }
    return this
  }

  /**
   * Set configuration sources for the service.
   *
   * Accepts either a single ConfigSource or an array of ConfigSources.
   * These sources will be used to load configuration data when the
   * service is booted.
   *
   * @param sources - Single ConfigSource or array of ConfigSources to use for loading configuration
   * @returns This ConfigServiceProvider instance for method chaining
   */
  withSources(sources: ConfigSource | ConfigSource[]): ConfigServiceProvider {
    this.sources = Array.isArray(sources) ? sources : [sources]
    return this
  }

  /**
   * Register the ConfigService with the DI container.
   *
   * This method is called during the service registration phase and sets up
   * the ConfigService as a singleton in the dependency injection container.
   * The service is registered with both a symbol token and a string token
   * for flexible resolution.
   *
   * @param container - The dependency injection container to register the service with
   */
  register(container: Container): void {
    // Register the ConfigService as a singleton using registerFactory
    container.registerFactory(this.configServiceToken, () => {
      return this.createService()
    })

    // Also register it by a string token for easier resolution
    container.registerFactory('ConfigService', () => {
      return container.resolve(this.configServiceToken)
    })
  }

  /**
   * Boot the configuration service by loading from sources.
   *
   * This is called after all services are registered and handles the initial
   * loading of configuration data from the configured sources. If no sources
   * are configured, this method does nothing.
   *
   * @param container - The dependency injection container to resolve the ConfigService from
   * @throws {Error} If the ConfigService cannot be resolved or loading fails
   */
  async boot(container: Container): Promise<void> {
    if (this.sources.length > 0) {
      const configService = container.resolve<ConfigServiceContract>(this.configServiceToken)
      await configService.load(this.sources)
    }
  }

  /**
   * Shutdown the configuration service and clean up resources.
   *
   * This method is called during application shutdown and ensures that
   * the ConfigService is properly disposed of. It includes error handling
   * to gracefully handle cases where the service might not be registered
   * or already disposed.
   *
   * @param container - The dependency injection container to resolve the ConfigService from
   */
  async shutdown(container: Container): Promise<void> {
    try {
      const configService = container.resolve<ConfigServiceContract>(this.configServiceToken)
      try {
        configService.dispose()
      } catch (disposeError) {
        // Only log in non-test environments to avoid cluttering test output
        if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
          console.warn('Failed to dispose ConfigService during shutdown:', disposeError)
        }
      }
    } catch (resolveError) {
      // Service might not be registered or already disposed
      // Only log in non-test environments to avoid cluttering test output
      if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        console.warn('Failed to dispose ConfigService during shutdown:', resolveError)
      }
    }
  }

  /**
   * Get the provider name for identification and logging.
   *
   * Returns a string identifier for this service provider, used by the
   * dependency injection container for logging and debugging purposes.
   *
   * @returns The string name of this provider
   */
  getProviderName(): string {
    return 'ConfigServiceProvider'
  }

  /**
   * Get dependencies - no dependencies for the config service.
   *
   * Returns an empty array as the ConfigService has no dependencies on other
   * services and can be registered independently.
   *
   * @returns Empty array indicating no dependencies
   */
  getDependencies(): Array<Token<any>> {
    return []
  }

  /**
   * Get the services this provider makes available.
   *
   * Returns an array of tokens representing the services that this provider
   * registers with the container. The ConfigService is available under both
   * a symbol token and a string token for flexible resolution.
   *
   * @returns Array of tokens for services provided by this provider
   */
  getProvidedServices(): Array<Token<any>> {
    return [this.configServiceToken, 'ConfigService']
  }

  /**
   * Register service with DI container (ConfigServiceProvider contract method).
   *
   * This delegates to the ServiceProvider register method and exists to satisfy
   * the ConfigServiceProvider contract interface. It provides the same functionality
   * as the register method but with a different signature for contract compliance.
   *
   * @param container - The dependency injection container to register the service with
   */
  registerService(container: any): void {
    this.register(container)
  }

  /**
   * Create service instance directly (for testing or direct usage).
   *
   * Creates a new ConfigService instance with the configured options.
   * This method is useful for testing scenarios or when you need to create
   * a ConfigService instance outside of the dependency injection container.
   * Note that sources are not automatically loaded when using this method.
   *
   * @returns A new ConfigService instance configured with the provider's options
   */
  createService(): ConfigServiceContract {
    const service = new ConfigService(this.options)

    // If sources are configured, we could load them here,
    // but typically this is done in the boot phase for DI scenarios
    return service
  }

  /**
   * Static factory method for easier instantiation.
   *
   * Creates a new ConfigServiceProvider instance and configures it with the
   * provided options. This is a convenience method that combines instantiation
   * and configuration in a single call.
   *
   * @param options - Configuration options for the ConfigService (defaults to empty object)
   * @returns A new configured ConfigServiceProvider instance
   */
  static create(options: ConfigServiceOptions = {}): ConfigServiceProvider {
    return new ConfigServiceProvider().configure(options)
  }

  /**
   * Static factory method with sources.
   *
   * Creates a new ConfigServiceProvider instance, configures it with the provided
   * options, and sets up the specified configuration sources. This is the most
   * convenient method for creating a fully configured provider in a single call.
   *
   * @param sources - Single ConfigSource or array of ConfigSources to use for loading configuration
   * @param options - Configuration options for the ConfigService (defaults to empty object)
   * @returns A new configured ConfigServiceProvider instance with sources
   */
  static withSources(
    sources: ConfigSource | ConfigSource[],
    options: ConfigServiceOptions = {}
  ): ConfigServiceProvider {
    return new ConfigServiceProvider().configure(options).withSources(sources)
  }
}
