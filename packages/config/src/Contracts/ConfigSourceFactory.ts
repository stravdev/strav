import type { ConfigSource } from './ConfigSource'

/**
 * Factory contract for creating and managing configuration sources.
 *
 * ConfigSourceFactory serves as the central abstraction for instantiating different types of
 * configuration sources within the configuration system. This interface implements the Factory
 * pattern to provide a unified, extensible approach to source creation while abstracting the
 * complexities of individual source implementations.
 *
 * The factory pattern enables several key architectural benefits:
 * - Centralized source creation logic with consistent instantiation patterns
 * - Abstraction of source-specific construction details and dependencies
 * - Runtime flexibility in choosing appropriate source implementations
 * - Simplified testing through dependency injection and mocking capabilities
 * - Extensibility for adding new source types without modifying existing code
 *
 * This factory supports the creation of multiple source types including file-based sources
 * for local configuration files, HTTP-based sources for remote configuration endpoints,
 * and environment variable sources for system-level configuration. Each factory method
 * encapsulates the specific instantiation logic required for its respective source type,
 * including validation, option processing, and resource initialization.
 *
 * The factory works in conjunction with the ConfigService and ConfigServiceProvider to
 * enable flexible configuration loading strategies. Sources created by this factory can
 * be combined, prioritized, and managed through the broader configuration system to
 * support complex deployment scenarios and configuration hierarchies.
 *
 * Implementations of this factory should ensure thread safety, proper resource management,
 * and consistent error handling across all source creation methods. The factory should
 * also support configuration validation and provide meaningful error messages for
 * invalid source parameters or inaccessible resources.
 */
export interface ConfigSourceFactory {
  /**
   * Creates a file-based configuration source for local file system access.
   *
   * This method instantiates a ConfigSource implementation capable of reading configuration
   * data from local files. The created source supports various file formats through the
   * configuration loader system and can optionally monitor files for changes to enable
   * reactive configuration updates.
   *
   * The file source handles path resolution, supporting both relative and absolute paths,
   * and performs validation to ensure file accessibility and readability. It integrates
   * with the file system watching capabilities to detect configuration changes and trigger
   * reload events when monitoring is enabled.
   *
   * @param path - The file system path to the configuration file, supporting both relative
   *               and absolute paths. The path will be resolved relative to the current
   *               working directory if not absolute.
   * @returns A ConfigSource instance configured for file-based configuration loading,
   *          with the specified path as its location identifier.
   */
  createFileSource(path: string): ConfigSource

  /**
   * Creates an HTTP-based configuration source for remote configuration retrieval.
   *
   * This method instantiates a ConfigSource implementation that fetches configuration
   * data from remote HTTP or HTTPS endpoints. The created source supports customizable
   * request options including authentication headers, timeout settings, and polling
   * intervals for periodic configuration updates.
   *
   * The HTTP source handles network communication, request/response processing, error
   * handling for network failures, and optional polling mechanisms for dynamic
   * configuration updates. It supports various HTTP methods and can be configured
   * with custom headers for authentication and content negotiation.
   *
   * @param url - The HTTP or HTTPS URL endpoint from which to fetch configuration data.
   *              Must be a valid, accessible URL that returns configuration data in a
   *              supported format.
   * @param options - Optional configuration object for customizing HTTP request behavior,
   *                  including headers, timeout values, polling intervals, and other
   *                  HTTP-specific settings. The exact structure depends on the
   *                  implementation's supported options.
   * @returns A ConfigSource instance configured for HTTP-based configuration loading,
   *          with the specified URL as its location identifier.
   */
  createHttpSource(url: string, options?: any): ConfigSource

  /**
   * Creates an environment variable configuration source for system-level configuration.
   *
   * This method instantiates a ConfigSource implementation that reads configuration
   * data from the process environment variables. The created source provides access
   * to system-level configuration settings that are typically set during application
   * deployment or runtime initialization.
   *
   * The environment source handles environment variable parsing, type conversion,
   * and optional prefix filtering to scope the configuration to specific variable
   * sets. It provides a read-only view of the environment at the time of source
   * creation, though some implementations may support dynamic environment monitoring.
   *
   * Environment sources are particularly useful for deployment-specific configuration,
   * security-sensitive settings, and integration with container orchestration systems
   * that inject configuration through environment variables.
   *
   * @returns A ConfigSource instance configured for environment variable access,
   *          with a standardized location identifier indicating environment scope.
   */
  createEnvironmentSource(): ConfigSource
}
