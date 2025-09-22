import type { ConfigData } from '../Types/ConfigData'

/**
 * Configuration source abstraction that defines the contract for retrieving raw configuration data.
 * 
 * ConfigSource represents the foundational abstraction layer for all configuration data providers
 * within the configuration system. It implements the Strategy pattern to enable pluggable
 * configuration sources, allowing applications to load configuration from diverse locations
 * and formats through a unified interface.
 * 
 * This interface serves as the bridge between configuration data storage and the configuration
 * service, abstracting the complexities of different data sources while providing consistent
 * access patterns. Sources can range from local file systems and environment variables to
 * remote HTTP endpoints and database connections.
 * 
 * Key design principles:
 * - Location transparency: Sources abstract their physical location and access mechanisms
 * - Asynchronous operations: All data retrieval operations are promise-based for non-blocking access
 * - Change detection: Optional monitoring capabilities for reactive configuration updates
 * - Type safety: Strongly typed interfaces ensure reliable data contracts
 * - Resource management: Clear lifecycle and cleanup patterns for resource-intensive sources
 * 
 * The source system supports both static and dynamic configuration scenarios, enabling
 * applications to adapt to changing configuration requirements without code modifications.
 * Sources are designed to be composable and can be combined through the configuration
 * service to create sophisticated configuration loading strategies.
 */
export interface ConfigSource {
  /**
   * Unique identifier that categorizes the type of configuration source.
   * 
   * This readonly property provides a string identifier that describes the source type,
   * enabling source discovery, logging, and debugging. Common types include "file" for
   * file system sources, "http" for remote HTTP endpoints, "env" for environment variables,
   * and custom identifiers for specialized source implementations.
   * 
   * The type identifier is used by loaders and factories to determine compatibility
   * and select appropriate processing strategies for the source data.
   */
  readonly type: string

  /**
   * Source location identifier that specifies where configuration data is stored.
   * 
   * This readonly property contains the location information specific to the source type.
   * For file sources, this represents the file path; for HTTP sources, the URL endpoint;
   * for environment sources, a descriptor like "env:*". The location format is
   * source-type specific and provides the necessary addressing information for data retrieval.
   * 
   * Location information is used for logging, caching, change detection, and error reporting
   * to provide clear traceability of configuration data origins.
   */
  readonly location: string

  /**
   * Asynchronously retrieves and resolves raw configuration data from the source.
   * 
   * This method performs the actual data retrieval operation, handling source-specific
   * access mechanisms, authentication, parsing, and error conditions. The returned
   * ConfigData object contains the raw configuration information along with metadata
   * about the source and retrieval operation.
   * 
   * The resolution process may involve network requests, file system operations,
   * environment variable access, or other I/O operations depending on the source type.
   * Implementations should handle errors gracefully and provide meaningful error messages
   * for debugging and troubleshooting.
   * 
   * @returns Promise resolving to ConfigData containing the retrieved configuration
   * @throws {Error} When source access fails, data is malformed, or retrieval errors occur
   */
  resolve(): Promise<ConfigData>

  /**
   * Optional method to monitor the configuration source for changes.
   * 
   * This method enables reactive configuration updates by establishing a monitoring
   * mechanism that detects changes in the underlying configuration source. When changes
   * are detected, the provided callback function is invoked with the updated configuration data.
   * 
   * The watching mechanism is source-dependent and may use file system watchers,
   * polling strategies, webhooks, or other change detection methods. Not all sources
   * support change detection, and this method may be undefined for static sources.
   * 
   * @param callback - Function called when configuration changes are detected
   * @returns Cleanup function to stop monitoring and release resources
   * @throws {Error} When watching is not supported or monitoring setup fails
   */
  watch?(callback: (data: ConfigData) => void): () => void

  /**
   * Indicates whether this source supports real-time change detection and monitoring.
   * 
   * This method returns a boolean indicating the source's capability to detect and
   * notify about configuration changes. Sources that return true typically support
   * the watch method and can provide reactive configuration updates.
   * 
   * Change detection capabilities vary by source type: file sources may use filesystem
   * watchers, HTTP sources might support polling or webhooks, while environment variable
   * sources are typically static during process lifetime.
   * 
   * @returns True if the source supports change detection, false otherwise
   */
  isWatchable(): boolean
}
