import type { ConfigChange } from '../Types/ConfigChange'
import type { ConfigData } from '../Types/ConfigData'
import type { ConfigSource } from './ConfigSource'

/**
 * Primary configuration service interface that provides the main business logic layer for configuration management.
 * 
 * The ConfigService serves as the central hub for all configuration operations within an application,
 * providing a unified interface for loading, accessing, modifying, and monitoring configuration data.
 * It abstracts the complexity of multiple configuration sources and provides a consistent API for
 * configuration management across different environments and deployment scenarios.
 * 
 * This service implements several key patterns:
 * - Repository pattern for configuration data access and manipulation
 * - Observer pattern for change notifications and reactive updates
 * - Strategy pattern through pluggable ConfigSource implementations
 * - Lazy loading and caching for optimal performance
 * 
 * The service supports:
 * - Multiple configuration sources with automatic merging and precedence handling
 * - Dot-notation path access for nested configuration structures
 * - Real-time change detection and notification system
 * - Immutable configuration modes for production environments
 * - Graceful error handling with configurable strictness levels
 * - Resource cleanup and lifecycle management
 * 
 * Configuration lifecycle:
 * 1. Service instantiation with optional configuration options
 * 2. Source registration and loading phase
 * 3. Active configuration access and modification phase
 * 4. Optional watching and change notification phase
 * 5. Cleanup and disposal phase
 */
export interface ConfigService {
  /**
   * Loads configuration data from one or more configuration sources.
   * 
   * This method initializes the service by resolving and merging configuration data
   * from the provided sources. Sources are processed in order, with later sources
   * taking precedence over earlier ones for conflicting keys. The loading process
   * is asynchronous to accommodate various source types including remote configurations,
   * file system operations, and network-based sources.
   * 
   * @param sources - Single ConfigSource or array of ConfigSources to load configuration from
   * @throws {Error} When source resolution fails or configuration data is invalid
   */
  load(sources: ConfigSource | ConfigSource[]): Promise<void>

  /**
   * Reloads configuration data from all previously loaded sources.
   * 
   * This method refreshes the configuration by re-resolving all sources that were
   * used in the initial load operation. It maintains the same source order and
   * precedence rules as the original load. Useful for picking up configuration
   * changes without restarting the application or manually tracking source modifications.
   * 
   * @throws {ConfigNotLoadedException} When called before initial load operation
   * @throws {Error} When source re-resolution fails or produces invalid data
   */
  reload(): Promise<void>

  /**
   * Checks whether the configuration service has been successfully loaded.
   * 
   * This method returns the current loading state of the service, indicating whether
   * the load method has been called and completed successfully. A loaded service
   * is ready for configuration access and modification operations.
   * 
   * @returns True if configuration has been loaded, false otherwise
   */
  isLoaded(): boolean

  /**
   * Retrieves a configuration value using dot-notation path with optional default fallback.
   * 
   * This method provides the primary interface for accessing configuration values
   * using a hierarchical path notation. It supports deep object traversal and
   * type-safe value retrieval with generic type parameters. When a path doesn't
   * exist, the method can either return a default value or throw an exception
   * based on the service's strictness configuration.
   * 
   * @param path - Dot-notation path to the configuration value (e.g., 'database.host', 'app.features.auth.enabled')
   * @param defaultValue - Optional default value to return when the path doesn't exist
   * @returns The configuration value at the specified path, or the default value if path doesn't exist
   * @throws {ConfigNotLoadedException} When called before configuration is loaded
   * @throws {Error} In strict mode when path doesn't exist and no default is provided
   */
  get<T = any>(path: string, defaultValue?: T): T

  /**
   * Retrieves the complete configuration data structure.
   * 
   * This method returns the entire merged configuration object, providing access
   * to all loaded configuration data. Useful for debugging, serialization, or
   * when you need to work with the complete configuration structure rather than
   * individual values.
   * 
   * @returns The complete configuration data object containing all merged configuration from loaded sources
   * @throws {ConfigNotLoadedException} When called before configuration is loaded
   */
  getAll(): ConfigData

  /**
   * Checks whether a configuration path exists in the loaded configuration.
   * 
   * This method performs existence checking for configuration paths without
   * retrieving the actual value. It supports the same dot-notation path format
   * as the get method and can be used for conditional configuration access or
   * validation scenarios.
   * 
   * @param path - Dot-notation path to check for existence
   * @returns True if the path exists in the configuration, false otherwise
   * @throws {ConfigNotLoadedException} When called before configuration is loaded
   */
  has(path: string): boolean

  /**
   * Sets a configuration value at the specified dot-notation path.
   * 
   * This method allows runtime modification of configuration values, supporting
   * the same hierarchical path notation as the get method. It automatically creates
   * intermediate objects as needed and notifies any registered watchers of the change.
   * The operation respects the service's frozen state and will throw an exception
   * if modifications are not allowed.
   * 
   * @param path - Dot-notation path where to set the value
   * @param value - The value to set at the specified path
   * @throws {ConfigNotLoadedException} When called before configuration is loaded
   * @throws {ConfigReadOnlyException} When the service is in frozen/read-only mode
   */
  set(path: string, value: any): void

  /**
   * Merges additional configuration data into the existing configuration.
   * 
   * This method performs a deep merge operation, combining the provided data
   * with the existing configuration. The merge operation follows the same
   * precedence rules as source loading, with the new data taking precedence
   * over existing values for conflicting keys. All registered watchers are
   * notified of the resulting changes.
   * 
   * @param data - Configuration data to merge into the existing configuration
   * @throws {ConfigNotLoadedException} When called before configuration is loaded
   * @throws {ConfigReadOnlyException} When the service is in frozen/read-only mode
   */
  merge(data: ConfigData): void

  /**
   * Registers a global change watcher that monitors all configuration modifications.
   * 
   * This overload allows monitoring of all configuration changes regardless of path.
   * The callback receives an array of all changes that occurred in a single operation,
   * enabling batch processing of related modifications. The returned function can be
   * called to unregister the watcher and stop receiving notifications.
   * 
   * @param callback - Function to call when any configuration changes occur
   * @returns Unwatch function that removes the watcher when called
   */
  watch(callback: (changes: ConfigChange[]) => void): () => void

  /**
   * Registers a path-specific change watcher that monitors modifications to a particular configuration path.
   * 
   * This overload allows targeted monitoring of specific configuration paths, reducing
   * noise and improving performance for components that only care about particular
   * configuration values. The callback receives the specific change that occurred
   * at the watched path.
   * 
   * @param path - Dot-notation path to watch for changes
   * @param callback - Function to call when the specified path changes
   * @returns Unwatch function that removes the watcher when called
   */
  watch(path: string, callback: (change: ConfigChange) => void): () => void

  /**
   * Cleans up all resources and stops all active operations.
   * 
   * This method performs comprehensive cleanup of the service, including stopping
   * all active watchers, disposing of source watchers, clearing internal state,
   * and releasing any held resources. It should be called when the service is
   * no longer needed to prevent memory leaks and ensure proper application shutdown.
   * After disposal, the service should not be used for any operations.
   */
  dispose(): void
}
