import type { ConfigData } from '../Types/ConfigData'

/**
 * Configuration storage abstraction that provides persistent, efficient access to parsed configuration data.
 *
 * ConfigStore serves as the data persistence layer within the configuration system, implementing
 * the Repository pattern to abstract storage mechanisms and provide a unified interface for
 * configuration data access and manipulation. This interface enables pluggable storage backends
 * while maintaining consistent access patterns and performance characteristics across different
 * deployment scenarios.
 *
 * The store abstraction supports multiple storage strategies:
 * - In-memory storage for fast access and simple deployments
 * - Distributed storage (Redis, etc.) for multi-instance applications
 * - Persistent storage for configuration state preservation
 * - Hybrid approaches combining multiple storage mechanisms
 *
 * Key architectural principles:
 * - Asynchronous operations: All methods return promises to support various storage backends
 * - Dot-notation path access: Enables intuitive navigation of nested configuration structures
 * - Atomic operations: Individual operations are isolated and consistent
 * - Change tracking: Supports invalidation and cache management strategies
 * - Type safety: Generic type support for strongly-typed configuration access
 * - Performance optimization: Efficient path-based access and bulk operations
 *
 * The store works in conjunction with ConfigService to provide a complete configuration
 * management solution, handling the persistence concerns while the service manages business
 * logic, source integration, and change notifications. This separation enables flexible
 * deployment architectures and supports various caching and persistence strategies.
 *
 * Storage implementations should ensure thread safety, proper error handling, and efficient
 * memory usage. The interface supports both read-heavy and write-heavy usage patterns
 * through optimized access methods and bulk operations.
 */
export interface ConfigStore {
  /**
   * Retrieves a configuration value using dot-notation path traversal.
   *
   * This method provides efficient access to configuration values at any depth within
   * the configuration hierarchy. It supports nested object navigation, array index
   * access, and automatic type casting through generic type parameters. The method
   * handles path resolution, caching strategies, and returns undefined for non-existent
   * or inaccessible paths.
   *
   * Path resolution supports standard dot-notation syntax for object property access
   * and can handle complex nested structures including arrays and mixed data types.
   * The implementation may employ caching strategies to optimize repeated access to
   * the same configuration paths.
   *
   * @param path - Dot-notation string path to the desired configuration value
   *               (e.g., "database.connection.host" or "servers.0.port")
   * @returns Promise resolving to the configuration value cast to the specified type,
   *          or undefined if the path does not exist or is inaccessible
   */
  get<T = any>(path: string): Promise<T | undefined>

  /**
   * Sets a configuration value at the specified dot-notation path.
   *
   * This method enables dynamic configuration updates by setting values at specific
   * paths within the configuration hierarchy. It automatically creates intermediate
   * objects as needed to establish the complete path structure and handles type
   * conversion and validation as appropriate for the storage backend.
   *
   * The operation is atomic and may trigger cache invalidation or change notification
   * mechanisms depending on the implementation. Path creation follows standard object
   * property semantics, creating nested objects for intermediate path segments that
   * do not exist.
   *
   * @param path - Dot-notation string path where the value should be stored
   *               (e.g., "database.connection.timeout" or "features.newFeature.enabled")
   * @param value - The configuration value to store at the specified path,
   *                supporting any serializable data type
   * @returns Promise that resolves when the value has been successfully stored
   */
  set(path: string, value: any): Promise<void>

  /**
   * Checks whether a configuration path exists and contains a non-undefined value.
   *
   * This method provides efficient existence checking for configuration paths without
   * retrieving the actual value. It supports the same dot-notation path syntax as
   * the get method and can be used for conditional configuration access patterns
   * and validation workflows.
   *
   * The existence check considers a path to exist if it resolves to any value other
   * than undefined, including null, empty strings, zero values, and false boolean
   * values. This semantic aligns with typical configuration usage patterns where
   * these values represent valid configuration states.
   *
   * @param path - Dot-notation string path to check for existence
   *               (e.g., "logging.level" or "cache.redis.enabled")
   * @returns Promise resolving to true if the path exists and has a non-undefined value,
   *          false otherwise
   */
  has(path: string): Promise<boolean>

  /**
   * Removes a configuration value at the specified path from the store.
   *
   * This method enables dynamic configuration cleanup by removing values from
   * specific paths within the configuration hierarchy. The operation handles
   * nested path cleanup and may remove empty parent objects depending on the
   * implementation strategy. Cache invalidation and change notifications are
   * triggered as appropriate.
   *
   * The deletion operation is atomic and maintains configuration structure
   * integrity by properly handling parent-child relationships and ensuring
   * that removal of nested values does not leave orphaned intermediate objects
   * unless they contain other configuration data.
   *
   * @param path - Dot-notation string path of the configuration value to remove
   *               (e.g., "deprecated.feature" or "temporary.settings.debug")
   * @returns Promise resolving to true if the path existed and was successfully removed,
   *          false if the path did not exist
   */
  delete(path: string): Promise<boolean>

  /**
   * Removes all configuration data from the store, resetting it to an empty state.
   *
   * This method provides a complete reset mechanism for the configuration store,
   * removing all stored configuration data and resetting internal state. It
   * triggers appropriate cache invalidation, change notifications, and cleanup
   * procedures to ensure the store returns to a consistent empty state.
   *
   * The clear operation is atomic and irreversible, making it suitable for
   * configuration reloading scenarios, testing environments, and application
   * reset workflows. All cached data, indexes, and derived state are properly
   * cleaned up during this operation.
   *
   * @returns Promise that resolves when all configuration data has been successfully
   *          removed and the store has been reset to its initial empty state
   */
  clear(): Promise<void>

  /**
   * Retrieves all available configuration paths as dot-notation strings.
   *
   * This method provides introspection capabilities by returning a comprehensive
   * list of all configuration paths currently stored in the system. The returned
   * paths use standard dot-notation format and represent all accessible
   * configuration values, enabling dynamic configuration discovery and validation.
   *
   * Path enumeration includes all nested object properties and array indices,
   * providing a complete map of the configuration structure. The implementation
   * may employ caching strategies to optimize repeated calls to this method,
   * especially for large configuration datasets.
   *
   * @returns Promise resolving to an array of dot-notation path strings representing
   *          all available configuration keys in the store
   */
  keys(): Promise<string[]>

  /**
   * Creates a complete, immutable snapshot of all stored configuration data.
   *
   * This method provides a point-in-time view of the entire configuration dataset,
   * returning a deep copy of all stored configuration data in its original nested
   * structure. The snapshot is immutable and independent of the store's internal
   * state, making it suitable for serialization, backup, and comparison operations.
   *
   * The snapshot operation captures the complete configuration hierarchy including
   * all nested objects, arrays, and primitive values. The returned data structure
   * maintains the original organization and type information, enabling full
   * configuration reconstruction if needed.
   *
   * @returns Promise resolving to a complete ConfigData object containing all
   *          stored configuration data in its original nested structure
   */
  snapshot(): Promise<ConfigData>

  /**
   * Marks the stored configuration data as invalid and triggers cleanup procedures.
   *
   * This method provides a mechanism for invalidating cached or stale configuration
   * data, typically used during configuration reloading or when external changes
   * are detected. The invalidation process clears cached data, resets internal
   * state, and prepares the store for fresh configuration loading.
   *
   * Invalidation is a non-destructive operation that maintains the store's
   * operational state while signaling that current data should not be trusted.
   * Subsequent access operations may return undefined or trigger reload procedures
   * depending on the implementation strategy.
   *
   * @returns Promise that resolves when the invalidation process has completed
   *          and the store is ready for fresh configuration data
   */
  invalidate(): Promise<void>
}
