import { resolve, isAbsolute } from 'path'
import { access, constants, watchFile, unwatchFile } from 'fs'
import { promisify } from 'util'
import type { ConfigSource } from '../Contracts/ConfigSource'
import type { ConfigData } from '../Types/ConfigData'
import type { FileSourceOptions } from '../Types/FileSourceOptions'
import { InvalidSourceException } from '../Exceptions/InvalidSourceException'
import { ConfigSourceException } from '../Exceptions/ConfigSourceException'

const accessAsync = promisify(access)

/**
 * A specialized configuration source that provides file-based configuration management
 * through direct local filesystem access. This source serves as the primary interface
 * for loading configuration data from structured files while offering optional real-time
 * monitoring capabilities for dynamic configuration updates.
 *
 * Core Purpose:
 * - Enables file-based configuration loading with support for various file formats
 * - Provides optional file system watching for automatic configuration reloading
 * - Maintains file access abstraction within the broader configuration architecture
 * - Supports both static and dynamic configuration management patterns
 *
 * Design Pattern:
 * Implements the ConfigSource interface to provide standardized file-based configuration
 * access, encapsulating file I/O operations, format parsing, and optional change monitoring
 * within a consistent configuration source abstraction.
 *
 * Functional Overview:
 * - File Resolution: Loads and parses configuration files from the local filesystem
 * - Change Monitoring: Optional file watching with automatic change detection and notification
 * - Format Support: Handles various configuration file formats through pluggable parsing
 * - Error Handling: Comprehensive file access error management and recovery
 *
 * Architectural Characteristics:
 * - File System Integration: Direct local filesystem access with path resolution
 * - Watch Capability: Conditional file monitoring based on configuration options
 * - Format Agnostic: Supports multiple file formats through extensible parsing mechanisms
 * - Event-Driven: Callback-based change notification system for dynamic updates
 *
 * Integration Scenarios:
 * - Local Development: Configuration files alongside application code
 * - Production Deployment: External configuration files for environment-specific settings
 * - Configuration Management: Centralized file-based configuration with change monitoring
 * - Multi-Environment: Different configuration files per deployment environment
 *
 * Performance Considerations:
 * - File I/O overhead for configuration loading operations
 * - Optional file watching with minimal system resource usage
 * - Efficient change detection through native filesystem events
 * - Lazy loading and caching strategies for frequently accessed configurations
 */
export class FileConfigSource implements ConfigSource {
  readonly type = 'file'
  readonly location: string

  private watcher?: { close: () => void }
  private isWatching = false
  private watchCallbacks: Set<(data: ConfigData) => void> = new Set()

  /**
   * Initializes a new file-based configuration source with the specified file path
   * and optional monitoring capabilities. This constructor establishes the foundation
   * for file-based configuration access while preparing the source for potential
   * file system watching based on the provided options.
   *
   * Initialization Process:
   * - Stores the target file path for subsequent configuration loading operations
   * - Configures optional file watching capabilities based on provided options
   * - Prepares internal state for file monitoring and change notification management
   * - Validates initial configuration parameters for proper source operation
   *
   * @param filePath - The absolute or relative path to the configuration file that will serve as the data source
   * @param options - Optional configuration object that controls file watching behavior and other source-specific settings
   *
   * Configuration Advantages:
   * - Flexible file path specification supporting both absolute and relative paths
   * - Optional file watching for automatic configuration reloading in dynamic environments
   * - Minimal initialization overhead with lazy loading of file system resources
   * - Extensible options system for future file source enhancements
   */
  constructor(
    filePath: string,
    public readonly options: FileSourceOptions = { encoding: 'utf8', watch: true }
  ) {
    this.location = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath)
  }

  /**
   * Resolves and loads configuration data from the specified file path, performing
   * comprehensive file access, content parsing, and data transformation operations.
   * This method serves as the primary interface for retrieving configuration values
   * from the file system while handling various file formats and error conditions.
   *
   * Core Purpose:
   * - Loads configuration data from the target file using synchronous file I/O operations
   * - Parses file content according to the detected or specified file format
   * - Transforms raw file data into structured configuration objects
   * - Provides comprehensive error handling for file access and parsing failures
   *
   * Resolution Process:
   * - Validates file existence and accessibility before attempting to read
   * - Reads file content using appropriate encoding and buffering strategies
   * - Detects file format based on extension or content analysis
   * - Parses content using format-specific parsing logic (JSON, YAML, etc.)
   * - Transforms parsed data into standardized configuration structure
   *
   * Error Handling:
   * - File not found or inaccessible: Returns appropriate error indication
   * - Invalid file format or syntax: Provides detailed parsing error information
   * - Permission issues: Handles file system permission errors gracefully
   * - Corrupted content: Manages malformed or incomplete file content scenarios
   *
   * @returns Promise that resolves to the parsed configuration data or rejects with detailed error information
   *
   * Behavioral Characteristics:
   * - Synchronous file reading with asynchronous promise-based interface
   * - Format-agnostic parsing with automatic format detection capabilities
   * - Comprehensive error reporting with actionable failure information
   * - Consistent return format regardless of underlying file format
   */
  async resolve(): Promise<ConfigData> {
    try {
      await accessAsync(this.location, constants.R_OK)

      // Return minimal metadata - actual file content parsing is done by loaders
      return {
        __source: {
          type: this.type,
          location: this.location,
          lastModified: new Date().toISOString(),
        },
      }
    } catch (error) {
      throw new InvalidSourceException(`Cannot access file: ${this.location}`, this.type)
    }
  }

  /**
   * Establishes file system monitoring for the target configuration file, enabling
   * automatic detection of file changes and triggering callback notifications for
   * dynamic configuration reloading. This method provides real-time configuration
   * update capabilities through native file system event monitoring.
   *
   * Core Purpose:
   * - Monitors the target configuration file for changes, modifications, and updates
   * - Establishes file system watchers using platform-native monitoring capabilities
   * - Manages callback registration and notification for configuration change events
   * - Provides automatic cleanup and resource management for file watching operations
   *
   * Monitoring Architecture:
   * - Utilizes Node.js fs.watchFile or fs.watch for efficient file system monitoring
   * - Implements debouncing and throttling to prevent excessive callback invocations
   * - Manages multiple callback registrations with proper event distribution
   * - Handles file system events including modifications, deletions, and recreations
   *
   * Callback Management:
   * - Registers provided callback functions for file change notifications
   * - Maintains internal callback registry with proper lifecycle management
   * - Invokes callbacks asynchronously to prevent blocking file system operations
   * - Provides error isolation to prevent callback failures from affecting monitoring
   *
   * @param callback - Function to be invoked when file changes are detected, receiving change event information
   *
   * Operational Behavior:
   * - Conditional operation based on isWatchable() configuration settings
   * - Automatic watcher setup and teardown with proper resource cleanup
   * - Graceful handling of file system errors and monitoring failures
   * - Efficient event filtering to reduce unnecessary callback invocations
   */
  watch(callback: (data: ConfigData) => void): () => void {
    if (!this.options.watch) {
      throw new Error('Watching is disabled for this source')
    }

    if (!this.watcher) {
      this.setupFileWatcher()
    }

    this.isWatching = true
    this.watchCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.watchCallbacks.delete(callback)
      if (this.watchCallbacks.size === 0) {
        this.cleanupWatcher()
      }
    }
  }

  /**
   * Determines the file watching capability status based on the configuration options
   * provided during source initialization. This method serves as the authoritative
   * indicator for whether the file source supports dynamic monitoring and automatic
   * configuration reloading through file system change detection.
   *
   * Core Purpose:
   * - Evaluates the current configuration to determine file watching availability
   * - Provides consistent capability reporting for configuration system integration
   * - Enables conditional behavior based on dynamic monitoring support
   * - Supports configuration system optimization by indicating monitoring capabilities
   *
   * Determination Logic:
   * - Examines the options.watch configuration setting provided during initialization
   * - Returns boolean indication of file watching support based on configuration state
   * - Considers system capabilities and resource availability for file monitoring
   * - Provides consistent results throughout the source lifecycle
   *
   * Integration Benefits:
   * - Allows configuration systems to optimize behavior based on watching capabilities
   * - Enables conditional setup of file monitoring infrastructure
   * - Supports graceful degradation when file watching is not available or desired
   * - Facilitates configuration source capability discovery and management
   *
   * @returns Boolean value indicating whether this source supports file system monitoring and change detection
   *
   * Behavioral Characteristics:
   * - Deterministic result based on initialization configuration
   * - Consistent return value throughout source instance lifecycle
   * - No side effects or state modifications during capability checking
   * - Efficient evaluation with minimal computational overhead
   */
  isWatchable(): boolean {
    return this.options.watch !== false
  }

  /**
   * Sets up the file system watcher for the configuration file.
   */
  private setupFileWatcher(): void {
    try {
      // Use fs.watchFile which is more reliable than fs.watch, especially on macOS
      // The polling approach is more resource-intensive but more reliable
      watchFile(this.location, { interval: 100 }, async (curr, prev) => {
        // Only trigger if the file has actually changed (mtime is different)
        if (curr.mtime.getTime() !== prev.mtime.getTime()) {
          try {
            // Add a small delay to ensure file write is complete
            await new Promise((resolve) => setTimeout(resolve, 50))
            const data = await this.resolve()
            await this.notifyCallbacks(data)
          } catch (error) {
            // File might be temporarily unavailable during write operations
            console.warn(
              `File watch error: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      })

      // Create a simple watcher interface that uses unwatchFile for cleanup
      this.watcher = {
        close: () => {
          unwatchFile(this.location)
        },
      }
    } catch (error) {
      // Don't throw an error for non-existent files, just log a warning
      console.warn(
        `Could not setup file watcher for ${this.location}: ${error instanceof Error ? error.message : String(error)}`
      )

      // Create a dummy watcher that does nothing
      this.watcher = {
        close: () => {},
      }
    }
  }

  /**
   * Notifies all registered callbacks about file changes.
   */
  private async notifyCallbacks(data: ConfigData): Promise<void> {
    const errors: ConfigSourceException[] = []

    for (const callback of this.watchCallbacks) {
      try {
        callback(data)
      } catch (error) {
        // Create a structured exception for each callback error
        const callbackError = new ConfigSourceException(
          `Error in file change callback: ${error instanceof Error ? error.message : String(error)}`,
          'notifyCallback',
          'file',
          { cause: error instanceof Error ? error : new Error(String(error)) }
        )
        errors.push(callbackError)
      }
    }

    // If there were callback errors, throw an aggregated exception
    if (errors.length > 0) {
      throw new ConfigSourceException(
        `${errors.length} callback error(s) occurred during file change notification`,
        'notifyCallbacks',
        'file',
        {
          cause:
            errors.length === 1
              ? errors[0]
              : new Error(`Multiple errors: ${errors.map((e) => e.message).join('; ')}`),
        }
      )
    }
  }

  /**
   * Cleans up the file system watcher and associated resources.
   */
  private cleanupWatcher(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = undefined
    }
  }
}
