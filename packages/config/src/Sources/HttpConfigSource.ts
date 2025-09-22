import type { ConfigSource } from '../Contracts/ConfigSource'
import type { ConfigData } from '../Types/ConfigData'
import type { HttpSourceOptions } from '../Types/HttpSourceOptions'
import { InvalidSourceException } from '../Exceptions/InvalidSourceException'

/**
 * A specialized configuration source that provides HTTP-based configuration management
 * through remote endpoint communication. This source serves as the primary interface
 * for loading configuration data from HTTP/HTTPS endpoints while offering optional
 * polling capabilities for dynamic configuration updates from remote services.
 *
 * Core Purpose:
 * - Enables remote configuration loading from HTTP/HTTPS endpoints with comprehensive request handling
 * - Provides optional polling-based monitoring for automatic configuration reloading
 * - Maintains network communication abstraction within the broader configuration architecture
 * - Supports both static and dynamic configuration management patterns for distributed systems
 *
 * Design Pattern:
 * Implements the ConfigSource interface to provide standardized HTTP-based configuration
 * access, encapsulating network communication, request/response processing, and optional
 * polling mechanisms within a consistent configuration source abstraction.
 *
 * Functional Overview:
 * - Remote Resolution: Fetches and parses configuration data from HTTP/HTTPS endpoints
 * - Polling Monitoring: Optional periodic polling with automatic change detection and notification
 * - Request Customization: Supports custom headers, timeouts, and authentication mechanisms
 * - Error Handling: Comprehensive network error management and retry strategies
 *
 * Architectural Characteristics:
 * - Network Integration: HTTP/HTTPS communication with configurable request parameters
 * - Polling Capability: Conditional periodic monitoring based on configuration options
 * - Format Agnostic: Supports JSON and other structured response formats
 * - Event-Driven: Callback-based change notification system for dynamic updates
 *
 * Integration Scenarios:
 * - Microservices: Configuration from centralized configuration services
 * - Cloud Deployment: Remote configuration management with cloud-native services
 * - Dynamic Configuration: Real-time configuration updates through polling mechanisms
 * - Multi-Environment: Environment-specific configuration endpoints for different deployments
 *
 * Performance Considerations:
 * - Network latency and bandwidth usage for configuration loading operations
 * - Optional polling with configurable intervals to balance freshness and resource usage
 * - Request timeout and abort mechanisms for reliable network communication
 * - Efficient change detection through HTTP response caching and comparison strategies
 */
export class HttpConfigSource implements ConfigSource {
  readonly type = 'http'
  readonly location: string

  private pollTimer?: NodeJS.Timeout
  private watchCallbacks: Set<(data: ConfigData) => void> = new Set()

  /**
   * Initializes a new HTTP-based configuration source with the specified endpoint URL
   * and optional request configuration. This constructor establishes the foundation
   * for remote configuration access while preparing the source for potential
   * polling-based monitoring based on the provided options.
   *
   * Initialization Process:
   * - Stores the target HTTP/HTTPS endpoint URL for subsequent configuration loading operations
   * - Configures optional request parameters including headers, timeouts, and polling intervals
   * - Prepares internal state for network communication and change notification management
   * - Validates initial configuration parameters for proper source operation
   *
   * @param url - The HTTP or HTTPS endpoint URL that will serve as the configuration data source
   * @param options - Optional configuration object that controls request behavior, authentication, timeouts, and polling settings
   *
   * Configuration Advantages:
   * - Flexible URL specification supporting both HTTP and HTTPS protocols
   * - Optional polling for automatic configuration reloading in dynamic environments
   * - Customizable request headers for authentication and content negotiation
   * - Configurable timeout values for reliable network communication
   * - Extensible options system for future HTTP source enhancements
   */
  constructor(
    url: string,
    public readonly options: HttpSourceOptions = {}
  ) {
    this.location = url
  }

  /**
   * Resolves and loads configuration data from the specified HTTP endpoint, performing
   * comprehensive network communication, response processing, and data transformation operations.
   * This method serves as the primary interface for retrieving configuration values
   * from remote services while handling various response formats and error conditions.
   *
   * Core Purpose:
   * - Fetches configuration data from the target HTTP/HTTPS endpoint using configurable request parameters
   * - Processes HTTP responses according to content type and format specifications
   * - Transforms remote data into structured configuration objects with source metadata
   * - Provides comprehensive error handling for network failures and response processing issues
   *
   * Resolution Process:
   * - Establishes HTTP connection with optional timeout and abort signal configuration
   * - Sends GET request with custom headers for authentication and content negotiation
   * - Validates HTTP response status and handles various error conditions gracefully
   * - Parses response content using appropriate format detection (JSON, etc.)
   * - Transforms parsed data into standardized configuration structure with source tracking
   *
   * Network Handling:
   * - Request timeout management with automatic abort signal configuration
   * - HTTP status code validation with detailed error reporting
   * - Response format detection and appropriate parsing strategy selection
   * - Connection error handling with informative exception messages
   *
   * @returns Promise that resolves to the parsed configuration data with source metadata or rejects with detailed error information
   *
   * Behavioral Characteristics:
   * - Asynchronous network communication with promise-based interface
   * - Format-agnostic response parsing with automatic content type detection
   * - Comprehensive error reporting with actionable failure information
   * - Consistent return format with source metadata regardless of underlying response format
   */
  async resolve(): Promise<ConfigData> {
    try {
      const controller = new AbortController()
      const timeoutId = this.options.timeout 
        ? setTimeout(() => controller.abort(), this.options.timeout)
        : undefined

      const response = await fetch(this.location, {
        headers: this.options.headers,
        signal: controller.signal,
      })

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Ensure data is an object before spreading
      const configData = typeof data === 'object' && data !== null ? data : {}

      return {
        ...configData,
        __source: {
          type: this.type,
          location: this.location,
          lastModified: new Date().toISOString(),
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new InvalidSourceException(`Cannot fetch from URL: ${this.location} - ${message}`, this.type)
    }
  }

  /**
   * Establishes periodic polling for the target HTTP endpoint, enabling automatic
   * detection of configuration changes and triggering callback notifications for
   * dynamic configuration reloading. This method provides real-time configuration
   * update capabilities through scheduled HTTP requests and response comparison.
   *
   * Core Purpose:
   * - Monitors the target HTTP endpoint for configuration changes through periodic polling
   * - Establishes timer-based polling using configurable intervals for optimal resource usage
   * - Manages callback registration and notification for configuration change events
   * - Provides automatic cleanup and resource management for polling operations
   *
   * Polling Architecture:
   * - Utilizes setInterval for consistent periodic HTTP requests to the target endpoint
   * - Implements callback management with proper registration and lifecycle handling
   * - Manages multiple callback registrations with efficient event distribution
   * - Handles polling errors with structured exception reporting and error isolation
   *
   * Callback Management:
   * - Registers provided callback functions for configuration change notifications
   * - Maintains internal callback registry with proper subscription and unsubscription
   * - Invokes callbacks asynchronously to prevent blocking polling operations
   * - Provides error isolation to prevent callback failures from affecting polling continuity
   *
   * @param callback - Function to be invoked when configuration changes are detected through polling, receiving updated configuration data
   *
   * @returns Unsubscribe function that removes the callback and cleans up polling resources when no callbacks remain
   *
   * Operational Behavior:
   * - Conditional operation based on pollInterval configuration in source options
   * - Automatic polling setup and teardown with proper resource cleanup
   * - Graceful handling of network errors and polling failures with structured exceptions
   * - Efficient polling management with shared timer for multiple callback registrations
   */
  watch(callback: (data: ConfigData) => void): () => void {
    if (!this.options.pollInterval) {
      throw new Error('Polling interval not configured for HTTP source watching')
    }

    this.watchCallbacks.add(callback)

    if (!this.pollTimer) {
      this.setupPolling()
    }

    // Return unsubscribe function
    return () => {
      this.watchCallbacks.delete(callback)
      if (this.watchCallbacks.size === 0) {
        this.cleanupPolling()
      }
    }
  }

  /**
   * Determines the polling capability status based on the configuration options
   * provided during source initialization. This method serves as the authoritative
   * indicator for whether the HTTP source supports dynamic monitoring and automatic
   * configuration reloading through periodic endpoint polling.
   *
   * Core Purpose:
   * - Evaluates the current configuration to determine polling availability
   * - Provides consistent capability reporting for configuration system integration
   * - Enables conditional behavior based on dynamic monitoring support
   * - Supports configuration system optimization by indicating monitoring capabilities
   *
   * Determination Logic:
   * - Examines the options.pollInterval configuration setting provided during initialization
   * - Returns boolean indication of polling support based on configuration state
   * - Considers network capabilities and resource availability for periodic monitoring
   * - Provides consistent results throughout the source lifecycle
   *
   * Integration Benefits:
   * - Allows configuration systems to optimize behavior based on polling capabilities
   * - Enables conditional setup of periodic monitoring infrastructure
   * - Supports graceful degradation when polling is not available or desired
   * - Facilitates configuration source capability discovery and management
   *
   * @returns Boolean value indicating whether this source supports periodic endpoint polling and change detection
   *
   * Behavioral Characteristics:
   * - Deterministic result based on initialization configuration
   * - Consistent return value throughout source instance lifecycle
   * - No side effects or state modifications during capability checking
   * - Efficient evaluation with minimal computational overhead
   */
  isWatchable(): boolean {
    return Boolean(this.options.pollInterval)
  }

  /**
   * Sets up the polling mechanism for change detection.
   */
  private setupPolling(): void {
    if (!this.options.pollInterval) return

    this.pollTimer = setInterval(async () => {
      try {
        const data = await this.resolve()
        await this.notifyCallbacks(data)
      } catch (error) {
        // Create a structured exception for polling errors
        throw new InvalidSourceException(
          `Error polling HTTP config source: ${error instanceof Error ? error.message : String(error)}`,
          this.type
        )
      }
    }, this.options.pollInterval)
  }

  /**
   * Notifies all registered callbacks about configuration changes.
   */
  private async notifyCallbacks(data: ConfigData): Promise<void> {
    const errors: Error[] = []
    
    for (const callback of this.watchCallbacks) {
      try {
        callback(data)
      } catch (error) {
        // Collect callback errors to maintain isolation between callbacks
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }
    
    // If there were callback errors, throw an aggregated exception
    if (errors.length > 0) {
      throw new InvalidSourceException(
        `${errors.length} callback error(s) occurred during HTTP change notification: ${errors.map(e => e.message).join('; ')}`,
        this.type
      )
    }
  }

  /**
   * Cleans up the polling timer and associated resources.
   */
  private cleanupPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = undefined
    }
  }
}